import { supabase } from './supabase';
import type { HarvestProject } from '../types/assets';

let memoryApiBase: string | null = null;
const RENDER_PROD_URL = 'https://clario-l5d0.onrender.com';

export function getApiBase(): string {
  if (memoryApiBase) {
    const clean = memoryApiBase.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  const base = RENDER_PROD_URL;
  return `${base}/api/v1`;
}

export async function fetchApiBaseFromDb(): Promise<void> {
  try {
    const custom = typeof window !== 'undefined' ? localStorage.getItem('clario_api_base') : null;
    if (custom) {
      memoryApiBase = custom;
    }
  } catch (err) {
    console.error("Failed to fetch api base from local storage:", err);
  }
}

export async function setApiBase(url: string) {
  memoryApiBase = url.trim();
  try {
    if (typeof window !== 'undefined') {
      if (memoryApiBase) {
        localStorage.setItem('clario_api_base', memoryApiBase);
      } else {
        localStorage.removeItem('clario_api_base');
      }
    }
  } catch (err) {
    console.error("Failed to save api base to local storage:", err);
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
 * Check if the Clario FastAPI backend is online.
 * Tests local port 8000 first if configured, then falls back to deployed Render worker.
 */
export async function checkServerHealth(): Promise<boolean> {
  // 1. If user is in dev mode and local server might be up, try localhost:8000
  if (import.meta.env.DEV && !memoryApiBase) {
    try {
      const localRes = await fetch('http://localhost:8000/api/v1/health', { signal: AbortSignal.timeout(1000) });
      if (localRes.ok) {
        memoryApiBase = 'http://localhost:8000';
        return true;
      }
    } catch {}
  }

  // 2. Try current configured API base (Render cloud by default)
  try {
    const currentBase = getApiBase();
    const res = await fetch(`${currentBase}/api/v1/health`, { signal: AbortSignal.timeout(12000) });
    if (res.ok) return true;
  } catch {}

  // 3. Fallback check to production Render backend
  try {
    const prodRes = await fetch(`${RENDER_PROD_URL}/api/v1/health`, { signal: AbortSignal.timeout(12000) });
    if (prodRes.ok) {
      memoryApiBase = RENDER_PROD_URL;
      return true;
    }
  } catch {}

  return false;
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

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}/harvest/ingest-file`, {
    method: 'POST',
    headers,
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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  while (true) {
    const res = await fetch(`${getApiBase()}/harvest/jobs/${jobId}`, { headers });
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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}/projects/${projectId}/segments/cut`, {
    method: 'POST',
    headers,
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
