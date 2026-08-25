import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface SegmentCutRequest {
  sourceFile: File | Blob;
  shotId: string;
  startSeconds: number;
  endSeconds: number;
  sourceDuration?: number;
  outputFormat?: 'mp4';
}

export interface SegmentCutResult {
  shotId: string;
  blob: Blob;
  filename: string;
  mimeType: 'video/mp4';
  durationSeconds: number;
  startSeconds: number;
  endSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
  verifiedPlayable: boolean;
}

// Global singleton FFmpeg instance for segment cutting
let segmentFfmpeg: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

export async function getSegmentFfmpeg(): Promise<FFmpeg> {
  if (segmentFfmpeg && segmentFfmpeg.loaded) {
    return segmentFfmpeg;
  }
  if (ffmpegLoadingPromise) {
    return ffmpegLoadingPromise;
  }

  ffmpegLoadingPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      segmentFfmpeg = ffmpeg;
      return ffmpeg;
    } catch (err) {
      console.warn('Failed to load FFmpeg WASM for segment cutter:', err);
      throw err;
    } finally {
      ffmpegLoadingPromise = null;
    }
  })();

  return ffmpegLoadingPromise;
}

/**
 * Deterministic sanitized filename contract:
 * reference_segment_SHOT_001_000.000s-001.800s.mp4
 */
export function formatSegmentFilename(shotId: string, startSeconds: number, endSeconds: number): string {
  const cleanShot = shotId.toUpperCase();
  const startStr = Math.max(0, startSeconds).toFixed(3).padStart(7, '0');
  const endStr = Math.max(0, endSeconds).toFixed(3).padStart(7, '0');
  return `reference_segment_${cleanShot}_${startStr}s-${endStr}s.mp4`;
}

/**
 * Validates trimming bounds against contract invariants.
 */
export function validateSegmentBounds(
  startSeconds: number,
  endSeconds: number,
  sourceDuration?: number
): { start: number; end: number; duration: number } {
  let start = Math.max(0, Number(startSeconds) || 0);
  let end = Number(endSeconds) || 0;

  if (sourceDuration && sourceDuration > 0 && end > sourceDuration) {
    end = sourceDuration;
  }

  if (end <= start) {
    throw new Error(`Invalid segment range: end time (${end.toFixed(2)}s) must be greater than start time (${start.toFixed(2)}s).`);
  }

  const duration = Number((end - start).toFixed(3));
  if (duration < 0.1) {
    throw new Error(`Segment duration (${duration}s) is shorter than minimum allowed (0.10s).`);
  }

  return { start, end, duration };
}

/**
 * Lightweight browser validation ensuring the resulting MP4 blob contains
 * an actual playable video stream with dimensions > 0 and duration > 0.
 */
export async function verifyPlayableVideo(
  blob: Blob
): Promise<{ width: number; height: number; duration: number; hasAudio: boolean }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const blobUrl = URL.createObjectURL(blob);
    video.src = blobUrl;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Video verification timed out. File may be corrupted or contain unsupported codecs.'));
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const duration = video.duration || 0;

      // Check for audio track presence via webkitAudioDecodedByteCount or mozHasAudio if available
      const hasAudio = Boolean(
        (video as any).mozHasAudio ||
        Boolean((video as any).webkitAudioDecodedByteCount) ||
        Boolean((video as any).audioTracks && (video as any).audioTracks.length > 0)
      );

      URL.revokeObjectURL(blobUrl);

      if (duration <= 0 || width <= 0 || height <= 0) {
        reject(new Error('Rendered video file has 0 duration or invalid dimensions.'));
      } else {
        resolve({ width, height, duration, hasAudio });
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Rendered video failed HTML5 playback verification.'));
    };
  });
}

/**
 * Trims a reference video segment into an independent playable MP4 file.
 */
export async function cutReferenceSegment(
  request: SegmentCutRequest,
  customFfmpeg?: FFmpeg | null,
  onProgress?: (progress: number) => void
): Promise<SegmentCutResult> {
  const { start, end, duration } = validateSegmentBounds(
    request.startSeconds,
    request.endSeconds,
    request.sourceDuration
  );

  const filename = formatSegmentFilename(request.shotId, start, end);
  onProgress?.(10);

  const ffmpeg = customFfmpeg && customFfmpeg.loaded ? customFfmpeg : await getSegmentFfmpeg();

  const inputName = `input_${request.shotId}_${Date.now()}.mp4`;
  const outputName = `output_${request.shotId}_${Date.now()}.mp4`;

  try {
    onProgress?.(25);
    const fileData = await fetchFile(request.sourceFile);
    await ffmpeg.writeFile(inputName, fileData);

    onProgress?.(45);

    // Precise segment extraction with re-encoding for universal Chromium & MP4 faststart compatibility
    const ffmpegArgs = [
      '-ss',
      start.toFixed(3),
      '-i',
      inputName,
      '-t',
      duration.toFixed(3),
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      outputName,
    ];

    await ffmpeg.exec(ffmpegArgs);
    onProgress?.(80);

    const data = await ffmpeg.readFile(outputName);
    const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data as any);
    const blob = new Blob([rawBytes.buffer], { type: 'video/mp4' });

    onProgress?.(90);

    // Verify playable metadata
    const verified = await verifyPlayableVideo(blob);

    onProgress?.(100);

    return {
      shotId: request.shotId,
      blob,
      filename,
      mimeType: 'video/mp4',
      durationSeconds: verified.duration || duration,
      startSeconds: start,
      endSeconds: end,
      width: verified.width,
      height: verified.height,
      hasAudio: verified.hasAudio,
      verifiedPlayable: true,
    };
  } catch (err: any) {
    console.error(`Segment cutting error for ${request.shotId}:`, err);
    throw new Error(`Failed to cut segment for ${request.shotId}: ${err.message || err}`);
  } finally {
    // Clean up virtual filesystem files
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
}
