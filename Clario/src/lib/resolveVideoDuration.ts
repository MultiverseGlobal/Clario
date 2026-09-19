/**
 * Resolves the real duration of a video file or URL by loading it into
 * a hidden HTMLVideoElement and awaiting the `loadedmetadata` event.
 *
 * Falls back to `undefined` if the video cannot be loaded within the timeout.
 */
export async function resolveVideoDuration(
  source: File | Blob | string,
  timeoutMs = 8000
): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.muted = true;

    let objectUrl: string | undefined;

    const cleanup = () => {
      el.src = '';
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(undefined);
    }, timeoutMs);

    el.onloadedmetadata = () => {
      clearTimeout(timer);
      const dur = el.duration;
      cleanup();
      resolve(isFinite(dur) && dur > 0 ? dur : undefined);
    };

    el.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(undefined);
    };

    if (typeof source === 'string') {
      el.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      el.src = objectUrl;
    }
  });
}
