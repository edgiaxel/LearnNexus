# Handoff - M2 Supabase Schema, Seed, Auth, and Data Repositories

- **Branch / Worktree:** `feature/m2-supabase-data` (`subagent-DB-wt-f7ae11a8`)
- **Owner:** Lane A (Supabase Schema, Seed, RLS, Auth & Academic Data Services)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `supabase/migrations/20261126000001_m2_core_schema.sql` - Created core Postgres tables (`profiles`, `classes`, `class_members`, `teams`, `team_members`, `projects`, `tasks`, `resources`, `workspace_layouts`), `set_updated_at()` and `handle_new_user()` triggers, security-definer helper functions, least-privilege grants (`GRANT UPDATE (status) ON public.tasks`), and authenticated-only RLS policies.
- `supabase/seed.sql` - Created idempotent `ON CONFLICT` seed script with deterministic UUIDs for 3 demo users (`auth.users`, `auth.identities`, `public.profiles`), 2 classes (`IF-4031`, `IF-3210`), class memberships (Rani unassigned), 2 teams (`Team SibukTA`, `Team Studio B`), 2 projects, 8 tasks (including `NULL` assignee and `NULL` due date cases), 6 HTTPS resources, and 2 workspace layouts.
- `src/services/errorMapper.ts` - Created `createAppError` and `mapSupabaseError` normalizing Auth, PostgREST, Postgres, and network/fetch failures into non-empty `AppError` objects.
- `src/services/authService.ts` - Created `SupabaseAuthRepository` and exported `authService` implementing `AuthRepository` via real `supabase.auth` sessions and `public.profiles` reads.
- `src/services/academicService.ts` - Created `SupabaseAcademicRepository` and exported `academicService` implementing all 7 `AcademicRepository` methods directly against Supabase Postgres tables under RLS.
- `src/services/HANDOFF.md` - Documented Lane A deliverables, verification results, and integration notes.

## Exported Entry Points / Contracts
- `src/services/errorMapper.ts`: `createAppError`, `mapSupabaseError`
- `src/services/authService.ts`: `SupabaseAuthRepository`, `authService: AuthRepository`
- `src/services/academicService.ts`: `SupabaseAcademicRepository`, `academicService: AcademicRepository`

## Database / Environment Changes
- Migration added: `supabase/migrations/20261126000001_m2_core_schema.sql`
- Seed script added: `supabase/seed.sql`
- Env vars referenced via `src/lib/supabase.ts` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, zero secrets committed).
- Note: Per Phase 2 worktree instructions, SQL migrations and seed were NOT executed against remote Supabase from this worktree; Main Orchestrator will audit and push them in Phase 3.

## Zero-Mock & Verification Evidence
- Zero mock fallback datasets or in-memory auth bypasses exist in `src/services/authService.ts` or `src/services/academicService.ts`.
- `signInAsDemoProfile(demoKey)` resolves the descriptor email from `DEMO_PROFILE_DESCRIPTORS` and calls real `signInWithPassword`.
- `updateTaskStatus(taskId, status)` returns an error if 0 rows are returned (e.g., missing record or RLS rejection) and returns `{ ok: true, data }` only after Postgres returns the updated row.
- Verification commands run:
  - `npm ci --prefer-offline` (passed: added 99 packages cleanly)
  - `npm run typecheck` (`tsc --noEmit`): passed with exit code 0

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, root `HANDOFF.md`, `HANDOFF_TEMPLATE.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/*`, `src/lib/supabase.ts`, `package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] No duplicate navbars, global layouts, or custom theme overrides (service/SQL lane only)
- [x] Not applicable for UI components in this lane; error messages are concise, accessible, and clear
- [x] Zero em dashes (`\u2014`) in SQL comments, seed descriptions, error messages, and handoff prose

## Caveats & Next Steps
- Remote Supabase schema push and seed execution (`supabase/migrations/20261126000001_m2_core_schema.sql` and `supabase/seed.sql`) must be run by the Main Orchestrator in Phase 3 before live browser E2E checks.
- Live RLS isolation checks (Nadia vs. Bima vs. Rani, plus `anon` zero-access verification) should be executed once the migration and seed are applied to the target Supabase instance.
