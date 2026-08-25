import type { MemoryNode, MemoryEdge, WorldModel, MemoryNodeType, MemoryRelation } from '@william/types';
import { getMemoryNodes, saveMemoryNode, getMemoryEdges, saveMemoryEdge } from '../memoryAdapter';
import { BrainGateway } from './brainGateway';

// ─── Entity Extraction ────────────────────────────────────────────────────────

/**
 * Uses the LLM to extract named entities and relationships from a piece of text,
 * then upserts them into the knowledge graph.
 */
export async function extractEntitiesFromText(text: string, existingNodes: MemoryNode[]): Promise<void> {
  const hasKeys = !!(
    process.env.GEMINI_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OMNIROUTE_URL
  );

  if (!hasKeys) {
    // Fallback: simple keyword extraction
    await _simpleKeywordExtract(text, existingNodes);
    return;
  }

  const nodeList = existingNodes.map(n => `"${n.label}" (${n.type})`).join(', ');

  const systemPrompt = `You are William's memory system. Extract entities from the user's message and return structured JSON.
Known entities already in memory: ${nodeList || 'none yet'}.

Return ONLY a valid JSON object in this exact shape:
{
  "nodes": [
    { "label": "Atlas", "type": "project", "description": "AI agent orchestration system", "confidence": 0.9 }
  ],
  "edges": [
    { "from": "Atlas", "to": "MGE", "relation": "part_of", "strength": 0.8 }
  ]
}

Types allowed: person | project | belief | routine | goal | event | organization | concept
Relations allowed: works_on | fears | motivated_by | relates_to | knows | blocked_by | aspires_to | part_of | contradicts
Only extract entities clearly present in the text. Return empty arrays if none.`;

  try {
    const response = await BrainGateway.execute({
      systemPrompt,
      userPrompt: text,
      maxTokens: 400,
      temperature: 0.1
    });

    if (response.providerUsed === 'fallback') return;

    // Strip markdown code fences if present
    const cleaned = response.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const now = new Date().toISOString();

    for (const n of (parsed.nodes || [])) {
      const id = _slugify(n.label);
      await saveMemoryNode({
        id,
        type: n.type as MemoryNodeType,
        label: n.label,
        description: n.description || '',
        confidence: n.confidence ?? 0.9,
        lastUpdated: now,
        metadata: {}
      });
    }

    for (const e of (parsed.edges || [])) {
      const fromId = _slugify(e.from);
      const toId = _slugify(e.to);
      await saveMemoryEdge({
        id: `${fromId}_${e.relation}_${toId}`,
        fromId,
        toId,
        relation: e.relation as MemoryRelation,
        strength: e.strength ?? 0.8,
        createdAt: now
      });
    }
  } catch (_) {
    // Silently fall back — entity extraction should never crash the reasoner
    await _simpleKeywordExtract(text, existingNodes);
  }
}

// ─── World Model ─────────────────────────────────────────────────────────────

export async function getWorldModel(): Promise<WorldModel> {
  const [nodes, edges] = await Promise.all([getMemoryNodes(), getMemoryEdges()]);
  return {
    nodes,
    edges,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Builds a concise world-model context string for injection into the reasoner system prompt.
 * Includes the top-confidence nodes and their key relationships.
 */
export async function getContextSummary(recentMessages: string[]): Promise<string> {
  const [nodes, edges] = await Promise.all([getMemoryNodes(), getMemoryEdges()]);

  if (nodes.length === 0) {
    return 'No world model established yet. This is an early conversation.';
  }

  // Sort nodes by confidence descending, take top 12
  const topNodes = nodes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12);

  const nodeLines = topNodes.map(n => {
    // Find edges involving this node
    const related = edges
      .filter(e => e.fromId === n.id || e.toId === n.id)
      .slice(0, 3)
      .map(e => {
        const otherId = e.fromId === n.id ? e.toId : e.fromId;
        const other = nodes.find(x => x.id === otherId);
        return other ? `${e.fromId === n.id ? 'relates to' : 'related from'} "${other.label}" via ${e.relation}` : null;
      })
      .filter(Boolean)
      .join('; ');

    return `- ${n.label} (${n.type}): ${n.description}${related ? `. Connections: ${related}` : ''}`;
  }).join('\n');

  return `[William's World Knowledge — top entities by confidence]\n${nodeLines}`;
}

// ─── Confidence Decay ─────────────────────────────────────────────────────────

/**
 * Decays confidence of nodes not updated in the last N days.
 * Called nightly by the reflection engine.
 */
export async function decayConfidence(decayFactor = 0.02, staleDays = 14): Promise<void> {
  const nodes = await getMemoryNodes();
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  const now = new Date().toISOString();

  for (const node of nodes) {
    const lastUpdated = new Date(node.lastUpdated).getTime();
    if (lastUpdated < cutoff) {
      await saveMemoryNode({
        ...node,
        confidence: Math.max(0.1, node.confidence - decayFactor),
        lastUpdated: now
      });
    }
  }
}

// ─── Graph Search ─────────────────────────────────────────────────────────────

export async function searchNodes(query: string): Promise<MemoryNode[]> {
  const nodes = await getMemoryNodes();
  const q = query.toLowerCase();
  return nodes.filter(n =>
    n.label.toLowerCase().includes(q) ||
    n.description.toLowerCase().includes(q)
  );
}

export async function getRelatedNodes(nodeId: string, depth = 1): Promise<MemoryNode[]> {
  const [nodes, edges] = await Promise.all([getMemoryNodes(), getMemoryEdges()]);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const visited = new Set<string>([nodeId]);
  const result: MemoryNode[] = [];

  let frontier = [nodeId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const connected = edges
        .filter(e => e.fromId === id || e.toId === id)
        .map(e => (e.fromId === id ? e.toId : e.fromId))
        .filter(otherId => !visited.has(otherId));

      for (const otherId of connected) {
        visited.add(otherId);
        next.push(otherId);
        const node = nodeMap.get(otherId);
        if (node) result.push(node);
      }
    }
    frontier = next;
  }

  return result;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function _slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function _simpleKeywordExtract(text: string, existingNodes: MemoryNode[]): Promise<void> {
  // Detect known node labels referenced in text and bump their confidence
  const now = new Date().toISOString();
  for (const node of existingNodes) {
    if (text.toLowerCase().includes(node.label.toLowerCase())) {
      await saveMemoryNode({
        ...node,
        confidence: Math.min(1.0, node.confidence + 0.05),
        lastUpdated: now
      });
    }
  }
}
