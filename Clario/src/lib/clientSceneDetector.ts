// Server-Side Cinematic Video Scene Detection Wrapper
// Replaces the heavy client-side canvas frame extraction with a job polling mechanism.

export interface DetectedScene {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  frameUrl: string;
  sceneTag: string;
  contentType: 'a_roll' | 'b_roll' | 'ui_screen';
  hasCaptions: boolean;
  suggestedStripMode: 'punch_in' | 'blur_mask' | 'none';
  confidence: number;
  transcriptText?: string;
  words?: Array<{ word: string; start: number; end: number }>;
  speechAligned?: boolean;
}

export interface SceneDetectionProgress {
  progressPct: number;
  statusMsg: string;
}

/**
 * Uploads video to the server, starts the harvest job, and polls for completion.
 */
export async function detectCinematicScenes(
  source: File | Blob,
  onProgress?: (p: SceneDetectionProgress) => void
): Promise<{ scenes: DetectedScene[], projectId: string }> {
  
  onProgress?.({ progressPct: 5, statusMsg: 'Uploading video to server...' });
  
  const formData = new FormData();
  formData.append('file', source);
  formData.append('mode', 'video_harvester');

  const ingestRes = await fetch('/api/v1/harvest/ingest-file', {
    method: 'POST',
    body: formData
  });

  if (!ingestRes.ok) {
    throw new Error('Failed to start server-side scene detection job.');
  }

  const { job_id, project_id } = await ingestRes.json();
  
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const jobRes = await fetch(`/api/v1/harvest/jobs/${job_id}`);
        if (!jobRes.ok) throw new Error('Job polling failed');
        
        const job = await jobRes.json();
        
        onProgress?.({ 
          progressPct: job.progress_pct || 10, 
          statusMsg: job.status_msg || 'Processing on server...' 
        });

        if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'expired') {
          clearInterval(pollInterval);
          reject(new Error(`Server job failed: ${job.status_msg}`));
        } else if (job.status === 'completed') {
          clearInterval(pollInterval);
          onProgress?.({ progressPct: 95, statusMsg: 'Fetching detected scenes...' });
          
          // Fetch the project manifest to get the shots
          const projectRes = await fetch(`/api/v1/projects/${project_id}/manifest`);
          if (!projectRes.ok) {
            reject(new Error('Failed to fetch project manifest after job completion.'));
            return;
          }
          
          const project = await projectRes.json();
          
          if (!project.shots || project.shots.length === 0) {
            reject(new Error('No scenes could be extracted from this video.'));
            return;
          }
          
          // Map backend ShotRecords to DetectedScene
          const scenes: DetectedScene[] = project.shots.map((shot: any, index: number) => ({
            id: shot.shot_id,
            index: index + 1,
            startTime: shot.start_seconds,
            endTime: shot.end_seconds,
            duration: shot.duration,
            frameUrl: shot.frame_url,
            sceneTag: shot.visual_description || 'Cinematic B-Roll',
            contentType: shot.content_type || 'b_roll',
            hasCaptions: shot.detected_text_presence || false,
            suggestedStripMode: shot.detected_text_presence ? 'blur_mask' : 'none',
            confidence: 0.95,
            transcriptText: shot.source_text || '',
            speechAligned: true
          }));
          
          onProgress?.({ progressPct: 100, statusMsg: `Extracted ${scenes.length} frame-perfect scenes!` });
          resolve({ scenes, projectId: project_id });
        }
      } catch (err) {
        clearInterval(pollInterval);
        reject(err);
      }
    }, 1500); // Poll every 1.5s
  });
}
