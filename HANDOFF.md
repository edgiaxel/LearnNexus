# Handoff — M2 & M2.5: Core Workflow, Cozy Academic Space & Design Alignment

- **Branch / Worktree:** `main` (merged `feature/m2-supabase-data`, `feature/m2-entry-spaces`, and `feature/m2-workstation-panels` via `--no-ff`, removed all temporary subagent worktrees and local feature branches)
- **Owner:** Main Orchestrator (with isolated DB, UI, and WS worktrees)
- **Linked Contract:** `UI_CONTRACT.md` (Locked M0/M2 contracts on `main`)
- **Date:** 26 November 2026

## Completed Scope & Exit Criteria

- **Phase 1 Shared Contracts (`main`):** Locked `DemoProfileKey`, `DEMO_PROFILE_DESCRIPTORS`, `TeamMemberSummary`, and extended `StudentProfile`, `ProjectOverview`, `ResourceItem` in `src/types/contracts.ts`; locked `AuthRepository` and updated row shapes in `src/types/database.ts`; locked component prop contracts in `src/types/components.ts`; documented `MOTION 1` static skeleton rule and `data-testid` contract in `UI_CONTRACT.md`.
- **Supabase Schema, RLS & Seed (`supabase/**`, `zftymjkcrdkhtshazzmw`):**
  - Applied `supabase/migrations/20261126000001_m2_core_schema.sql` (9 relational tables, `set_updated_at()` and `handle_new_user()` triggers, `SECURITY DEFINER` membership helpers, `REVOKE ALL` from `anon, authenticated`, `GRANT SELECT` + column-scoped `GRANT UPDATE (status)` on `tasks` to `authenticated`, zero policies for `anon`).
  - Applied idempotent `supabase/seed.sql` creating 3 fictional demo accounts (`nadia.demo@learnnexus.edu` / `team_lead`, `bima.demo@learnnexus.edu` / `student`, `rani.demo@learnnexus.edu` / `guest_demo` unassigned), 2 classes (`IF-4031`, `IF-3210`), 2 teams (`Team SibukTA`, `Team Studio B`), 2 projects, 8 sprint tasks (including intentional `NULL` assignee and `NULL` due date cases), 6 HTTPS resources, and 2 workspace layouts.
- **Typed Supabase Services (`src/services/**`):** Implemented `errorMapper.ts`, `authService.ts` (`SupabaseAuthRepository` using real `supabase.auth.signInWithPassword` for both Credentials and Demo Mode), and `academicService.ts` (`SupabaseAcademicRepository`) with zero mock fallbacks.
- **Cozy Digital Campus Views (`src/components/**` & `src/app/App.tsx`):**
  - `EntryGateway.tsx` (UI-01): asymmetric 2-column layout, honest `"Demo Mode (Live Supabase Postgres)"` selector, credentials login with password visibility toggle, calm validation/error banners.
  - `AcademicSpacesSelector.tsx` (UI-02): live course directory, static `#EEF1E8` skeleton loader, unassigned empty state (`Rani Kusuma (Demo)`), error retry banner, studio workspace entry.
  - `WorkstationPanel.tsx`, `ProjectOverviewPanel.tsx` (UI-05), `TasksSprintBoardPanel.tsx` (UI-06), `ResourceLibraryPanel.tsx` (UI-07): focus-trapped `440px` right drawer, live overview + team roster, task status filter tabs & Postgres-confirmed task status updates, resource category tabs & strict `http:`/`https:` URL safety validation (`parseSafeHttpUrl`).
  - `App.tsx`: single `<header>` top bar, dynamic breadcrumbs, session bootstrap/restore via `sessionStorage` class pointer (`learnnexus:selectedClassId`), `Leave Studio` / `Sign Out`, M1 Phaser studio preserved, compact mobile quick-workstation controls (`mobile-workstation-btn-*`).
- **M2.5 Design & Rendering Alignment:** Enforced Cozy Digital Campus palette (`#F7F4EC`, `#FFFFFF`, `#EEF1E8`, `#4A6B46`, `#30343B`), `ENERGY 1 / RHYTHM 2 / MOTION 1` (zero `animate-pulse` loops, zero em dashes, zero decorative emoji), ADR-012 `16px` Config A sharp canvas rendering (`1x` and `2x` HiDPI), and responsive zero-overflow layout across `1280x720`, `1024x700`, and `390x844`.

## Files Touched

- Contracts & Shell: `UI_CONTRACT.md`, `src/types/contracts.ts`, `src/types/database.ts`, `src/types/components.ts`, `src/app/App.tsx`
- Database & Services: `supabase/migrations/20261126000001_m2_core_schema.sql`, `supabase/seed.sql`, `src/services/errorMapper.ts`, `src/services/authService.ts`, `src/services/academicService.ts`
- Components: `src/components/entry/EntryGateway.tsx`, `src/components/campus/AcademicSpacesSelector.tsx`, `src/components/workstation/WorkstationPanel.tsx`, `src/components/workstation/ProjectOverviewPanel.tsx`, `src/components/workstation/TasksSprintBoardPanel.tsx`, `src/components/workstation/ResourceLibraryPanel.tsx`, `src/components/workstation/PanelStateCards.tsx`, `src/components/workstation/workstationUtils.ts`
- E2E Tests & Docs: `tests/e2e/helpers/authFlow.ts`, `tests/e2e/m2-student-journey.spec.ts`, `tests/e2e/phaser-lifecycle.spec.ts`, `tests/e2e/workstation-bridge.spec.ts`, `HANDOFF.md`, `README.md`, `docs/MILESTONES.md`, `docs/CHANGELOG.md`, `docs/DESIGN.md`, `docs/PROJECT_AUDIT.md`

## Verified Commands & Results

- `npm run typecheck` (`tsc --noEmit`): **PASS** (exit `0`)
- `npm run build` (`tsc --noEmit && vite build`): **PASS** (exit `0`, `94 modules transformed`)
- Live Supabase Auth & RLS Node Verification (`zftymjkcrdkhtshazzmw`): **PASS** (`anon` blocked with `42501` and `0` rows; Nadia reads 2 classes / 5 tasks / 4 resources and updates/restores task status with `updated_at` update; Rani sees `0` rows across all tables and `0` rows updated cross-team; bad password rejected `400 invalid_credentials`).
- `npm run test:e2e` (`playwright test`): **PASS** (`14 passed (48.7s)` covering M2 student journey, reload + leave-and-return persistence, RLS empty state, M1 Phaser lifecycle, `1x` + `2x` HiDPI ADR-012 sharpness, `1280x720` / `1024x700` / `390x844` responsiveness, keyboard walking, `[E]` / `Tab`-trap / `Escape`, and compact mobile drawer).
- Contrast & Static Antislop Checks: All foreground/background pairs pass WCAG AA (`4.5:1+`) / 1.4.11 (`4.21:1` border); `0` em dashes (`\u2014`) and `0` `animate-pulse`/`animate-bounce` across `src/` and `supabase/`.

## Database & Environment State

- Remote project: `zftymjkcrdkhtshazzmw` (`ap-southeast-1`) has migration `20261126000001_m2_core_schema` applied and recorded in `supabase_migrations.schema_migrations`, with idempotent demo seed active.
- Local `.env`: gitignored (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); zero secrets in source or git history.
- Demo accounts (seeded fictional profiles; real Supabase Auth): `nadia.demo@learnnexus.edu` (`Team Leader`, 2 classes), `bima.demo@learnnexus.edu` (`Team Member`, 1 class), `rani.demo@learnnexus.edu` (`Guest`, 0 classes).

## Caveats & Next Steps (M3/M4 Readiness)

- **Caveat (Test 1 invalid-credentials console log):** In `tests/e2e/m2-student-journey.spec.ts` Test 1 (`UI-01`), intentionally submitting an invalid password triggers Supabase Auth HTTP `400` in browser console (`Failed to load resource`), so `assertNoErrors` is skipped in that test while all remaining 13 tests assert strict `0` console errors and `0` page errors.
- **Caveat (Bundle size):** Production JS bundle is `~2.02 MB` due to Phaser 3; optional chunk splitting belongs to M4.
- **Next Steps (M3 / M4):** Verify `bima.demo@learnnexus.edu` (`student`) write/isolation behavior, add Playwright negative tests for simulated save-failure / network-offline error recovery UI, audit resource URLs and RLS matrix, and prepare M5 deployment + submission package before 30 Nov 2026, 23:59 WIB.
