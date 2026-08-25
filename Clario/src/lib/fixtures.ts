import type { HarvestProject, ShotRecord } from '../types/assets';

/**
 * Creates a synthetic high-resolution reference keyframe still via Canvas
 */
function createKeyframeCanvas(
  shotTitle: string,
  subtitle: string,
  timecode: string,
  bgGradStart: string,
  bgGradEnd: string,
  iconShape: 'circle' | 'rocket' | 'chart' | 'stage' | 'trophy'
): string {
  if (typeof document === 'undefined') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="100%" height="100%" fill="${bgGradStart}"/><text x="50%" y="50%" fill="%23FFFFFF" font-family="sans-serif" font-size="32" text-anchor="middle">${shotTitle}</text></svg>`;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280; // 9:16 vertical
  const ctx = canvas.getContext('2d')!;

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 720, 1280);
  grad.addColorStop(0, bgGradStart);
  grad.addColorStop(1, bgGradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 1280);

  // Cinematic Vignette
  const vignette = ctx.createRadialGradient(360, 640, 200, 360, 640, 640);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 720, 1280);

  // Decorative grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 80; x < 720; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1280);
    ctx.stroke();
  }
  for (let y = 80; y < 1280; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(720, y);
    ctx.stroke();
  }

  // Central Visual Emblem
  ctx.save();
  ctx.translate(360, 520);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Emblem detail based on shape
  ctx.fillStyle = '#FFFFFF';
  if (iconShape === 'stage') {
    // Spotlight / Stage figure
    ctx.beginPath();
    ctx.arc(0, -30, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-40, 6, 80, 70, 12);
    ctx.fill();
  } else if (iconShape === 'rocket') {
    // Rocket icon
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(35, 10);
    ctx.lineTo(20, 50);
    ctx.lineTo(-20, 50);
    ctx.lineTo(-35, 10);
    ctx.closePath();
    ctx.fill();
  } else if (iconShape === 'trophy') {
    // Trophy
    ctx.beginPath();
    ctx.arc(0, -20, 40, 0, Math.PI);
    ctx.lineTo(0, 50);
    ctx.lineTo(25, 50);
    ctx.lineTo(-25, 50);
    ctx.stroke();
  } else {
    // Data / UI dashboard
    ctx.fillRect(-50, -40, 100, 20);
    ctx.fillRect(-50, -10, 70, 16);
    ctx.fillRect(-50, 16, 90, 16);
  }
  ctx.restore();

  // Timecode Chip Top-Left
  ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
  ctx.beginPath();
  ctx.roundRect(40, 48, 220, 44, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 108, 242, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#4E6CF2';
  ctx.font = 'bold 16px "Space Mono", monospace';
  ctx.fillText(`TIMECODE: ${timecode}`, 56, 76);

  // Bottom Overlay Card
  ctx.fillStyle = 'rgba(10, 12, 16, 0.88)';
  ctx.beginPath();
  ctx.roundRect(40, 940, 640, 260, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px "Space Mono", monospace';
  ctx.fillText('CLARIO ASSET INTELLIGENCE · REFERENCE FRAME', 64, 980);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px "Space Grotesk", sans-serif';
  ctx.fillText(shotTitle, 64, 1025);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText(subtitle, 64, 1065);

  // Live Burnt-In Caption Simulation
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 30px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('“Speed of execution beats pedigree.”', 360, 840);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Returns a fully populated Apollo 11 & Keynote Founder Reel Project Fixture
 */
export function getApolloReferenceReelFixture(): HarvestProject {
  const projectId = 'proj_fixture_apollo_reel';

  const shots: ShotRecord[] = [
    {
      project_id: projectId,
      reference_url: 'https://www.instagram.com/reel/DY33MzlO_qS/',
      shot_id: 'shot_001',
      start_seconds: 0.0,
      end_seconds: 1.8,
      duration: 1.8,
      frame_url: createKeyframeCanvas(
        'Steve Jobs Keynote Stage',
        'Subject in black mock turtleneck pacing under directional stage lighting',
        '00:00.0 - 00:01.8',
        '#0B0E14',
        '#1E293B',
        'stage'
      ),
      visual_description: 'Subject in black mock turtleneck walking across keynote stage under high-contrast directional spotlight. Minimal dark auditorium background.',
      editor_text: 'The single biggest leverage in business',
      source_text: 'Apple Inc. Keynote 2007',
      content_type: 'film_tv',
      source_type: 'film_tv',
      likely_source: 'Apple Macworld Keynote 2007 (Steve Jobs iPhone Launch)',
      confidence: 'confirmed',
      exact_source_found: true,
      clean_source_url: 'https://archive.org/details/macworld-2007-keynote',
      license_status: 'copyrighted_reference_only',
      replacement_needed: true,
      replacement_prompt: 'Cinematic 35mm film shot of anonymous visionary founder in minimal black knit pacing on dark stage under warm spotlight, auditorium bokeh, 8k, vertical 9:16 --no trademarks, logos, recognizable faces',
      search_queries: [
        'Macworld 2007 keynote clean 1080p footage',
        'Steve Jobs iPhone announcement master excerpt',
        'founder on keynote stage directional lighting stock 4k',
        'cinematic keynote auditorium b-roll'
      ],
      notes: 'Contains copyrighted trademark and likeness. Do not distribute reel frame as clean asset. Use replacement prompt or archive B-roll.',
      selected: false,
    },
    {
      project_id: projectId,
      reference_url: 'https://www.instagram.com/reel/DY33MzlO_qS/',
      shot_id: 'shot_002',
      start_seconds: 1.8,
      end_seconds: 3.6,
      duration: 1.8,
      frame_url: createKeyframeCanvas(
        'Apollo 11 Saturn V Launch',
        'Slow-motion rocket engine ignition with massive flame exhaust plume',
        '00:01.8 - 00:03.6',
        '#180A04',
        '#431407',
        'rocket'
      ),
      visual_description: 'Extreme slow-motion telephoto tracking shot of Saturn V F-1 rocket engine ignition and expanding shock diamonds in exhaust plume.',
      editor_text: 'Speed of execution beats pedigree',
      source_text: 'USA / NASA 1969',
      content_type: 'archive',
      source_type: 'archive',
      likely_source: 'NASA Apollo 11 Saturn V Launch Master (Public Domain)',
      confidence: 'confirmed',
      exact_source_found: true,
      clean_source_url: 'https://images.nasa.gov/details-Apollo_11_Launch',
      license_status: 'public_domain_candidate',
      replacement_needed: false,
      replacement_prompt: 'High speed 4k slow motion footage of heavy orbital rocket thruster firing at launch pad, intense orange fire plume and sonic shock diamonds, vertical 9:16',
      search_queries: [
        'NASA images Apollo 11 launch master 4k',
        'Saturn V F-1 engine slow motion 500fps footage',
        'NASA public domain archive Apollo 11 reel',
        'heavy rocket booster liftoff telephoto'
      ],
      notes: 'NASA footage is in the public domain. Download clean uncompressed master from images.nasa.gov without editor text overlays.',
      selected: false,
    },
    {
      project_id: projectId,
      reference_url: 'https://www.instagram.com/reel/DY33MzlO_qS/',
      shot_id: 'shot_003',
      start_seconds: 3.6,
      end_seconds: 5.4,
      duration: 1.8,
      frame_url: createKeyframeCanvas(
        'Kobe Bryant Press Conference',
        'Athlete leaning into microphone on post-game interview podium',
        '00:03.6 - 00:05.4',
        '#1C1028',
        '#2E1065',
        'trophy'
      ),
      visual_description: 'Tight portrait of professional athlete leaning into press microphone during post-game press conference, intense focused expression.',
      editor_text: "Job's not finished.",
      source_text: 'NBA FINALS 2009',
      content_type: 'sports',
      source_type: 'sports',
      likely_source: '2009 NBA Finals Post-Game Press Conference (Kobe Bryant)',
      confidence: 'confirmed',
      exact_source_found: true,
      clean_source_url: 'https://www.youtube.com/watch?v=ga_UaQ9p3n4',
      license_status: 'copyrighted_reference_only',
      replacement_needed: true,
      replacement_prompt: 'Cinematic documentary portrait of determined athlete in locker room leaning toward press microphones, moody studio lighting, intense stare, 8k, vertical 9:16 --no logos, NBA jerseys',
      search_queries: [
        'Kobe Bryant 2009 finals press conference 1080p',
        'Job is not finished interview master clip',
        'athlete press conference microphone b-roll',
        'sports press interview dark background'
      ],
      notes: 'Copyrighted broadcast sports footage. Commercial use requires licensing from league.',
      selected: false,
    },
    {
      project_id: projectId,
      reference_url: 'https://www.instagram.com/reel/DY33MzlO_qS/',
      shot_id: 'shot_004',
      start_seconds: 5.4,
      end_seconds: 7.2,
      duration: 1.8,
      frame_url: createKeyframeCanvas(
        'SpaceX Starship Booster Catch',
        'Heavy mechanical tower catching returning rocket booster in mid-air',
        '00:05.4 - 00:07.2',
        '#051A24',
        '#0E3A4C',
        'rocket'
      ),
      visual_description: 'Wide cinematic twilight shot of massive steel rocket booster decelerating into giant robotic launch tower arms.',
      editor_text: 'The bar has moved.',
      source_text: 'SpaceX Starship Flight 5',
      content_type: 'archive',
      source_type: 'archive',
      likely_source: 'SpaceX Starship Flight 5 Booster Catch (Public Broadcast)',
      confidence: 'likely',
      exact_source_found: true,
      clean_source_url: 'https://www.spacex.com/launches',
      license_status: 'copyrighted_reference_only',
      replacement_needed: true,
      replacement_prompt: 'Hyper-realistic sci-fi industrial shot of giant steel rocket booster caught by mechanical crane arms in atmospheric dusk lighting, 8k, vertical 9:16',
      search_queries: [
        'SpaceX Starship flight 5 booster catch 4k clean',
        'Mechazilla booster catch telephoto tracking shot',
        'Starbase booster landing clean video',
        'aerospace heavy rocket landing 4k'
      ],
      notes: 'SpaceX video broadcast. Fair use for research; generate replacement for branded commercial ads.',
      selected: false,
    },
    {
      project_id: projectId,
      reference_url: 'https://www.instagram.com/reel/DY33MzlO_qS/',
      shot_id: 'shot_005',
      start_seconds: 7.2,
      end_seconds: 9.0,
      duration: 1.8,
      frame_url: createKeyframeCanvas(
        'Minimalist SaaS Growth Dashboard',
        'Screen recording of animated vector graph and metrics UI',
        '00:07.2 - 00:09.0',
        '#0A1118',
        '#1E293B',
        'chart'
      ),
      visual_description: 'Close-up isometric UI screen showing real-time growth telemetry, interactive dark-mode charts, and typography metrics.',
      editor_text: 'Own your distribution.',
      source_text: 'METRICS · +342% MRR',
      content_type: 'ui_screen',
      source_type: 'original',
      likely_source: 'Modern Fintech / SaaS Product Dashboard Screencast',
      confidence: 'confirmed',
      exact_source_found: false,
      clean_source_url: '',
      license_status: 'original_replacement_needed',
      replacement_needed: true,
      replacement_prompt: 'High fidelity isometric UI screencast mockup of dark mode fintech software dashboard with glowing emerald growth curves, sleek modern typography, 8k, vertical 9:16',
      search_queries: [
        'dark mode analytics dashboard screen recording',
        'fintech SaaS UI motion graphics 4k',
        'clean isometric software metrics animation',
        'Figma dashboard screen mockups'
      ],
      notes: 'Custom UI asset. Can be cleanly reproduced using Tailwind and Recharts or generated in Midjourney.',
      selected: false,
    }
  ];

  return {
    id: projectId,
    name: 'Founder Leverage & Execution Reel (Reference DY33MzlO_qS)',
    mode: 'video_harvester',
    reference_url: 'https://www.instagram.com/reel/DY33MzlO_qS/',
    source_file_name: 'apollo_jobs_execution_reel.mp4',
    shots,
    slides: [],
    generated_prompts: shots.map(s => ({
      id: `prompt_${s.shot_id}`,
      title: `Clean Equivalent for ${s.shot_id}`,
      category: 'anonymous_founders',
      aspect_ratio: '9:16',
      prompt: s.replacement_prompt,
      negative_prompt: 'watermarks, logos, text, recognizable actors, distorted limbs, blur',
      style_tokens: ['35mm film', 'cinematic lighting', '8k', 'clean background'],
      intended_use: 'Replacement B-roll asset for short-form video edit',
      model_target: 'midjourney',
      provenance_type: 'generated_replacement',
      created_at: Date.now(),
    })),
    provenance: shots.map(s => ({
      asset_id: s.shot_id,
      asset_name: `${s.shot_id} (${s.likely_source})`,
      provenance_type:
        s.license_status === 'public_domain_candidate'
          ? 'public_domain'
          : s.license_status === 'licensed_clean_available'
          ? 'licensed_alternative'
          : 'generated_replacement',
      source_url: s.clean_source_url || s.reference_url,
      license_note: s.license_status,
      confidence: s.confidence,
      timestamp: Date.now(),
      intended_use: 'Short-form reel deconstruction and clean replacement sourcing',
    })),
    created_at: Date.now() - 3600000,
    updated_at: Date.now(),
  };
}
