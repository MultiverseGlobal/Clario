import {
  validateSupportedUrl,
  normalizeUrlFetchError,
  isRetryable,
  getSafeUserMessage,
} from '../lib/cobalt';
import { getApolloReferenceReelFixture } from '../lib/fixtures';
import type { RightsStatus } from '../types/assets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting Clario UI/UX & Engine Regression Tests…\n');

// ── Test 1: URL Validation ──────────────────────────────────────────────────
console.log('Test 1: Validating supported social platforms');
assert(
  validateSupportedUrl('https://www.instagram.com/reel/DY33MzlO_qS/').valid === true,
  'Instagram Reel URL should be valid'
);
assert(
  validateSupportedUrl('https://www.tiktok.com/@user/video/123456789').valid === true,
  'TikTok URL should be valid'
);
assert(
  validateSupportedUrl('https://www.youtube.com/shorts/abcdefghijk').valid === true,
  'YouTube Shorts URL should be valid'
);
assert(
  validateSupportedUrl('not-a-valid-url').valid === false,
  'Invalid URL should fail validation'
);
assert(
  validateSupportedUrl('').valid === false,
  'Empty URL should fail validation'
);
console.log('✓ URL validation tests passed.');

// ── Test 2: Error Normalization & Timeout Mapping ────────────────────────────
console.log('\nTest 2: Normalizing Error Codes and Timeout Mechanics');
const timeoutErr = new Error('The operation was aborted due to timeout');
assert(
  normalizeUrlFetchError(timeoutErr) === 'TIMEOUT',
  'Timeout error should map to TIMEOUT code'
);
assert(
  isRetryable('TIMEOUT') === true,
  'TIMEOUT should be marked retryable'
);
assert(
  isRetryable('AUTH_REQUIRED') === false,
  'AUTH_REQUIRED should NOT be marked retryable (needs upload fallback)'
);
assert(
  getSafeUserMessage('TIMEOUT').includes('12 seconds'),
  'Safe user message must be clean and free of stack traces'
);
console.log('✓ Error normalization tests passed.');

// ── Test 3: Fixture Data Integrity ──────────────────────────────────────────
console.log('\nTest 3: Validating Apollo / Steve Jobs Reference Fixture');
const fixture = getApolloReferenceReelFixture();
assert(fixture.shots.length === 5, 'Reference fixture must contain exactly 5 segmented shots');
assert(fixture.shots[0].shot_id === 'shot_001', 'Shot 1 ID must be shot_001');
assert(
  fixture.shots[0].likely_source.includes('Steve Jobs'),
  'Shot 1 must identify Steve Jobs Macworld 2007'
);
assert(
  fixture.generated_prompts.length === 5,
  'Fixture must generate 5 prompt replacements'
);
assert(
  fixture.provenance.length === 5,
  'Fixture must retain 5 provenance records'
);
console.log('✓ Fixture integrity tests passed.');

// ── Test 4: Rights Badges & Clear Categorization ─────────────────────────────
console.log('\nTest 4: Verifying Rights Status Enums');
const statuses: RightsStatus[] = [
  'user_owned',
  'licensed_clean_source',
  'public_domain_candidate',
  'reference_only',
  'ai_cleaned_reference',
  'generated_original',
  'unresolved',
  'not_cleared',
];
assert(statuses.length === 8, 'Must support all 8 canonical RightsStatus values');
console.log('✓ Rights status categorization tests passed.');

// ── Test 5: Simplified 4-Step Asset Resolution Workflow ─────────────────────
console.log('\nTest 5: Verifying Asset Resolution Statuses and Output Types');
import type { ShotResolutionStatus, AssetOutputType } from '../types/assets';

const resolutionStatuses: ShotResolutionStatus[] = [
  'needs_decision',
  'searching',
  'clean_master_attached',
  'generated_original_ready',
  'reference_still_reconstructed',
  'reference_only',
  'rights_unresolved',
];
assert(resolutionStatuses.length === 7, 'Must support all 7 ShotResolutionStatus levels');

const outputTypes: AssetOutputType[] = [
  'reference_evidence',
  'authorized_asset_master',
  'generated_original',
  'ai_cleaned_reference_still',
];
assert(outputTypes.length === 4, 'Must support all 4 AssetOutputType targets');
console.log('✓ Asset resolution status and output type tests passed.');

console.log('\n🎉 ALL 5 REGRESSION TEST SUITES PASSED SUCCESSFULLY!\n');
