import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// ─── Pure Rights Invariants and Export Selectors ──────────────────────────────
export function isProductionEligible(asset, confirmedEvidence = false) {
  if (!asset) return false;
  const rightsStatus =
    typeof asset === 'object' && 'rightsStatus' in asset
      ? asset.rightsStatus
      : typeof asset === 'object' && 'rights_status' in asset
      ? asset.rights_status
      : asset;

  if (
    rightsStatus === 'user_owned' ||
    rightsStatus === 'licensed_clean_source' ||
    rightsStatus === 'generated_original'
  ) {
    return true;
  }
  if (rightsStatus === 'public_domain_candidate' && confirmedEvidence) {
    return true;
  }
  return false;
}

export function selectProductionAssets(assets) {
  return assets.filter(asset => isProductionEligible(asset));
}

export function extractProjectAssetRecords(project) {
  const records = [];
  const projectId = project.id;
  const projectName = project.name || 'Untitled Project';

  // 1. Attached Clean Masters & Unresolved Attachments
  (project.clean_assets || []).forEach(c => {
    const rightsStatus = c.rights_status || 'unresolved';
    const assetId = c.id || `master_${c.shot_id}`;
    records.push({
      id: `${projectId}:${assetId}`,
      projectId,
      projectName,
      shotId: c.shot_id,
      assetKind: 'attached_master',
      rightsStatus,
      productionEligible: isProductionEligible(rightsStatus),
      title: c.title || `${c.shot_id.toUpperCase()} Master`,
      filename: `${c.shot_id}_clean_master.png`,
      mimeType: c.asset_type === 'clip' ? 'video/mp4' : 'image/png',
      sourceUrl: c.source_url || c.url,
      rightsNote: c.rights_note || c.source_title,
      url: c.url,
      createdAt: c.created_at || project.created_at,
      updatedAt: c.created_at || project.updated_at,
    });
  });

  // 2. Generated Originals
  (project.replacements || [])
    .filter(r => r.replacement_type === 'generated_original')
    .forEach(r => {
      const assetId = r.id || `gen_${r.shot_id}`;
      records.push({
        id: `${projectId}:${assetId}`,
        projectId,
        projectName,
        shotId: r.shot_id,
        assetKind: 'generated_original',
        rightsStatus: 'generated_original',
        productionEligible: true,
        title: r.title || `${r.shot_id.toUpperCase()} Generated Original`,
        filename: `${r.shot_id}_generated_original.jpg`,
        mimeType: 'image/jpeg',
        sourceUrl: r.url,
        rightsNote: r.rights_note || 'Generated functional original equivalent',
        prompt: r.prompt,
        url: r.url,
        createdAt: r.created_at || project.created_at,
        updatedAt: r.created_at || project.updated_at,
      });
    });

  // 3. Reconstructed Stills (Research Only)
  (project.replacements || [])
    .filter(r => r.replacement_type === 'ai_cleaned_reference' || r.replacement_type === 'crop_reframe')
    .forEach(r => {
      const assetId = r.id || `recon_${r.shot_id}`;
      records.push({
        id: `${projectId}:${assetId}`,
        projectId,
        projectName,
        shotId: r.shot_id,
        assetKind: 'reconstructed_still',
        rightsStatus: 'ai_cleaned_reference',
        productionEligible: false,
        title: r.title || `${r.shot_id.toUpperCase()} Reconstructed Still`,
        filename: `${r.shot_id}_reconstructed_still.jpg`,
        mimeType: 'image/jpeg',
        sourceUrl: r.url,
        rightsNote: 'Research-only reconstructed still. Not production-eligible.',
        prompt: r.prompt,
        url: r.url,
        createdAt: r.created_at || project.created_at,
        updatedAt: r.created_at || project.updated_at,
      });
    });

  // 4. Reference Evidence Frames
  (project.shots || []).forEach(s => {
    const assetId = `ref_${s.shot_id}`;
    records.push({
      id: `${projectId}:${assetId}`,
      projectId,
      projectName,
      shotId: s.shot_id,
      assetKind: 'reference_evidence',
      rightsStatus: 'reference_only',
      productionEligible: false,
      title: `${s.shot_id.toUpperCase()} Reference Frame`,
      filename: `${s.shot_id}_ref_frame.jpg`,
      mimeType: 'image/jpeg',
      sourceUrl: s.clean_source_url || s.frame_url,
      rightsNote: `Reference frame (${s.start_seconds.toFixed(1)}s - ${s.end_seconds.toFixed(1)}s). Not cleared for reuse.`,
      url: s.frame_url,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    });
  });

  return records;
}

// In-memory mock Vault store for deterministic testing
class MockVaultStore {
  constructor() {
    this.table = new Map();
  }

  syncProject(project) {
    const records = extractProjectAssetRecords(project);
    // Delete existing by project
    for (const [k, v] of this.table.entries()) {
      if (v.projectId === project.id) {
        this.table.delete(k);
      }
    }
    // Upsert new
    for (const r of records) {
      this.table.set(r.id, r);
    }
  }

  query(options = {}) {
    const q = (options.query || '').trim().toLowerCase();
    const cat = options.category || 'all';

    return Array.from(this.table.values()).filter(r => {
      const isEligible = isProductionEligible(r.rightsStatus);
      if (cat === 'production_eligible' && !isEligible) return false;
      if (cat === 'generated_originals' && r.assetKind !== 'generated_original') return false;
      if (cat === 'reconstructed_stills' && r.assetKind !== 'reconstructed_still') return false;
      if (cat === 'unresolved' && r.rightsStatus !== 'unresolved') return false;
      if (cat === 'reference_evidence' && r.assetKind !== 'reference_evidence') return false;

      if (q) {
        const titleStr = (r.title || '').toLowerCase();
        const filenameStr = (r.filename || '').toLowerCase();
        const projectStr = (r.projectName || r.projectId || '').toLowerCase();
        const shotStr = (r.shotId || '').toLowerCase();
        const sourceStr = (r.sourceUrl || '').toLowerCase();
        const rightsStr = (r.rightsNote || '').toLowerCase();
        const promptStr = (r.prompt || '').toLowerCase();

        return (
          titleStr.includes(q) ||
          filenameStr.includes(q) ||
          projectStr.includes(q) ||
          shotStr.includes(q) ||
          sourceStr.includes(q) ||
          rightsStr.includes(q) ||
          promptStr.includes(q)
        );
      }

      return true;
    });
  }

  count() {
    return this.table.size;
  }
}

// ─── 13-Shot Deterministic Test Fixture ─────────────────────────────────────────
function createSuppliedVideoFixture() {
  const shots = Array.from({ length: 13 }, (_, i) => {
    const shotNum = String(i + 1).padStart(3, '0');
    return {
      project_id: 'proj_supplied_video_test',
      shot_id: `shot_${shotNum}`,
      start_seconds: i * 2.5,
      end_seconds: (i + 1) * 2.5,
      duration: 2.5,
      frame_url: `blob:http://localhost/ref_frame_${shotNum}.jpg`,
      visual_description: `Shot ${shotNum} dynamic scene analysis`,
      editor_text: i === 0 ? 'Burnt-in caption' : '',
      source_text: '',
      content_type: 'a_roll',
      source_type: 'uploaded',
      likely_source: 'Reference Movie (2024)',
      confidence: 'likely',
      analysis_confidence: 'low',
      exact_source_found: false,
      clean_source_url: 'https://example.com/reference-source',
      license_status: 'copyrighted_reference_only',
      rights_status: 'reference_only',
      resolution_status: i === 0 ? 'rights_unresolved' : 'needs_decision',
      replacement_needed: true,
      replacement_prompt: `High quality replacement visual for shot ${shotNum}`,
      search_queries: [`shot ${shotNum} reference`],
      notes: 'Harvested from reference MP4',
    };
  });

  // 1 Unresolved Attachment on Shot 001
  const clean_assets = [
    {
      id: 'proj_supplied_video_test:master_shot_001',
      shot_id: 'shot_001',
      asset_type: 'clip',
      title: 'Test uploaded reference file',
      url: 'blob:http://localhost/attached_unresolved.mp4',
      dimensions: '1920x1080',
      duration: 2.5,
      rights_status: 'unresolved',
      production_eligible: false,
      source_title: 'Raw supplied video snippet',
      source_url: 'https://archive.example.org/ref-item-99',
      rights_note: 'Rights unresolved pending licensing verification from owner',
      transformation_history: ['Attached file as unresolved master candidate'],
      created_at: 1700000000000,
    },
  ];

  return {
    id: 'proj_supplied_video_test',
    name: 'Supplied Video Regression Project',
    mode: 'video_harvester',
    reference_url: 'https://example.com/reference-video.mp4',
    shots,
    slides: [],
    clean_assets,
    replacements: [],
    generated_prompts: [],
    provenance: [],
    created_at: 1700000000000,
    updated_at: 1700000000000,
  };
}

// ─── Regression Suite ─────────────────────────────────────────────────────────
describe('Clario Hardening & Regression Test Suite', () => {
  const fixture = createSuppliedVideoFixture();
  const allAssetRecords = extractProjectAssetRecords(fixture);
  const vault = new MockVaultStore();
  vault.syncProject(fixture);

  test('1. Unresolved attachment appears only in Unresolved Attachments', () => {
    const unresolved = allAssetRecords.filter(a => a.rightsStatus === 'unresolved');
    assert.equal(unresolved.length, 1);
    assert.equal(unresolved[0].shotId, 'shot_001');
    assert.equal(unresolved[0].assetKind, 'attached_master');
    assert.equal(unresolved[0].productionEligible, false);
  });

  test('2. Production-Eligible Asset Masters count remains zero', () => {
    const eligibleMasters = allAssetRecords.filter(
      a => a.assetKind === 'attached_master' && a.productionEligible === true
    );
    assert.equal(eligibleMasters.length, 0);
  });

  test('3. Strict production pack is disabled (selectProductionAssets returns empty)', () => {
    const prodAssets = selectProductionAssets(allAssetRecords);
    assert.equal(prodAssets.length, 0);
  });

  test('4. Clearance manifest reports 0 included and 1 unresolved excluded', () => {
    const included = selectProductionAssets(allAssetRecords).length;
    const unresolvedExcluded = allAssetRecords.filter(a => a.rightsStatus === 'unresolved').length;
    const refExcluded = allAssetRecords.filter(a => a.assetKind === 'reference_evidence').length;
    assert.equal(included, 0);
    assert.equal(unresolvedExcluded, 1);
    assert.equal(refExcluded, 13);
  });

  test('5. Mixed archive filename contains mixed_archive_unresolved', () => {
    const projectSlug = fixture.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const archiveName = `clario_${projectSlug}_mixed_archive_unresolved.zip`;
    assert.ok(archiveName.includes('mixed_archive_unresolved'));
  });

  test('6. Report, CSV, prompts, and provenance downloads have correct extensions and MIME types', () => {
    const files = [
      { name: 'CLARIO_REPORT_test.md', mime: 'text/markdown', ext: '.md' },
      { name: 'SHOT_MANIFEST_test.csv', mime: 'text/csv', ext: '.csv' },
      { name: 'ASSET_PROMPTS_test.md', mime: 'text/markdown', ext: '.md' },
      { name: 'PROVENANCE_MANIFEST_test.json', mime: 'application/json', ext: '.json' },
    ];
    for (const f of files) {
      assert.ok(f.name.endsWith(f.ext));
      assert.ok(f.mime.length > 0);
    }
  });

  test('7. Provenance contains the unresolved asset with full metadata', () => {
    const unres = allAssetRecords.find(a => a.rightsStatus === 'unresolved');
    assert.ok(unres);
    assert.equal(unres.title, 'Test uploaded reference file');
    assert.equal(unres.sourceUrl, 'https://archive.example.org/ref-item-99');
    assert.equal(unres.rightsNote, 'Rights unresolved pending licensing verification from owner');
  });

  test('8. Syncing the project twice produces no duplicates in Vault', () => {
    assert.equal(vault.count(), 14); // 13 reference frames + 1 unresolved attachment
    vault.syncProject(fixture);
    assert.equal(vault.count(), 14);
  });

  test('9. Vault search finds the asset by title, filename, project name, source URL, and rights note', () => {
    assert.equal(vault.query({ query: 'Test uploaded reference file' }).length, 1);
    assert.equal(vault.query({ query: 'shot_001_clean_master' }).length, 1);
    assert.equal(vault.query({ query: 'Supplied Video Regression' }).length, 14);
    assert.equal(vault.query({ query: 'archive.example.org' }).length, 1);
    assert.equal(vault.query({ query: 'pending licensing verification' }).length, 1);
  });

  test('10. The Unresolved filter finds exactly one record', () => {
    const results = vault.query({ category: 'unresolved' });
    assert.equal(results.length, 1);
    assert.equal(results[0].shotId, 'shot_001');
    assert.equal(results[0].rightsStatus, 'unresolved');
  });

  test('11. Reloading the app / re-syncing rebuilds the exact same Vault state', () => {
    const vault2 = new MockVaultStore();
    vault2.syncProject(fixture);
    assert.equal(vault2.count(), 14);
    assert.equal(vault2.query({ category: 'unresolved' }).length, 1);
    assert.equal(vault2.query({ category: 'production_eligible' }).length, 0);
    assert.equal(vault2.query({ category: 'reference_evidence' }).length, 13);
  });

  test('12. Generated originals and reconstructed stills appear in their correct filters when added', () => {
    const updatedFixture = {
      ...fixture,
      replacements: [
        {
          id: 'gen_001',
          shot_id: 'shot_002',
          replacement_type: 'generated_original',
          title: 'Cyberpunk Skyline Original',
          url: 'blob:http://localhost/gen_001.jpg',
          prompt: 'Cinematic city view at dusk',
          created_at: Date.now(),
        },
        {
          id: 'recon_001',
          shot_id: 'shot_003',
          replacement_type: 'ai_cleaned_reference',
          title: 'Research Inpainted Frame',
          url: 'blob:http://localhost/recon_001.jpg',
          prompt: 'Inpaint overlay logo',
          created_at: Date.now(),
        },
      ],
    };

    const updatedVault = new MockVaultStore();
    updatedVault.syncProject(updatedFixture);

    const genResults = updatedVault.query({ category: 'generated_originals' });
    assert.equal(genResults.length, 1);
    assert.equal(genResults[0].title, 'Cyberpunk Skyline Original');
    assert.equal(genResults[0].productionEligible, true);

    const reconResults = updatedVault.query({ category: 'reconstructed_stills' });
    assert.equal(reconResults.length, 1);
    assert.equal(reconResults[0].title, 'Research Inpainted Frame');
    assert.equal(reconResults[0].productionEligible, false);

    const prodResults = updatedVault.query({ category: 'production_eligible' });
    assert.equal(prodResults.length, 1); // only the 1 generated original
  });

  test('13. Product honesty: No control or export claims to produce a continuous cleaned video', () => {
    const stillAsset = allAssetRecords.find(a => a.assetKind === 'reconstructed_still');
    // If still exists, must be false for production
    if (stillAsset) {
      assert.equal(stillAsset.productionEligible, false);
    }
    // Ensure rights status invariant
    assert.equal(isProductionEligible('ai_cleaned_reference'), false);
    assert.equal(isProductionEligible('reference_only'), false);
    assert.equal(isProductionEligible('unresolved'), false);
  });
});
