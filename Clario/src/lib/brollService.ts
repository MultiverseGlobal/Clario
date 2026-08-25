/**
 * brollService.ts
 * 
 * Dynamic B-Roll Video Puller for Clario.
 * Automatically searches and pulls real MP4 video clips via local yt-dlp
 * matching your specific script search keywords.
 */

export interface BrollClip {
  id: string;
  name: string;
  query: string;
  url: string;
  duration: number;
}

/**
 * Searches and downloads real video files using local yt-dlp engine
 */
export async function downloadBrollByQuery(
  searchQuery: string,
  onProgress?: (msg: string) => void
): Promise<File | null> {
  onProgress?.(`Searching web video for: "${searchQuery}"…`);
  try {
    const res = await fetch("/api/download-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `ytsearch1:${searchQuery} vertical shorts` }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const safeName = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      return new File([blob], `broll_${safeName}.mp4`, { type: "video/mp4" });
    }
  } catch (err) {
    console.warn("yt-dlp search query failed:", err);
  }
  return null;
}

/**
 * Analyzes script text, extracts visual search queries, and downloads matching real video clips
 */
export async function autoPullBrollForScript(
  scriptText: string,
  onProgress?: (msg: string, pct: number) => void
): Promise<File[]> {
  const lines = scriptText.split("\n").filter(l => l.trim().length > 0);
  const searchQueries: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("code") || lower.includes("build") || lower.includes("laptop") || lower.includes("screen")) {
      searchQueries.push("aesthetic dark coding terminal setup vertical");
    } else if (lower.includes("walk") || lower.includes("night") || lower.includes("street") || lower.includes("alone")) {
      searchQueries.push("cinematic night walk city street vertical");
    } else if (lower.includes("gym") || lower.includes("training") || lower.includes("weights") || lower.includes("lift")) {
      searchQueries.push("aesthetic gym workout discipline focus vertical");
    } else if (lower.includes("campus") || lower.includes("library") || lower.includes("architecture") || lower.includes("book")) {
      searchQueries.push("minimalist architecture library sunlight vertical");
    } else {
      searchQueries.push("cinematic mood moody lighting aesthetic vertical");
    }
  }

  // De-duplicate queries
  const uniqueQueries = Array.from(new Set(searchQueries)).slice(0, 3);
  if (uniqueQueries.length === 0) {
    uniqueQueries.push("aesthetic dark coding terminal vertical", "cinematic night walk street vertical");
  }

  const downloadedFiles: File[] = [];

  for (let i = 0; i < uniqueQueries.length; i++) {
    const query = uniqueQueries[i];
    onProgress?.(`Downloading web video for "${query}"…`, Math.round(((i + 1) / uniqueQueries.length) * 100));

    const file = await downloadBrollByQuery(query, (msg) => onProgress?.(msg, Math.round(((i + 0.5) / uniqueQueries.length) * 100)));
    if (file) {
      downloadedFiles.push(file);
    }
  }

  return downloadedFiles;
}
