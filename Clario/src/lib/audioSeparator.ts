export interface AudioSeparationResult {
  vocalsUrl: string;
  accompanimentUrl: string;
}

export async function separateVoiceAndMusic(
  source: File | string,
  onProgress?: (msg: string) => void
): Promise<AudioSeparationResult> {
  onProgress?.('Uploading audio for source separation...');

  let fileToUpload: File | Blob;
  if (typeof source === 'string') {
    const response = await fetch(source);
    fileToUpload = await response.blob();
  } else {
    fileToUpload = source;
  }

  const formData = new FormData();
  formData.append('file', fileToUpload, 'audio.mp4');

  onProgress?.('Running Spleeter 2-stem source separation...');

  const apiBase = import.meta.env.VITE_AI_ENGINE_BASE || 'https://multiverseglobal--clario-ai-engine-fastapi-app-dev.modal.run';
  const response = await fetch(`${apiBase}/split-audio`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Audio separation failed on the AI Engine');
  }

  const data = await response.json();

  return {
    vocalsUrl: data.vocals,
    accompanimentUrl: data.accompaniment,
  };
}
