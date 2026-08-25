// ─── Normalized URL Connector & Media Stream Retrieval ───────────────────────

export type UrlFetchErrorCode =
  | 'INVALID_URL'
  | 'TIMEOUT'
  | 'ABORTED_BY_USER'
  | 'CORS_BLOCKED'
  | 'AUTH_REQUIRED'
  | 'RATE_LIMITED'
  | 'REMOTE_NOT_FOUND'
  | 'UNSUPPORTED_PLATFORM'
  | 'UPSTREAM_ERROR'
  | 'UNKNOWN';

export type UrlFetchState =
  | { status: 'idle' }
  | { status: 'validating'; message: string }
  | { status: 'fetching'; requestId: string; secondsRemaining: number }
  | { status: 'success'; mediaId: string; file: File }
  | { status: 'needs_upload'; code: UrlFetchErrorCode; message: string }
  | { status: 'failed'; code: UrlFetchErrorCode; message: string; retryable: boolean };

export const URL_FETCH_TIMEOUT_MS = 12_000;

export function cleanSocialUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    ['utm_source', 'utm_medium', 'utm_campaign', 'igsh', 'fbclid', 'si'].forEach(p =>
      u.searchParams.delete(p)
    );
    return u.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'x';
  if (lower.includes('reddit.com')) return 'reddit';
  return null;
}

export function validateSupportedUrl(url: string): { valid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: 'Please enter a video URL' };
  }
  try {
    const parsed = new URL(url.trim());
    if (!parsed.protocol.startsWith('http')) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  const platform = detectPlatform(url);
  if (!platform && !url.match(/\.(mp4|mov|webm)$/i)) {
    return {
      valid: false,
      error: 'Please enter a supported Instagram Reel, TikTok, YouTube Shorts/Video, or X link.',
    };
  }
  return { valid: true };
}

export function normalizeUrlFetchError(err: any, signal?: AbortSignal): UrlFetchErrorCode {
  if (signal?.aborted) {
    if (signal.reason === 'ABORTED_BY_USER' || signal.reason === 'user') return 'ABORTED_BY_USER';
    return 'TIMEOUT';
  }
  const msg = (err?.message || String(err || '')).toLowerCase();
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('timed out')) return 'TIMEOUT';
  if (msg.includes('login') || msg.includes('auth') || msg.includes('session') || msg.includes('private')) return 'AUTH_REQUIRED';
  if (msg.includes('cors') || msg.includes('failed to fetch') || msg.includes('networkerror')) return 'CORS_BLOCKED';
  if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) return 'RATE_LIMITED';
  if (msg.includes('not found') || msg.includes('404') || msg.includes('deleted')) return 'REMOTE_NOT_FOUND';
  if (msg.includes('unsupported')) return 'UNSUPPORTED_PLATFORM';
  return 'UPSTREAM_ERROR';
}

export function isRetryable(code: UrlFetchErrorCode): boolean {
  switch (code) {
    case 'TIMEOUT':
    case 'RATE_LIMITED':
    case 'UPSTREAM_ERROR':
    case 'UNKNOWN':
      return true;
    case 'INVALID_URL':
    case 'AUTH_REQUIRED':
    case 'REMOTE_NOT_FOUND':
    case 'UNSUPPORTED_PLATFORM':
    case 'ABORTED_BY_USER':
    default:
      return false;
  }
}

export function getSafeUserMessage(code: UrlFetchErrorCode): string {
  switch (code) {
    case 'TIMEOUT':
      return 'The social media URL did not respond within 12 seconds. Instagram / TikTok frequently require active user sessions or expire media links.';
    case 'AUTH_REQUIRED':
      return 'This platform requires a logged-in account or blocks public automated downloads.';
    case 'CORS_BLOCKED':
      return 'The media host blocked direct browser access.';
    case 'RATE_LIMITED':
      return 'Rate limit reached on remote stream. Please wait a moment or upload your file directly.';
    case 'REMOTE_NOT_FOUND':
      return 'The requested video was not found or has been removed.';
    case 'UNSUPPORTED_PLATFORM':
      return 'This platform link is not currently supported.';
    case 'UPSTREAM_ERROR':
    default:
      return 'Unable to fetch clean media stream from this reference URL.';
  }
}

/**
 * Downloads full video via local endpoint or Cobalt with AbortSignal support
 */
export async function fetchReferenceMedia(
  rawUrl: string,
  signal?: AbortSignal
): Promise<File> {
  const url = cleanSocialUrl(rawUrl);

  // 1. Try local server-side downloader (with AbortSignal)
  try {
    const localRes = await fetch('/api/download-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    });

    if (localRes.ok) {
      const blob = await localRes.blob();
      const platform = detectPlatform(url) || 'video';
      const filename = `${platform}_${Date.now()}.mp4`;
      return new File([blob], filename, { type: 'video/mp4' });
    }
  } catch (localErr: any) {
    if (signal?.aborted) throw localErr;
    console.warn('Local endpoint fallback:', localErr);
  }

  // 2. Fallback to Cobalt API proxy with signal
  const res = await fetch('/cobalt-api/', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      downloadMode: 'auto',
      filenameStyle: 'basic',
      videoQuality: '720',
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error('Platform media extraction failed or link expired.');
  }

  const data = await res.json();
  if (data.url) {
    return downloadCobaltUrl(data.url, `reference_${Date.now()}.mp4`, signal);
  } else if (data.text) {
    throw new Error(data.text);
  }

  throw new Error('No media stream available from URL.');
}

export async function downloadCobaltUrl(
  streamUrl: string,
  filename: string,
  signal?: AbortSignal
): Promise<File> {
  const res = await fetch(streamUrl, { signal });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  return new File([blob], filename, { type: 'video/mp4' });
}
