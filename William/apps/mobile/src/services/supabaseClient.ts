/**
 * supabaseClient.ts
 *
 * ⚠️  DEPRECATED — Mobile app no longer connects directly to Supabase.
 *
 * All database access is routed through the BrainGateway Express server at port 3005.
 * Data flow: Mobile App → Express Server → Supabase
 *
 * The direct Supabase client has been removed to:
 *  1. Eliminate exposure of the anon key on the client device
 *  2. Enforce server-side business logic for all DB operations
 *  3. Allow RLS and service-role policies to be correctly applied
 *
 * If you need to access any data, use the functions in:
 *  → apps/mobile/src/services/dbService.ts
 */

export {};
