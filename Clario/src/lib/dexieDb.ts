import Dexie, { type Table } from 'dexie';
import type { HarvestProject, ShotRecord, SlideHarvestRecord, AssetRecord } from '../types/assets';

export interface DexieProjectRecord {
  id: string;
  name: string;
  mode: 'video_harvester' | 'slide_harvester';
  reference_url?: string;
  source_file_name?: string;
  created_at: number;
  updated_at: number;
  project_data: HarvestProject;
}

export interface DexieShotRecord extends ShotRecord {
  id: string; // `${project_id}_${shot_id}`
}

export interface DexieSlideRecord extends SlideHarvestRecord {
  id: string; // `${project_id}_${slide_id}`
  project_id: string;
}

export interface DexieFrameBlob {
  id: string;
  project_id: string;
  blob: Blob;
  mime_type: string;
  created_at: number;
}

export interface DexieJobRecord {
  id: string;
  project_id: string;
  type: 'video_analysis' | 'slide_analysis' | 'zip_export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_pct: number;
  status_msg: string;
  error?: string;
  created_at: number;
  updated_at: number;
}

export interface DexieVaultAssetRecord extends AssetRecord {
  // Backwards-compatible aliases for legacy indexed fields
  project_id?: string;
  shot_id?: string;
  asset_kind?: string;
  rights_status?: string;
  production_eligible?: boolean;
}

export class ClarioDexieDatabase extends Dexie {
  projects!: Table<DexieProjectRecord, string>;
  shots!: Table<DexieShotRecord, string>;
  slides!: Table<DexieSlideRecord, string>;
  frameBlobs!: Table<DexieFrameBlob, string>;
  jobs!: Table<DexieJobRecord, string>;
  vaultAssets!: Table<DexieVaultAssetRecord, string>;

  constructor() {
    super('ClarioDexieDB');

    this.version(1).stores({
      projects: 'id, name, mode, created_at, updated_at',
      shots: 'id, project_id, shot_id, content_type, source_type, license_status, confidence',
      slides: 'id, project_id, slide_id, slide_index',
      frameBlobs: 'id, project_id, created_at',
      jobs: 'id, project_id, status, created_at',
    });

    this.version(2).stores({
      projects: 'id, name, mode, created_at, updated_at',
      shots: 'id, project_id, shot_id, content_type, source_type, license_status, confidence',
      slides: 'id, project_id, slide_id, slide_index',
      frameBlobs: 'id, project_id, created_at',
      jobs: 'id, project_id, status, created_at',
      vaultAssets: 'id, project_id, shot_id, asset_kind, rights_status, production_eligible, title, created_at, updated_at',
    });

    this.version(3).stores({
      projects: 'id, name, mode, created_at, updated_at',
      shots: 'id, project_id, shot_id, content_type, source_type, license_status, confidence',
      slides: 'id, project_id, slide_id, slide_index',
      frameBlobs: 'id, project_id, created_at',
      jobs: 'id, project_id, status, created_at',
      vaultAssets: 'id, projectId, project_id, shotId, shot_id, assetKind, asset_kind, rightsStatus, rights_status, productionEligible, production_eligible, title, createdAt, updatedAt',
    });
  }
}

export const db = new ClarioDexieDatabase();
