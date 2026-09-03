import { supabase } from './supabase';
import type { HarvestProject } from '../types/assets';

let memoryApiBase: string | null = null;

export function getApiBase(): string {
  const envBase = (import.meta as any).env?.VITE_API_BASE;
  const base = memoryApiBase || envBase || 'http://localhost:8000';
  return base.replace(/\/+$/, '') + (base.endsWith('/api/v1') ? '' : '/api/v1');
}

export async function fetchApiBaseFromDb(): Promise<void> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (userAuth.user) {
      const { data } = await supabase
        .from('clario_user_settings')
        .select('api_base_url')
        .eq('user_id', userAuth.user.id)
        .maybeSingle();
      if (data?.api_base_url) {
        memoryApiBase = data.api_base_url;
        return;
      }
    }
  } catch (err) {
    console.error("Failed to fetch api base from DB:", err);
  }
  
  // Fallback migration from local storage
  try {
    const custom = typeof window !== 'undefined' ? localStorage.getItem('clario_api_base') : null;
    if (custom) {
      memoryApiBase = custom;
      await setApiBase(custom); // migrate
      localStorage.removeItem('clario_api_base');
    }
  } catch {}
}

export async function setApiBase(url: string) {
  memoryApiBase = url.trim();
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (userAuth.user) {
      await supabase
        .from('clario_user_settings')
        .upsert({ user_id: userAuth.user.id, api_base_url: memoryApiBase as any }, { onConflict: 'user_id' });
    }
  } catch (err) {
    console.error("Failed to save api base to DB:", err);
  }
}

export interface ServerJobStatus {
  job_id: string;
  project_id: string;
  type: 'video_analysis' | 'slide_analysis' | 'zip_export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_pct: number;
  status_msg: string;
  error?: string;
  result?: HarvestProject;
}

/**
 * Check if the Clario FastAPI heavy media worker is running.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Upload a media file to the FastAPI media worker for heavy server-side processing.
 */
export async function uploadToWorker(
  file: File,
  mode: 'video_harvester' | 'slide_harvester' = 'video_harvester'
): Promise<{ job_id: string; project_id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const res = await fetch(`${getApiBase()}/harvest/ingest-file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Worker ingest failed: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Poll job status until completed or failed.
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: (msg: string, pct: number) => void
): Promise<HarvestProject> {
  while (true) {
    const res = await fetch(`${getApiBase()}/harvest/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Job status error: ${res.statusText}`);

    const data: ServerJobStatus = await res.json();
    onProgress?.(data.status_msg, data.progress_pct);

    if (data.status === 'completed' && data.result) {
      const backendRoot = getApiBase().replace('/api/v1', '');
      const proj = data.result;

      if (proj.reference_url && proj.reference_url.startsWith('/media/')) {
        proj.reference_url = `${backendRoot}${proj.reference_url}`;
      }

      if (proj.shots) {
        proj.shots = proj.shots.map(s => ({
          ...s,
          frame_url: s.frame_url?.startsWith('/media/') ? `${backendRoot}${s.frame_url}` : s.frame_url
        }));
      }

      if (proj.slides) {
        proj.slides = proj.slides.map(sl => ({
          ...sl,
          image_url: sl.image_url?.startsWith('/media/') ? `${backendRoot}${sl.image_url}` : sl.image_url
        }));
      }

      return proj;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Server media processing job failed');
    }

    await new Promise(r => setTimeout(r, 1200));
  }
}

/**
 * Request the backend to cut a video segment.
 */
export async function cutSegmentOnServer(
  projectId: string,
  shotId: string,
  startSeconds: number,
  endSeconds: number
): Promise<{ status: string; url: string; filename: string }> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/segments/cut`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shot_id: shotId,
      start_seconds: startSeconds,
      end_seconds: endSeconds
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to cut segment on server');
  }

  const data = await res.json();
  const backendRoot = getApiBase().replace('/api/v1', '');
  return {
    ...data,
    url: `${backendRoot}${data.url}`
  };
}
