# Handoff: M3 Auth, Services, and RLS Hardening (Lane 1)

- **Branch / Worktree:** `feature/m3-auth-rls-hardening` (based on `395d1ab`)
- **Owner:** Lane 1 Subagent (`src/services/**`, `supabase/**`, `tests/rls/**`)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `src/services/authService.ts` - Implemented `onAuthStateChange` on `SupabaseAuthRepository` subscribing to `supabase.auth.onAuthStateChange` and forwarding only `'SIGNED_IN'`, `'SIGNED_OUT'`, and `'TOKEN_REFRESHED'` with `Boolean(session)`, returning a clean unsubscribe function (or no-op when `supabase` is unconfigured).
- `src/services/academicService.ts` - Added pre-mutation `client.auth.getSession()` check in `updateTaskStatus` returning `createAppError('auth', 'Your authentication session has expired. Please sign in again.', false)` when `sessionError` or `!sessionData.session` occurs; added defensive `normalizeWorkspaceConfigJson` handling in `getWorkspaceLayout` while keeping `{ ok: true, data: null }` when no layout row exists.
- `tests/rls/verify-rls.mjs` - Added zero-dependency ESM live Postgres RLS and column-grant verification script reading `.env` from `process.cwd()` without printing secrets and verifying all 4 actors (`anon`, `nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu`).
- `src/services/HANDOFF.md` - Lane 1 handoff report.

## Exported Entry Points / Contracts
- `SupabaseAuthRepository.prototype.onAuthStateChange(handler: (event: AuthStateChangeEvent, hasSession: boolean) => void): () => void` (matches `AuthRepository` in `src/types/database.ts`).
- `SupabaseAcademicRepository.prototype.updateTaskStatus(taskId, status)` and `SupabaseAcademicRepository.prototype.getWorkspaceLayout(teamId)` (matches `AcademicRepository` in `src/types/database.ts`).
- `tests/rls/verify-rls.mjs` (executable via `node tests/rls/verify-rls.mjs` or `npm run test:rls` once wired in `main` `package.json`).

## Database / Environment Changes
- Migrations added under `supabase/migrations/`: `None` (uses existing `20261126000001_m2_core_schema.sql` and `supabase/seed.sql` on `zftymjkcrdkhtshazzmw`).
- Env vars referenced: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (read from local `.env` in `tests/rls/verify-rls.mjs`, matching `.env.example`; zero secrets committed or logged).

## Zero-Mock & Verification Evidence
- All service methods continue targeting real Supabase Auth and Postgres RLS endpoints with zero mock data or fallback payloads.
- `npm run typecheck` (`tsc --noEmit`): **PASS** (exit `0`).
- `npm run build` (`tsc --noEmit && vite build`): **PASS** (exit `0`, `94 modules transformed`).
- `node --check tests/rls/verify-rls.mjs`: **PASS** (exit `0`).
- `node tests/rls/verify-rls.mjs` (in worktree without `.env`): failed cleanly as expected with exit `1` and non-secret message `FAIL: Missing .env file in current working directory...`.

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, root `HANDOFF.md`, `HANDOFF_TEMPLATE.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/*`, `public/assets/*`, `src/lib/supabase.ts`, `package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] Zero edits to peer lane folders (`src/components/**`, `tests/e2e/**`, `tests/unit/**`)
- [x] No duplicate navbars, global layouts, or custom theme overrides (service and RLS layer only)
- [x] Zero em dashes (`\u2014`) or decorative emoji in touched files; zero secrets logged or committed

## Caveats & Next Steps
- `.env` is gitignored and absent in this isolated worktree, so live execution of `tests/rls/verify-rls.mjs` against `zftymjkcrdkhtshazzmw` must run in Phase 3 from `main` (via `npm run test:rls`) where `.env` is present.
- `package.json` was left untouched per central file ownership rules; Phase 3 integration on `main` should add `"test:rls": "node tests/rls/verify-rls.mjs"` if not yet added.
