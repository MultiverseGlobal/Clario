import { db, type DexieProjectRecord, type DexieVaultAssetRecord } from './dexieDb';
import {
  type HarvestProject,
  type HarvesterMode,
  type ContentMode,
  type Asset,
  type CarouselSlideItem,
  type VideoTrackItem,
  type AssetRecord,
  type CleanAssetRecord,
  type ReplacementRecord,
  type ResolvedAssetRecord,
  type AssetKind,
  type RightsStatus,
  type VaultQuery,
  isProductionEligible,
  type ReferenceSegmentRecord,
} from '../types/assets';
import { formatSegmentFilename } from './segmentCutter';

export type CanvasFormat = '1:1' | '9:16' | '16:9' | '4:5';

export interface ClarioProject {
  id: string;
  name: string;
  mode: ContentMode | HarvesterMode;
  format?: CanvasFormat;
  scriptText: string;
  slides: CarouselSlideItem[];
  trackItems: VideoTrackItem[];
  selectedAssets: Asset[];
  harvestProject?: HarvestProject;
  thumbnail?: string; // base64 or data URL
  createdAt: number;
  updatedAt: number;
}

/**
 * Normalizes legacy or partial harvest project records:
 * - Infers asset_kind from record type
 * - Ensures valid rights_status
 * - Calculates production_eligible invariant
 */
export function normalizeHarvestProject(project: HarvestProject): HarvestProject {
  const clean_assets: CleanAssetRecord[] = (project.clean_assets || []).map(c => {
    const rights_status: RightsStatus = (c.rights_status as RightsStatus) || 'unresolved';
    const production_eligible = isProductionEligible(rights_status);
    const asset_kind: AssetKind = 'attached_master';
    return {
      ...c,
      asset_kind,
      rights_status,
      production_eligible,
    };
  });

  const replacements: ReplacementRecord[] = (project.replacements || []).map(r => {
    const isOriginal = r.replacement_type === 'generated_original';
    const rights_status: RightsStatus = isOriginal
      ? 'generated_original'
      : (r.rights_status as RightsStatus) || 'reference_only';
    const production_eligible = isProductionEligible(rights_status);
    const asset_kind: AssetKind = isOriginal ? 'generated_original' : 'reconstructed_still';
    return {
      ...r,
      asset_kind,
      rights_status,
      production_eligible,
    };
  });

  const resolved_assets: ResolvedAssetRecord[] = (project.resolved_assets || []).map(ra => {
    const rights_status: RightsStatus = (ra.rights_status as RightsStatus) || 'unresolved';
    const production_eligible = isProductionEligible(rights_status);
    let asset_kind: AssetKind = ra.asset_kind || 'reference_evidence';
    if (ra.output_type === 'authorized_asset_master') asset_kind = 'attached_master';
    else if (ra.output_type === 'generated_original') asset_kind = 'generated_original';
    else if (ra.output_type === 'ai_cleaned_reference_still') asset_kind = 'reconstructed_still';

    return {
      ...ra,
      asset_kind,
      rights_status,
      production_eligible,
    };
  });

  const reference_segments: ReferenceSegmentRecord[] = (project.reference_segments || []).map(rs => {
    return {
      ...rs,
      asset_kind: 'reference_segment',
      rights_status: 'reference_only',
      production_eligible: false,
    };
  });

  return {
    ...project,
    clean_assets,
    replacements,
    resolved_assets,
    reference_segments,
  };
}

/**
 * Convert individual project outputs to canonical AssetRecord instances.
 */
export function extractProjectAssetRecords(project: HarvestProject): AssetRecord[] {
  const records: AssetRecord[] = [];
  const normalized = normalizeHarvestProject(project);
  const projectId = normalized.id;
  const projectName = normalized.name || 'Untitled Project';

  // 1. Attached Masters & Unresolved Attachments
  (normalized.clean_assets || []).forEach(c => {
    const rightsStatus = (c.rights_status as RightsStatus) || 'unresolved';
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
      createdAt: c.created_at || normalized.created_at,
      updatedAt: c.created_at || normalized.updated_at,
    });
  });

  // 2. Generated Originals
  (normalized.replacements || [])
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
        negativePrompt: r.negative_prompt,
        url: r.url,
        createdAt: r.created_at || normalized.created_at,
        updatedAt: r.created_at || normalized.updated_at,
      });
    });

  // 3. Reconstructed Stills (Research Only)
  (normalized.replacements || [])
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
        rightsNote: r.rights_note || 'Research-only reconstructed still. Not production-eligible.',
        prompt: r.prompt,
        url: r.url,
        createdAt: r.created_at || normalized.created_at,
        updatedAt: r.created_at || normalized.updated_at,
      });
    });

  // 3.5 Reference Segments
  (normalized.reference_segments || []).forEach(rs => {
    const assetId = rs.id || `segment_${rs.shot_id}`;
    records.push({
      id: `${projectId}:${assetId}`,
      projectId,
      projectName,
      shotId: rs.shot_id,
      assetKind: 'reference_segment',
      rightsStatus: 'reference_only',
      productionEligible: false,
      title: rs.title || `${rs.shot_id.toUpperCase()} Reference Segment`,
      filename: rs.filename || formatSegmentFilename(rs.shot_id, rs.start_seconds, rs.end_seconds),
      mimeType: 'video/mp4',
      sourceUrl: rs.url,
      rightsNote: 'Reference segment. Not cleared for production.',
      url: rs.url,
      startSeconds: rs.start_seconds,
      endSeconds: rs.end_seconds,
      durationSeconds: rs.duration_seconds,
      width: rs.width,
      height: rs.height,
      hasAudio: rs.has_audio,
      createdAt: rs.created_at || normalized.created_at,
      updatedAt: rs.updated_at || normalized.updated_at,
    });
  });

  // 4. Reference Evidence Frames
  (normalized.shots || []).forEach(s => {
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
      createdAt: normalized.created_at,
      updatedAt: normalized.updated_at,
    });
  });

  return records;
}

/**
 * Synchronize a single asset to the global Vault table idempotently.
 */
export async function syncAssetToVault(asset: AssetRecord): Promise<void> {
  try {
    const key = asset.id.includes(':') ? asset.id : `${asset.projectId}:${asset.id}`;
    const productionEligible = isProductionEligible(asset.rightsStatus);

    const vaultRecord: DexieVaultAssetRecord = {
      ...asset,
      id: key,
      productionEligible,
      // Legacy compatibility aliases
      project_id: asset.projectId,
      shot_id: asset.shotId,
      asset_kind: asset.assetKind,
      rights_status: asset.rightsStatus,
      production_eligible: productionEligible,
    };

    await db.vaultAssets.put(vaultRecord);
  } catch (err) {
    console.warn('syncAssetToVault warning:', err);
  }
}

/**
 * Synchronize all project outputs to the global Vault indexed table idempotently.
 */
export async function syncProjectToVault(project: HarvestProject | ClarioProject): Promise<void> {
  try {
    const rawHarvest: HarvestProject =
      'shots' in project
        ? (project as HarvestProject)
        : (project as ClarioProject).harvestProject || {
            id: project.id,
            name: project.name,
            mode: (project.mode as any) || 'video_harvester',
            shots: [],
            slides: [],
            generated_prompts: [],
            provenance: [],
            created_at: (project as ClarioProject).createdAt || Date.now(),
            updated_at: Date.now(),
          };

    const assetRecords = extractProjectAssetRecords(rawHarvest);

    // Delete existing records for this project to remove any stale/deleted assets
    await db.vaultAssets.where('projectId').equals(rawHarvest.id).delete();
    await db.vaultAssets.where('project_id').equals(rawHarvest.id).delete();

    if (assetRecords.length > 0) {
      const dexieVaultRecords: DexieVaultAssetRecord[] = assetRecords.map(a => ({
        ...a,
        project_id: a.projectId,
        shot_id: a.shotId,
        asset_kind: a.assetKind,
        rights_status: a.rightsStatus,
        production_eligible: a.productionEligible,
      }));

      await db.vaultAssets.bulkPut(dexieVaultRecords);
    }
  } catch (err) {
    console.warn('Vault sync warning:', err);
  }
}

/**
 * Save or update a project in Dexie.js (local-first storage).
 */
export async function saveProject(project: ClarioProject | HarvestProject): Promise<void> {
  const isHarvest = 'shots' in project || ('slides' in project && 'ocr_transcript' in (project.slides[0] || {}));
  const rawHarvest: HarvestProject = isHarvest
    ? (project as HarvestProject)
    : (project as ClarioProject).harvestProject || {
        id: project.id,
        name: project.name,
        mode: (project.mode as any) || 'video_harvester',
        shots: [],
        slides: [],
        generated_prompts: [],
        provenance: [],
        created_at: (project as ClarioProject).createdAt || Date.now(),
        updated_at: Date.now(),
      };

  const harvestData = normalizeHarvestProject(rawHarvest);

  const dexieRecord: DexieProjectRecord = {
    id: harvestData.id,
    name: harvestData.name || 'Untitled Harvest',
    mode: (harvestData.mode as any) || 'video_harvester',
    reference_url: harvestData.reference_url,
    source_file_name: harvestData.source_file_name,
    created_at: harvestData.created_at || Date.now(),
    updated_at: Date.now(),
    project_data: harvestData,
  };

  // Upsert project
  await db.projects.put(dexieRecord);

  // Index individual shots for fast relational queries
  if (harvestData.shots && harvestData.shots.length > 0) {
    const shotRecords = harvestData.shots.map(s => ({
      ...s,
      id: `${harvestData.id}_${s.shot_id}`,
      project_id: harvestData.id,
    }));
    await db.shots.bulkPut(shotRecords);
  }

  // Index individual slides for fast relational queries
  if (harvestData.slides && harvestData.slides.length > 0) {
    const slideRecords = harvestData.slides.map(sl => ({
      ...sl,
      id: `${harvestData.id}_${sl.slide_id}`,
      project_id: harvestData.id,
    }));
    await db.slides.bulkPut(slideRecords);
  }

  // Index all outputs in global Vault
  await syncProjectToVault(harvestData);
}

/**
 * Fetch a single project by ID.
 */
export async function getProject(id: string): Promise<ClarioProject | null> {
  const record = await db.projects.get(id);
  if (!record) return null;

  const normalizedHarvest = record.project_data ? normalizeHarvestProject(record.project_data) : undefined;

  if (normalizedHarvest) {
    // Ensure Vault is in sync upon project load
    await syncProjectToVault(normalizedHarvest);
  }

  return {
    id: record.id,
    name: record.name,
    mode: record.mode,
    scriptText: '',
    slides: [],
    trackItems: [],
    selectedAssets: [],
    harvestProject: normalizedHarvest,
    thumbnail: normalizedHarvest?.shots?.[0]?.frame_url || normalizedHarvest?.slides?.[0]?.image_url,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * List all saved projects from IndexedDB.
 */
export async function listProjects(): Promise<ClarioProject[]> {
  const records = await db.projects.orderBy('updated_at').reverse().toArray();

  return records.map(record => {
    const normalizedHarvest = record.project_data ? normalizeHarvestProject(record.project_data) : undefined;
    return {
      id: record.id,
      name: record.name,
      mode: record.mode,
      scriptText: '',
      slides: [],
      trackItems: [],
      selectedAssets: [],
      harvestProject: normalizedHarvest,
      thumbnail: normalizedHarvest?.shots?.[0]?.frame_url || normalizedHarvest?.slides?.[0]?.image_url,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  });
}

/**
 * Query Vault assets directly with search and filtering on normalized fields.
 */
export async function queryVaultAssets(options?: VaultQuery): Promise<AssetRecord[]> {
  try {
    let records = await db.vaultAssets.orderBy('updatedAt').reverse().toArray();

    // Fallback: If vaultAssets is empty, rebuild and sync from projects
    if (records.length === 0) {
      const projects = await listProjects();
      for (const p of projects) {
        if (p.harvestProject) {
          await syncProjectToVault(p.harvestProject);
        }
      }
      records = await db.vaultAssets.orderBy('updatedAt').reverse().toArray();
    }

    const q = (options?.query || '').trim().toLowerCase();
    const cat = options?.category || 'all';

    return records.filter(r => {
      const assetKind: AssetKind = r.assetKind || (r as any).asset_kind || 'reference_evidence';
      const rightsStatus: RightsStatus = r.rightsStatus || (r as any).rights_status || 'reference_only';
      const productionEligible: boolean = isProductionEligible(rightsStatus);

      // 1. Category Filter
      if (cat === 'production_eligible' && !productionEligible) return false;
      if (cat === 'generated_originals' && assetKind !== 'generated_original') return false;
      if (cat === 'reconstructed_stills' && assetKind !== 'reconstructed_still') return false;
      if (cat === 'unresolved' && rightsStatus !== 'unresolved') return false;
      if (cat === 'reference_evidence' && assetKind !== 'reference_evidence') return false;

      // 2. Multi-attribute Search
      if (q) {
        const titleStr = (r.title || '').toLowerCase();
        const filenameStr = (r.filename || '').toLowerCase();
        const projectStr = (r.projectName || (r as any).project_name || r.projectId || (r as any).project_id || '').toLowerCase();
        const shotStr = (r.shotId || (r as any).shot_id || '').toLowerCase();
        const sourceStr = (r.sourceUrl || (r as any).source_url || '').toLowerCase();
        const rightsStr = (r.rightsNote || (r as any).rights_note || '').toLowerCase();
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
    }).map(r => ({
      ...r,
      projectId: r.projectId || (r as any).project_id,
      projectName: r.projectName || (r as any).project_name,
      shotId: r.shotId || (r as any).shot_id,
      assetKind: r.assetKind || (r as any).asset_kind,
      rightsStatus: r.rightsStatus || (r as any).rights_status,
      productionEligible: isProductionEligible(r.rightsStatus || (r as any).rights_status),
      sourceUrl: r.sourceUrl || (r as any).source_url,
      rightsNote: r.rightsNote || (r as any).rights_note,
      createdAt: r.createdAt || (r as any).created_at,
      updatedAt: r.updatedAt || (r as any).updated_at,
    }));
  } catch (err) {
    console.warn('Failed to query vault:', err);
    return [];
  }
}

/**
 * Get the exact count of unique output assets in the Vault.
 */
export async function getVaultAssetsCount(): Promise<number> {
  try {
    const count = await db.vaultAssets.count();
    if (count === 0) {
      const projects = await listProjects();
      let total = 0;
      for (const p of projects) {
        if (p.harvestProject) {
          const records = extractProjectAssetRecords(p.harvestProject);
          total += records.length;
        }
      }
      return total;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * One-time idempotent migration & repair script for Vault schema.
 */
export async function runVaultMigration(): Promise<void> {
  try {
    const projects = await listProjects();
    for (const p of projects) {
      if (p.harvestProject) {
        await syncProjectToVault(p.harvestProject);
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clario_vault_migration_v3', Date.now().toString());
    }
  } catch (err) {
    console.warn('Vault migration warning:', err);
  }
}

// Auto-run migration on store load
if (typeof window !== 'undefined') {
  runVaultMigration().catch(() => {});
}

/**
 * Delete a project and all associated relational shots, slides, and vault records.
 */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
  await db.shots.where('project_id').equals(id).delete();
  await db.slides.where('project_id').equals(id).delete();
  await db.frameBlobs.where('project_id').equals(id).delete();
  await db.jobs.where('project_id').equals(id).delete();
  await db.vaultAssets.where('projectId').equals(id).delete();
  await db.vaultAssets.where('project_id').equals(id).delete();
}

/**
 * Duplicate an existing project.
 */
export async function duplicateProject(id: string): Promise<ClarioProject | null> {
  const original = await getProject(id);
  if (!original) return null;

  const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const clonedHarvest: HarvestProject = {
    ...(original.harvestProject || {
      id: original.id,
      name: original.name,
      mode: original.mode as any,
      shots: [],
      slides: [],
      generated_prompts: [],
      provenance: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    }),
    id: newId,
    name: `${original.name} (Copy)`,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const clonedProject: ClarioProject = {
    ...original,
    id: newId,
    name: clonedHarvest.name,
    harvestProject: clonedHarvest,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveProject(clonedProject);
  return clonedProject;
}

/**
 * Rename a project.
 */
export async function renameProject(id: string, newName: string): Promise<void> {
  const record = await db.projects.get(id);
  if (record) {
    record.name = newName;
    if (record.project_data) {
      record.project_data.name = newName;
    }
    record.updated_at = Date.now();
    await db.projects.put(record);
    if (record.project_data) {
      await syncProjectToVault(record.project_data);
    }
  }
}
