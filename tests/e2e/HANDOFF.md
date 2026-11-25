# Handoff: M3 Persistence, Error Resilience, and Guard Unit Tests

- **Branch / Worktree:** `feature/m3-persistence-e2e` (`subagent-QA-wt-9ce8d64e`)
- **Owner:** Lane 3 (Persistence, Resilience, and Guard Verification)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged at `395d1ab`)

## Files Touched
- `tests/e2e/m3-persistence-and-resilience.spec.ts` - Added M3 E2E specs covering cross-user persistence across fresh browser contexts (`Nadia -> Bima -> Nadia` + RLS isolation), PATCH 500 save-failure resilience (`task-unsaved-badge-*`, `task-revert-btn-*`, `task-retry-btn-*`, reload durability), GET 500 fetch-failure recovery on Retry across Spaces, Overview, Tasks, and Resources, and `workspace-layout-meta` / `demo-data-badge` / `panel-refresh-btn` verification.
- `tests/e2e/m2-student-journey.spec.ts` - Updated `trackRuntimeIssues` to accept `allowedConsoleSubstrings` and updated Test 1 (`UI-01`) to assert `pageErrors` is strictly `[]` and ignore only the expected HTTP 400 invalid-credentials console log via `assertNoErrors()`.
- `tests/unit/m3-guards.test.ts` - Added zero-dependency Node 24 (`node:test` + `node:assert/strict`) unit tests for `mapSupabaseError`, `createAppError`, `canTransitionRoute`, `getTwoLetterInitials`, and `formatDisplayDate`.
- `tests/e2e/HANDOFF.md` - Lane 3 integration handoff report.

## Exported Entry Points / Contracts
- E2E suite `tests/e2e/m3-persistence-and-resilience.spec.ts` (4 tests using `signInAsDemoAndEnterStudio`, `waitForGameReady`, and `trackErrors`).
- E2E regression update in `tests/e2e/m2-student-journey.spec.ts` (`trackRuntimeIssues(page, allowedConsoleSubstrings)`).
- Unit test suite `tests/unit/m3-guards.test.ts` (3 suites, 9 test cases importing `src/services/errorMapper.ts`, `src/app/routerContract.ts`, and `src/components/workstation/workstationUtils.ts` with `.ts` extensions).

## Database / Environment Changes
- None.
- Seeded deterministic IDs referenced in E2E assertions:
  - `PERSISTENCE_TASK_ID = '55555555-5555-4555-8555-555555555503'`
  - `REPO_RESOURCE_ID = '66666666-6666-4666-8666-666666666601'`

## Zero-Mock & Verification Evidence
- All persistence E2E flows execute against real Supabase Auth and Postgres RLS across separate `browser.newContext()` sessions and full page reloads, restoring task `PERSISTENCE_TASK_ID` back to `'todo'`.
- Failure-injection tests use Playwright `page.route` to simulate HTTP 500 database responses, verify honest inline error and unsaved state retention, unroute, and confirm live Supabase Postgres recovery on Retry.
- Commands run in worktree after final edits:
  - `npm run typecheck` (`tsc --noEmit`): **PASS** (exit code `0`).
  - `node --test tests/unit/m3-guards.test.ts`: **PASS** (9/9 tests passed across 3 suites, 0 failed, 0 skipped).
  - `npm run test:e2e`: **Not run in Lane 3 worktree** (deferred to Phase 3 integration on `main` once Lane 1 `feature/m3-auth-rls-hardening` and Lane 2 `feature/m3-panel-resilience` are merged).

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, root `HANDOFF.md`, `HANDOFF_TEMPLATE.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/*`, `src/lib/*`, `package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] Zero edits to Lane 1 (`src/services/**`, `supabase/**`, `tests/rls/**`) or Lane 2 (`src/components/**`) folders
- [x] No duplicate navbars, global layouts, or custom theme overrides
- [x] Zero literal em dashes (`\u2014`) or decorative emoji in authored test files or handoff copy
- [x] `npm run typecheck` and `node --test tests/unit/m3-guards.test.ts` pass cleanly after final edits

## Caveats & Next Steps
- **Phase 3 Integration Unit Test Follow-up:** Add unit tests for `parseSafeHttpUrl` in `tests/unit/m3-guards.test.ts` in Phase 3 after Lane 2 (`feature/m3-panel-resilience`) merges `parseSafeHttpUrl` into `src/components/workstation/workstationUtils.ts`.
- **Spaces Fault-Injection Route Pattern:** Test 3 in `tests/e2e/m3-persistence-and-resilience.spec.ts` intercepts `**/rest/v1/class*` (`GET`) because `academicService.getMyAcademicSpaces()` queries `class_members` with an embedded `classes(...)` select (`/rest/v1/class_members?...`); using `**/rest/v1/class*` covers both `class_members` and direct `classes` queries cleanly before unrouting on `spaces-retry-btn`.
- **Phase 3 Full Verification:** Run `npm run test:e2e` against integrated `main` (with live Supabase) to execute `m2-student-journey.spec.ts` and `m3-persistence-and-resilience.spec.ts` end-to-end.
