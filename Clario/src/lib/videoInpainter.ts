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

  const response = await fetch(`/api/v1/harvest/inpaint-video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to start inpainting job');
  }

  const { job_id } = await response.json();

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const jobRes = await fetch(`/api/v1/harvest/jobs/${job_id}`);
        if (!jobRes.ok) throw new Error('Job polling failed');
        
        const job = await jobRes.json();
        
        onProgress?.(job.status_msg || 'Inpainting in progress...');

        if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'expired') {
          clearInterval(pollInterval);
          reject(new Error(`Inpainting job failed: ${job.status_msg}`));
        } else if (job.status === 'completed') {
          clearInterval(pollInterval);
          if (job.result && job.result.cleaned_video) {
            resolve(job.result.cleaned_video);
          } else {
            reject(new Error('Inpainting job completed but no video URL was returned.'));
          }
        }
      } catch (err) {
        clearInterval(pollInterval);
        reject(err);
      }
    }, 2000);
  });
}
