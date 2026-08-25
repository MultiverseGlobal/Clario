import type { ActionRequest, ActionLog, Journey } from '@william/types';
import { saveActionLog, updateActionStatus, saveProactiveSignal, getJourneys, saveJourney } from '../memoryAdapter';

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function dispatchAction(req: ActionRequest): Promise<ActionLog> {
  const id = `action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const log: ActionLog = {
    id,
    actionType: req.type,
    payload: req.payload,
    status: 'pending',
    createdAt: now
  };

  // Persist immediately as pending
  await saveActionLog(log);

  try {
    switch (req.type) {
      case 'create_task':
        await _createTask(id, req);
        break;
      case 'notion_update':
        await _updateNotion(id, req);
        break;
      case 'schedule_reminder':
        await _scheduleReminder(id, req);
        break;
      case 'atlas_coordinate':
        await _coordinateAtlas(id, req);
        break;
      case 'organize_project':
        await _organizeProject(id, req);
        break;
      case 'send_briefing':
        await _sendBriefing(id, req);
        break;
      default:
        throw new Error(`Unknown action type: ${req.type}`);
    }

    await updateActionStatus(id, 'executed');
    return { ...log, status: 'executed', executedAt: new Date().toISOString() };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`ActionDispatcher: ${req.type} failed:`, errMsg);
    await updateActionStatus(id, 'failed', errMsg);
    return { ...log, status: 'failed', error: errMsg };
  }
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function _createTask(_actionId: string, req: ActionRequest): Promise<void> {
  // Stored locally in action_log; future integration: POST to Atlas task system
  const { title, priority, dueDate, notes } = req.payload;
  console.log(`[Action] Create task: "${title}" (${priority || 'medium'}) ${dueDate ? `due ${dueDate}` : ''}`);

  // If Atlas API is configured, forward the task there
  if (process.env.ATLAS_API_URL) {
    const res = await fetch(`${process.env.ATLAS_API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: priority || 'medium', due_date: dueDate, notes })
    });
    if (!res.ok) throw new Error(`Atlas task creation failed: ${res.status}`);
  }
}

async function _updateNotion(_actionId: string, req: ActionRequest): Promise<void> {
  const notionKey = process.env.NOTION_API_KEY;
  if (!notionKey) {
    console.log('[Action] Notion update skipped — NOTION_API_KEY not set. Logged locally.');
    return;
  }

  const { pageId, content, databaseId } = req.payload;

  if (pageId) {
    // Append a block to an existing page
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        children: [{
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: content || req.title } }]
          }
        }]
      })
    });
    if (!res.ok) throw new Error(`Notion page update failed: ${res.status}`);
  } else if (databaseId || process.env.NOTION_DATABASE_ID) {
    // Create a new page in a database
    const dbId = databaseId || process.env.NOTION_DATABASE_ID;
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          Name: { title: [{ text: { content: req.title } }] }
        },
        children: content ? [{
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content } }]
          }
        }] : []
      })
    });
    if (!res.ok) throw new Error(`Notion page creation failed: ${res.status}`);
  } else {
    console.log('[Action] Notion update logged locally — no pageId or database configured.');
  }
}

async function _scheduleReminder(_actionId: string, req: ActionRequest): Promise<void> {
  const { message, triggerTime, type } = req.payload;
  const now = new Date().toISOString();

  // Store as a proactive signal — will be served by /api/presence when the time arrives
  await saveProactiveSignal({
    id: `reminder_${Date.now()}`,
    type: type || 'goal_reminder',
    triggerTime: triggerTime || now,
    message: message || req.title,
    acknowledged: false,
    createdAt: now
  });

  console.log(`[Action] Reminder scheduled: "${message}" at ${triggerTime}`);
}

async function _coordinateAtlas(_actionId: string, req: ActionRequest): Promise<void> {
  if (!process.env.ATLAS_API_URL) {
    console.log('[Action] Atlas coordination logged locally — ATLAS_API_URL not set.');
    return;
  }

  const { instruction, context } = req.payload;
  const res = await fetch(`${process.env.ATLAS_API_URL}/api/coordinate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction, context, source: 'william' })
  });
  if (!res.ok) throw new Error(`Atlas coordination failed: ${res.status}`);
  console.log(`[Action] Atlas coordinated: "${instruction}"`);
}

async function _organizeProject(_actionId: string, req: ActionRequest): Promise<void> {
  const { projectName, action: projectAction, notes } = req.payload;
  console.log(`[Action] Organize project: "${projectName}" → ${projectAction}. Notes: ${notes || 'none'}`);

  const journeys = await getJourneys();
  const matched = journeys.find(j => j.title.toLowerCase().includes(projectName.toLowerCase()));

  if (matched) {
    matched.timeline = [
      { date: new Date().toLocaleDateString(), text: `Action [${projectAction}]: ${notes || 'Updated project status.'}` },
      ...matched.timeline
    ];
    await saveJourney(matched);
    console.log(`[ActionDispatcher] Successfully updated journey for project "${projectName}"`);
  } else {
    const newJ: Journey = {
      id: `j_${Date.now()}`,
      category: 'mental',
      icon: '🧠',
      title: projectName,
      currentState: `Action [${projectAction}]: ${notes || 'No description provided.'}`,
      vision: 'Manage and coordinate through William companion actions.',
      progress: 0,
      milestones: [],
      memories: [],
      lessons: [],
      timeline: [{ date: new Date().toLocaleDateString(), text: `Project initialized via action dispatch.` }]
    };
    await saveJourney(newJ);
    console.log(`[ActionDispatcher] Created new journey for project "${projectName}"`);
  }
}

async function _sendBriefing(_actionId: string, req: ActionRequest): Promise<void> {
  // Store as a proactive signal delivered on next presence check
  const { briefingContent, type } = req.payload;
  await saveProactiveSignal({
    id: `briefing_${Date.now()}`,
    type: type || 'daily_checkin',
    triggerTime: new Date().toISOString(),
    message: briefingContent || req.title,
    acknowledged: false,
    createdAt: new Date().toISOString()
  });
}
