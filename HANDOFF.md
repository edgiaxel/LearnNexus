# Handoff — M3: Persistent Student Workspace

- **Branch / Worktree:** `main` (merged `feature/m3-auth-rls-hardening`, `feature/m3-panel-resilience`, and `feature/m3-persistence-e2e` via `--no-ff`, removed all temporary subagent worktrees and local feature branches)
- **Owner:** Main Orchestrator (with isolated DB, WS, and QA worktrees)
- **Linked Contract:** `UI_CONTRACT.md` (Locked M0/M2/M3 contracts on `main`)
- **Date:** 26 November 2026

## Completed Scope & Exit Criteria

- **Shared M3 Contracts (`UI_CONTRACT.md`, `src/types/database.ts`, `src/types/components.ts`):**
  - Added `AuthStateChangeEvent` (`'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'`) and required `onAuthStateChange` subscription to `AuthRepository`.
  - Added optional M3 component props (`sessionNotice`, `isDemoSession`, `onSessionExpired`) and locked `data-testid` hooks (`entry-session-notice`, `panel-refresh-btn`, `demo-data-badge`, `task-unsaved-badge-<id>`, `task-retry-btn-<id>`, `task-revert-btn-<id>`, `workspace-layout-meta`).
- **Auth Lifecycle & RLS Hardening (`src/services/**`, `tests/rls/verify-rls.mjs`):**
  - Implemented `SupabaseAuthRepository.prototype.onAuthStateChange` wrapping `supabase.auth.onAuthStateChange` with clean unsubscribe cleanup.
  - Added pre-mutation `client.auth.getSession()` guard in `academicService.updateTaskStatus` so expired sessions emit `code: 'auth'` rather than misleading `forbidden` errors, plus defensive `normalizeWorkspaceConfigJson` handling in `getWorkspaceLayout`.
  - Added zero-dependency live Postgres RLS verification script `tests/rls/verify-rls.mjs` (`npm run test:rls`) proving 4-actor isolation (`anon`, `nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu`) and column-level `GRANT UPDATE (status)` restrictions (`42501` on `title`, `INSERT`, `DELETE`).
- **Workstation Panel Resilience & Unsaved State UX (`src/components/**`, `src/app/App.tsx`):**
  - Extracted pure `parseSafeHttpUrl` and `ParsedSafeHttpUrl` into `src/components/workstation/workstationUtils.ts` (re-exported by `ResourceLibraryPanel.tsx`) so Node 24 native tests run without JSX transforms.
  - Updated `TasksSprintBoardPanel.tsx` with per-task `savingStatusByTaskId` and `failedSaveByTaskId` maps: failed writes preserve the attempted `<select>` selection alongside the persisted status badge/counts, surface `Unsaved change` (`task-unsaved-badge-<id>`), inline `Retry save` (`task-retry-btn-<id>`), and `Revert` (`task-revert-btn-<id>`), and never show `All changes saved` while failures exist.
  - Added shared `PanelContextHeader` (`demo-data-badge` `Seeded Demo Data` when `isDemoSession` + `panel-refresh-btn` `Refresh`) across `ProjectOverviewPanel`, `TasksSprintBoardPanel`, and `ResourceLibraryPanel`, plus `onSessionExpired` forwarding across panels and `AcademicSpacesSelector`.
  - Wired `App.tsx` to subscribe to `authService.onAuthStateChange`, display `entry-session-notice` in `EntryGateway` on unexpected session expiry, pass `isDemoSession`, and load/display `workspace_layouts` metadata in `workspace-layout-meta`.
- **Automated Verification Suites (`tests/unit/**`, `tests/e2e/**`):**
  - Added `tests/unit/m3-guards.test.ts` (`npm run test:unit`: `11/11` passing across `mapSupabaseError`, `canTransitionRoute`, `workstationUtils`, `parseSafeHttpUrl`).
  - Added `tests/e2e/m3-persistence-and-resilience.spec.ts` proving clean `browser.newContext()` cross-user persistence (`Nadia -> Bima -> Nadia` + `IF-3210` RLS isolation), HTTP 500 `PATCH` save-failure `Unsaved change` / `Revert` / `Retry save` durability, HTTP 500 `GET` fetch-failure recovery across Spaces/Overview/Tasks/Resources, and `workspace-layout-meta` / `demo-data-badge` / `panel-refresh-btn`.
  - Tightened `tests/e2e/m2-student-journey.spec.ts` Test 1 (`UI-01`) to assert empty `pageErrors`.

## Files Touched

- Central Contracts & Shell: `UI_CONTRACT.md`, `package.json`, `src/types/database.ts`, `src/types/components.ts`, `src/app/App.tsx`
- Services & RLS Verification: `src/services/authService.ts`, `src/services/academicService.ts`, `tests/rls/verify-rls.mjs`
- Components: `src/components/entry/EntryGateway.tsx`, `src/components/campus/AcademicSpacesSelector.tsx`, `src/components/workstation/WorkstationPanel.tsx`, `src/components/workstation/ProjectOverviewPanel.tsx`, `src/components/workstation/TasksSprintBoardPanel.tsx`, `src/components/workstation/ResourceLibraryPanel.tsx`, `src/components/workstation/PanelStateCards.tsx`, `src/components/workstation/workstationUtils.ts`
- Unit, E2E & Docs: `tests/unit/m3-guards.test.ts`, `tests/e2e/m2-student-journey.spec.ts`, `tests/e2e/m3-persistence-and-resilience.spec.ts`, `HANDOFF.md`, `README.md`, `docs/MILESTONES.md`, `docs/CHANGELOG.md`, `docs/DESIGN.md`, `docs/PROJECT_AUDIT.md`

## Verified Commands & Results

- `npm run typecheck` (`tsc --noEmit`): **PASS** (exit `0`)
- `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts`): **PASS** (`11/11` tests across `4` suites, `0` failed, `0` skipped)
- `npm run test:rls` (`node tests/rls/verify-rls.mjs`): **PASS** (`anon` blocked `42501` on 9/9 tables; `Nadia` reads 2 classes / 2 projects / 8 tasks / 6 resources / 2 layouts, updates & restores `status`, blocked `42501` on `title`/`INSERT`/`DELETE`; `Bima` reads only `IF-4031`, updates & restores `status`, `0` rows on `IF-3210` update, blocked `42501` on `title`; `Rani` reads `0` rows across all 8 academic tables & `0` rows cross-team update)
- `npm run build` (`tsc --noEmit && vite build`): **PASS** (exit `0`, `94` modules transformed)
- Static antislop scan (`src/`, `supabase/`, `tests/`): `0` em dashes (`\u2014`) outside locked `src/styles/index.css:1` header comment; `0` `animate-pulse` / `animate-bounce` loops
- `npm run test:e2e` (`playwright test`): **PASS** (`18 passed (1.2m)` across M1, M2, M2.5, and M3 specs)

## Database & Environment State

- Remote project: `zftymjkcrdkhtshazzmw` (`ap-southeast-1`) running migration `20261126000001_m2_core_schema` and seeded demo records (`nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu`; task `55555555-5555-4555-8555-555555555503` restored cleanly to `'todo'`).
- Local `.env`: gitignored (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); zero secrets in source, tests, or git history.

## Caveats & Next Steps (M4 Readiness)

- **Caveat (Bundle Size):** Vite production build reports `dist/assets/index-*.js` at `~2.03 MB` due to Phaser 3; evaluate manual vendor chunking in M4 if needed.
- **Caveat (Filtered Console Logs in Negative Tests):** M2 Test 1 filters the expected Supabase `/auth/v1/token` HTTP `400` log and M3 Tests 2-3 filter the injected HTTP `500` resource console log while strictly asserting `0` uncaught `pageErrors` and `0` unexpected console errors across all 18 tests.
- **Next Steps (M4 Quality & Integration):** Complete P0 acceptance checklist audit against `PRD.md` (`F-001`–`F-009`), secrets/bundle review, desktop/laptop demo rehearsal, and M5 deployment + submission package before 30 Nov 2026, 23:59 WIB.
