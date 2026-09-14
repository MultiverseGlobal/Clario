export async function stripCaptions(
  source: File | string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Uploading video for AI caption inpainting...');

  let fileToUpload: File | Blob;
  if (typeof source === 'string') {
    const response = await fetch(source);
    fileToUpload = await response.blob();
  } else {
    fileToUpload = source;
  }

  const formData = new FormData();
  formData.append('file', fileToUpload, 'video.mp4');

  onProgress?.('Running OCR and AI Video Inpainting (this may take a while)...');

  const response = await fetch('http://localhost:8000/inpaint-video', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Video inpainting failed on the AI Engine');
  }

  const data = await response.json();
  return data.cleaned_video;
}
