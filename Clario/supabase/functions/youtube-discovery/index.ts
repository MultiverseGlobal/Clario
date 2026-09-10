import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Pseudo-logic for discovering YouTube channels.
  // In a real scenario, this would call Firecrawl or yt-dlp to find videos
  // and then submit them to the Clario FastAPI worker for processing.
  console.log("Starting daily YouTube discovery...");

  // Mock list of channel URLs to track
  const channels = [
    "https://www.youtube.com/@AliAbdaal",
    "https://www.youtube.com/@AlexHormozi",
  ];

  const discovered = [];

  for (const channel of channels) {
    console.log(`Scraping channel: ${channel}`);
    // Simulate finding a new video
    const mockVideoId = "dQw4w9WgXcQ";
    discovered.push({
      channel,
      video_url: `https://www.youtube.com/watch?v=${mockVideoId}`,
      title: "New Video Discovered",
      published_at: new Date().toISOString(),
    });
  }

  // Submit to Python worker (FastAPI) running on Render or locally
  const workerBase = Deno.env.get("CLARIO_WORKER_URL") || "http://localhost:8000";
  
  for (const video of discovered) {
    try {
      // In real life, we would have an endpoint like /harvest/ingest-url on the worker
      const res = await fetch(`${workerBase}/harvest/ingest-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.video_url, mode: "video_harvester" })
      });
      console.log(`Submitted ${video.video_url} to worker: ${res.status}`);
    } catch (e) {
      console.warn(`Failed to submit ${video.video_url} to worker:`, e);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    discovered_count: discovered.length,
    videos: discovered
  }), { headers: { "Content-Type": "application/json" } });
});
