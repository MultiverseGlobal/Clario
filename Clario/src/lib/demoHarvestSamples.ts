import type { HarvestProject, ShotRecord, SlideHarvestRecord, SlideGraphicElement } from '../types/assets';
import { generateContactSheet } from './extractor';
import { generateClaudeCodePrompt } from './gemini';

// Helper to render high-contrast canvas demo frames
function renderCanvasFrame(
  title: string,
  subtitle: string,
  bgGradient: [string, string],
  accentColor: string,
  iconEmoji: string,
  captionText: string = ""
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d')!;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, 1280);
  grad.addColorStop(0, bgGradient[0]);
  grad.addColorStop(1, bgGradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 1280);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 720; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1280); ctx.stroke();
  }
  for (let y = 0; y < 1280; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke();
  }

  // Center Icon Graphic
  ctx.font = '90px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(iconEmoji, 360, 520);

  // Title Box
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 38px "Space Grotesk", sans-serif';
  ctx.fillText(title, 360, 620);

  ctx.fillStyle = accentColor;
  ctx.font = '600 24px sans-serif';
  ctx.fillText(subtitle, 360, 670);

  // Captions Overlay
  if (captionText) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(80, 880, 560, 80, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.fillText(`"${captionText}"`, 360, 930);
  }

  // Top Watermark Tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(40, 40, 260, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('CLARIO REFERENCE STILL', 170, 65);

  return canvas.toDataURL('image/jpeg', 0.92);
}

// Render clean transparent badge icons for demo slides
function renderDemoTransparentIcon(_label: string, bg: string, glyph: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(10, 10, 140, 140, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 80, 80);

  return canvas.toDataURL('image/png');
}

// ─── Demo Video Harvest Generator ───────────────────────────────────────────
export async function createDemoVideoHarvest(): Promise<{ project: HarvestProject; contactSheetUrl: string }> {
  const shots: ShotRecord[] = [
    {
      project_id: 'demo_video_project',
      reference_url: 'https://instagram.com/reel/demo_architecture_ref',
      shot_id: 'shot_001',
      start_seconds: 0.0,
      end_seconds: 2.1,
      duration: 2.1,
      frame_url: renderCanvasFrame('TALKING HEAD HOOK', 'Studio Interview Anchor', ['#0D1117', '#161B22'], '#38BDF8', '🎙️', 'The biggest mistake founders make...'),
      visual_description: 'Speaker looking directly into camera in dim studio with cyan rim light and acoustic slat wall.',
      editor_text: 'The biggest mistake founders make...',
      source_text: '',
      content_type: 'a_roll',
      source_type: 'interview_podcast',
      likely_source: 'Creator Original Podcast Episode #42',
      confidence: 'confirmed',
      exact_source_found: true,
      clean_source_url: 'https://youtube.com/watch?v=demo_podcast',
      license_status: 'licensed_clean_available',
      replacement_needed: false,
      replacement_prompt: 'High-contrast studio portrait of anonymous founder speaking into Shure SM7B microphone, moody cyan rim lighting, 85mm f/1.4 lens, 9:16 vertical',
      search_queries: ['creator studio podcast interview 4k', 'shure sm7b microphone speaking directly to camera'],
      notes: 'Clean audio & original camera master available from creator.',
    },
    {
      project_id: 'demo_video_project',
      reference_url: 'https://instagram.com/reel/demo_architecture_ref',
      shot_id: 'shot_002',
      start_seconds: 2.1,
      end_seconds: 4.5,
      duration: 2.4,
      frame_url: renderCanvasFrame('ARTIST SPLASHING PAINT', 'Wes Anderson Film Excerpt', ['#1F1315', '#2E151A'], '#F43F5E', '🎨', 'to the extreme'),
      visual_description: 'Fast-paced cut of an artist aggressively throwing thick black oil paint onto a massive gallery canvas in brutalist studio.',
      editor_text: 'to the extreme',
      source_text: '',
      content_type: 'film_tv',
      source_type: 'film_tv',
      likely_source: 'The French Dispatch (2021)',
      confidence: 'likely',
      exact_source_found: false,
      clean_source_url: '',
      license_status: 'copyrighted_reference_only',
      replacement_needed: true,
      replacement_prompt: 'Cinematic slow-motion shot of an anonymous female painter in paint-splattered black overalls flinging black oil paint onto a white canvas, high shutter speed, dramatic chiaroscuro side lighting, 35mm film grain, vertical 9:16 --no celebrity face, watermark, logos',
      search_queries: [
        'The French Dispatch 2021 painter canvas scene',
        'Wes Anderson artist throwing paint 4k clip',
        'dramatic action painting slow motion stock footage'
      ],
      notes: 'Copyrighted film clip. Do not distribute reference excerpt. Use generated equivalent.',
    },
    {
      project_id: 'demo_video_project',
      reference_url: 'https://instagram.com/reel/demo_architecture_ref',
      shot_id: 'shot_003',
      start_seconds: 4.5,
      end_seconds: 7.0,
      duration: 2.5,
      frame_url: renderCanvasFrame('MONOSPACE TERMINAL', 'Cargo Release Build', ['#0A0F14', '#0F172A'], '#10B981', '⚡', 'cargo build --release'),
      visual_description: 'Macro camera angle gliding across dark OLED screen running high-speed compiler logs with cyan and emerald syntax highlighting.',
      editor_text: '',
      source_text: 'cargo build --release',
      content_type: 'ui_screen',
      source_type: 'original',
      likely_source: 'Clean Monospace Terminal Recording',
      confidence: 'confirmed',
      exact_source_found: true,
      clean_source_url: 'https://github.com',
      license_status: 'licensed_clean_available',
      replacement_needed: false,
      replacement_prompt: 'Extreme close up of OLED monitor executing rust cargo build commands in dark developer workstation, cyan and emerald syntax tokens, subtle scanline glow, 9:16',
      search_queries: ['terminal code execution screen recording 4k', 'rust compiler terminal dark mode'],
      notes: 'Public open source / screen capture asset. Safe to recreate in terminal.',
    },
    {
      project_id: 'demo_video_project',
      reference_url: 'https://instagram.com/reel/demo_architecture_ref',
      shot_id: 'shot_004',
      start_seconds: 7.0,
      end_seconds: 9.4,
      duration: 2.4,
      frame_url: renderCanvasFrame('SATURN V STATIC FIRE', 'NASA Apollo Archive', ['#1C140A', '#2D1F10'], '#F59E0B', '🚀', '100x acceleration'),
      visual_description: 'Archive high-speed engineering footage of rocket combustion chamber test with intense Mach shock diamonds and desert plume.',
      editor_text: '100x acceleration',
      source_text: 'NASA MSFC S-IC-T',
      content_type: 'archive',
      source_type: 'archive',
      likely_source: 'NASA Apollo 11 Saturn V Test Stand Archive',
      confidence: 'confirmed',
      exact_source_found: true,
      clean_source_url: 'https://archive.org/details/Apollo11LaunchFootage',
      license_status: 'public_domain_candidate',
      replacement_needed: false,
      replacement_prompt: 'Cinematic ground-level slow motion footage of modern aerospace engine firing on desert test stand, intense yellow-orange flame plume with visible shock diamonds, 9:16',
      search_queries: ['NASA MSFC Apollo rocket static fire archive.org', 'Saturn V test stand public domain footage'],
      notes: 'NASA historical archive. Public domain government record, verify clean original on Archive.org.',
    },
    {
      project_id: 'demo_video_project',
      reference_url: 'https://instagram.com/reel/demo_architecture_ref',
      shot_id: 'shot_005',
      start_seconds: 9.4,
      end_seconds: 12.0,
      duration: 2.6,
      frame_url: renderCanvasFrame('BRUTALIST STUDIO', 'Modernist Cantilever at Dusk', ['#111318', '#1A1D24'], '#A78BFA', '🏛️', 'The new operating standard'),
      visual_description: 'Slow tracking wide shot of minimalist architectural studio in twilight fog with warm interior light.',
      editor_text: 'The new operating standard',
      source_text: '',
      content_type: 'b_roll',
      source_type: 'unresolved',
      likely_source: 'Architectural Digest / Vimeo Feature',
      confidence: 'possible',
      exact_source_found: false,
      clean_source_url: '',
      license_status: 'original_replacement_needed',
      replacement_needed: true,
      replacement_prompt: 'Architectural photography wide shot of a modern brutalist concrete design studio cantilevered over foggy Nordic pine forest at twilight, warm glowing interior glass windows, architectural digest aesthetic, 9:16 vertical',
      search_queries: ['brutalist cantilever studio twilight fog 4k', 'modernist architecture forest dusk vimeo'],
      notes: 'Visual function is high-craft aesthetic transition. Generate equivalent.',
    },
  ];

  const contactSheetUrl = await generateContactSheet(shots);

  const project: HarvestProject = {
    id: 'demo_video_harvest_proj',
    name: 'Growth & Architecture Reference (Asset Harvest)',
    mode: 'video_harvester',
    reference_url: 'https://instagram.com/reel/demo_architecture_ref',
    source_file_name: 'growth_architecture_reference.mp4',
    shots,
    slides: [],
    generated_prompts: [],
    provenance: shots.map(s => ({
      asset_id: s.shot_id,
      asset_name: `${s.shot_id} (${s.content_type})`,
      provenance_type: s.license_status === 'public_domain_candidate' ? 'public_domain' : s.license_status === 'licensed_clean_available' ? 'licensed_alternative' : 'generated_replacement',
      source_url: s.clean_source_url || s.reference_url,
      license_note: s.license_status,
      confidence: s.confidence,
      timestamp: Date.now(),
      intended_use: 'Short-form reel research and ingredient replacement mapping',
    })),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  return { project, contactSheetUrl };
}

// ─── Demo Slide Harvest Generator ───────────────────────────────────────────
export async function createDemoSlideHarvest(): Promise<{ project: HarvestProject }> {
  // Render demo slide images
  const renderSlideCanvas = (title: string, archetype: string, items: string[]): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;

    // Dark Base
    ctx.fillStyle = '#0F1015';
    ctx.fillRect(0, 0, 1080, 1080);

    // Top Pill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.roundRect(80, 80, 240, 44, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`01 · ${archetype.toUpperCase()}`, 105, 108);

    // Headline
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 52px "Space Grotesk", sans-serif';
    ctx.fillText(title, 80, 210);

    // 4 Card Modules
    const cardY = 320;
    const cardH = 560;
    const cardW = 920;

    ctx.fillStyle = '#181922';
    ctx.beginPath();
    ctx.roundRect(80, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    items.forEach((item, idx) => {
      const iy = cardY + 40 + idx * 120;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.roundRect(110, iy, 860, 90, 10);
      ctx.fill();

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`0${idx + 1}`, 140, iy + 52);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 20px "Space Grotesk", sans-serif';
      ctx.fillText(item, 200, iy + 52);
    });

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const slide1Img = renderSlideCanvas('The Autonomous Pipeline Stack', 'Tool Matrix', ['Demand Detection via Clutch', 'Hypothesis Extraction & Pain Signals', 'Zero-Pressure Diagnostic Outreach', 'Autonomous Delivery Engine']);
  const slide2Img = renderSlideCanvas('3 Friction Signals to Watch', 'Contrarian SOP', ['Friday Cross-Platform Reporting Slogs', 'Account Manager Context Handoffs', 'Client Onboarding 5-Day Lag', 'Multi-Tool Silo Sprawl']);

  const isolatedIcons1: SlideGraphicElement[] = [
    { id: 'icon_s1_1', label: 'Detection Engine', imageUrl: renderDemoTransparentIcon('Detection', '#10B981', '🔍'), x: 20, y: 50, width: 14, type: 'icon' },
    { id: 'icon_s1_2', label: 'Hypothesis Node', imageUrl: renderDemoTransparentIcon('Hypothesis', '#6366F1', '🧩'), x: 40, y: 50, width: 14, type: 'icon' },
    { id: 'icon_s1_3', label: 'Diagnostic Signal', imageUrl: renderDemoTransparentIcon('Diagnostic', '#38BDF8', '⚡'), x: 60, y: 50, width: 14, type: 'icon' },
    { id: 'icon_s1_4', label: 'Delivery Core', imageUrl: renderDemoTransparentIcon('Delivery', '#F59E0B', '🚀'), x: 80, y: 50, width: 14, type: 'icon' },
  ];

  const slides: SlideHarvestRecord[] = [
    {
      slide_id: 'slide_01',
      slide_index: 0,
      image_url: slide1Img,
      ocr_transcript: 'The Autonomous Pipeline Stack\n01 Demand Detection\n02 Hypothesis Extraction\n03 Diagnostic Outreach\n04 Autonomous Delivery',
      ocr_confidence: 0.98,
      typography_tokens: {
        headlineFont: 'Space Grotesk / Inter',
        fontSize: '52px',
        fontWeight: '800 (ExtraBold)',
        letterSpacing: '-0.03em',
      },
      palette_tokens: ['#0F1015', '#181922', '#F8FAFC', '#94A3B8', '#10B981'],
      layout_tokens: {
        archetype: 'Tool Matrix / 4-Step Pipeline',
        structure: 'Top category badge, bold headline, dark slate container holding 4 horizontal pill steps with green numerics.',
        aspectRatio: '1:1',
      },
      isolated_elements: isolatedIcons1,
      source_candidates: ['Creator Ops Framework / Tech Infographic'],
      claude_code_prompt: generateClaudeCodePrompt(
        'Autonomous Pipeline Stack',
        ['#0F1015', '#181922', '#F8FAFC', '#10B981'],
        'Tool Matrix / 4-Step Pipeline',
        'Top category badge, bold headline, dark slate container holding 4 horizontal pill steps with green numerics.'
      ),
      replacement_prompt: 'High-contrast dark mode technical infographic slide, ultra-clean typography, 4 rounded card modules with subtle 1px border glow, emerald accents, 1080x1080',
    },
    {
      slide_id: 'slide_02',
      slide_index: 1,
      image_url: slide2Img,
      ocr_transcript: '3 Friction Signals to Watch\n01 Friday Reporting Slogs\n02 Account Manager Handoffs\n03 Client Onboarding 5-Day Lag',
      ocr_confidence: 0.97,
      typography_tokens: {
        headlineFont: 'Space Grotesk / Inter',
        fontSize: '52px',
        fontWeight: '800 (ExtraBold)',
        letterSpacing: '-0.03em',
      },
      palette_tokens: ['#0F1015', '#181922', '#F8FAFC', '#94A3B8', '#F43F5E'],
      layout_tokens: {
        archetype: 'Contrarian SOP / Red Flags List',
        structure: 'Top pill, title, 3 red-accented warning cards with problem breakdowns.',
        aspectRatio: '1:1',
      },
      isolated_elements: isolatedIcons1.slice(0, 3),
      source_candidates: ['Creator Agency SOP Guide'],
      claude_code_prompt: generateClaudeCodePrompt(
        '3 Friction Signals to Watch',
        ['#0F1015', '#181922', '#F8FAFC', '#F43F5E'],
        'Contrarian SOP / Red Flags List',
        'Top pill, title, 3 red-accented warning cards with problem breakdowns.'
      ),
      replacement_prompt: 'Minimalist dark mode warning infographic, red accent pill tags, sleek monospace code tokens, 1080x1080',
    }
  ];

  const project: HarvestProject = {
    id: 'demo_slide_harvest_proj',
    name: 'Autonomous Systems Carousel Deck (Asset Harvest)',
    mode: 'slide_harvester',
    reference_url: 'https://linkedin.com/posts/demo_agency_systems',
    source_file_name: 'autonomous_systems_deck.png',
    shots: [],
    slides,
    generated_prompts: [],
    provenance: slides.map(s => ({
      asset_id: s.slide_id,
      asset_name: `Slide ${s.slide_index + 1} (${s.layout_tokens.archetype})`,
      provenance_type: 'generated_replacement',
      source_url: 'https://linkedin.com/posts/demo_agency_systems',
      license_note: 'Extracted design system for code reproduction',
      confidence: 'confirmed',
      timestamp: Date.now(),
      intended_use: 'Design tokens and Claude artifact React reproduction',
    })),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  return { project };
}
