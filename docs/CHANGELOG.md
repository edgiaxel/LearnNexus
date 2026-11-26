# Changelog

Notable, meaningful changes to LearnNexus are documented here.

This file records completed work only. Planned features and unfinished tasks belong in `docs/MILESTONES.md` or GitHub Issues.

## [Unreleased]

### Added
- Added Pre-M4 Scoped M6 + M9 Prototype Showcase contracts across `UI_CONTRACT.md`, `src/types/contracts.ts`, `src/types/database.ts`, `src/types/components.ts`, `src/types/gameDebug.ts`, and `src/app/routerContract.ts` (`'whiteboard'` / `UI-08b`, realtime presence/broadcast/bubble contracts, chat/whiteboard/activity records, and full CRUD payloads).
- Added live Supabase migration `supabase/migrations/20261126000002_m6_m9_collab_pm.sql` (and matching `supabase/seed.sql` notes): granted team-member CRUD policies on `projects`/`tasks`/`resources` with `resources_url_http_check`, created `room_messages`, `whiteboard_notes`, `whiteboard_strokes`, and trigger-populated `activity_logs` (`log_project_activity()`), and enabled `REPLICA IDENTITY FULL` + `supabase_realtime` publication across 7 tables on remote project `zftymjkcrdkhtshazzmw`.
- Implemented `src/services/realtimeService.ts` (`connectStudioRoom`, Presence, `80ms`-throttled Broadcast, `postgres_changes` + `workspace:sync` fallback), `src/services/realtimeUtils.ts`, and 18 live Supabase CRUD/chat/whiteboard/activity methods in `src/services/academicService.ts`.
- Extended `src/game/maps/campusStudioMap.json` (`chalkboard_sprint` `whiteboard-board`), `src/game/scenes/CampusScene.ts`, and `src/game/PhaserHost.tsx` with `NEAREST`-filtered `adam`/`alex`/`amelia`/`bob` spritesheets, interpolated remote avatars + crisp nametags, 64px soft-sage proximity rings (`avatar:proximity-peers`), 5s floating `avatar:chat-bubble` pills, and `ui:input-focus` keyboard capture suspension.
- Upgraded `ProjectOverviewPanel.tsx` (inline brief editing, `"In studio"` roster status, trigger-backed `Recent Activity`), `TasksSprintBoardPanel.tsx` (sprint progress bar, create/edit/two-step delete, team roster assignee select, due date), `ResourceLibraryPanel.tsx` (add/two-step delete with `http(s)` validation), and created `WhiteboardPanel.tsx` (`480x260` sketch canvas + pastel sticky notes) and `StudioCollaborationBar.tsx` (live occupancy + persisted room chat drawer).
- Expanded repeatable test coverage: `tests/rls/verify-rls.mjs` (4-actor RLS checks across 13 tables), `tests/unit/m6-m9-guards.test.ts` (`17/17` total unit tests), and `tests/e2e/m6-m9-realtime-and-pm.spec.ts` (`22/22` total Playwright E2E specs passing, including concurrent multi-user session sync).
- Added M3 auth lifecycle and persistence hardening: `AuthStateChangeEvent` and `onAuthStateChange` on `AuthRepository`/`SupabaseAuthRepository`, pre-mutation `getSession()` expiry guard in `academicService.updateTaskStatus`, and `sessionNotice` / `onSessionExpired` handling across `App.tsx`, `EntryGateway.tsx`, `AcademicSpacesSelector.tsx`, and `WorkstationPanel.tsx`.
- Added per-task concurrent save and failure-preservation maps (`savingStatusByTaskId`, `failedSaveByTaskId`) in `TasksSprintBoardPanel.tsx` displaying `Unsaved change`, `Retry save`, and `Revert` without overwriting persisted status badges or filter counts.
- Added in-panel `Refresh` buttons (`panel-refresh-btn`), `Seeded Demo Data` pills (`demo-data-badge`) across `ProjectOverviewPanel`, `TasksSprintBoardPanel`, and `ResourceLibraryPanel`, and `workspace_layouts` metadata display (`workspace-layout-meta`) in `App.tsx`.
- Added repeatable verification suites: `tests/rls/verify-rls.mjs` (`npm run test:rls`, 4-actor Postgres RLS and column-grant checks), `tests/unit/m3-guards.test.ts` (`npm run test:unit`, `11/11` Node 24 native unit tests), and `tests/e2e/m3-persistence-and-resilience.spec.ts` (`18/18` total Playwright E2E tests passing).
- Locked M2/M2.5 central contracts (`src/types/components.ts`, `AuthRepository` in `src/types/database.ts`, `DEMO_PROFILE_DESCRIPTORS` and `TeamMemberSummary` in `src/types/contracts.ts`, and `data-testid` / static skeleton rules in `UI_CONTRACT.md`).
- Added Supabase Postgres M2 schema, triggers (`set_updated_at`, `handle_new_user`), `SECURITY DEFINER` membership helpers, least-privilege grants (`GRANT UPDATE (status) ON public.tasks`), and authenticated-only RLS policies in `supabase/migrations/20261126000001_m2_core_schema.sql`.
- Added idempotent demo seed data (`supabase/seed.sql`) for 3 fictional demo accounts (`nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu`), 2 courses (`IF-4031`, `IF-3210`), 2 teams, 2 projects, 8 tasks, 6 HTTPS resources, and 2 workspace layouts, applied and verified against remote `zftymjkcrdkhtshazzmw`.
- Implemented `src/services/errorMapper.ts`, `src/services/authService.ts` (`SupabaseAuthRepository`), and `src/services/academicService.ts` (`SupabaseAcademicRepository`) with zero mock fallbacks.
- Implemented Cozy Digital Campus screens `EntryGateway` (`src/components/entry/EntryGateway.tsx`), `AcademicSpacesSelector` (`src/components/campus/AcademicSpacesSelector.tsx`), and `WorkstationPanel` (`src/components/workstation/WorkstationPanel.tsx`, `ProjectOverviewPanel.tsx`, `TasksSprintBoardPanel.tsx`, `ResourceLibraryPanel.tsx`, `PanelStateCards.tsx`, `workstationUtils.ts`).
- Added `tests/e2e/helpers/authFlow.ts` and `tests/e2e/m2-student-journey.spec.ts`, and updated `phaser-lifecycle.spec.ts` and `workstation-bridge.spec.ts` (`14/14` Playwright E2E specs passing).
- Scaffolded M1 React 19 + TypeScript + Vite 6 + Tailwind v4 + Phaser `3.88.2` + Playwright baseline (`package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`).
- Added Cozy Digital Campus shell (`src/app/App.tsx`) with live Supabase health verification (`src/lib/supabase.ts`), Leave/Enter Studio routing, accessible right drawer (`role="dialog"`, `Tab` trap, `Escape` focus return), and honest M1 empty states.
- Integrated Config A sharp Phaser 3 studio (`src/game/createGame.ts`, `src/game/scenes/CampusScene.ts`, `src/game/maps/campusStudioMap.json`, `src/game/PhaserHost.tsx`, `src/game/bridge/eventBridge.ts`, `src/types/gameDebug.ts`) and copied processed pixel-art atlases, tilesets, and character sheets to `public/assets/`.
- Mapped studio interactables (`workstation-overview` -> `overview`, `meeting-table` -> `tasks`, `resource-shelf` -> `resources`) using `WORKSTATION_META`.
- Added Playwright E2E suite (`tests/e2e/phaser-lifecycle.spec.ts` and `tests/e2e/workstation-bridge.spec.ts`) verifying single-canvas lifecycle, 1x and 2x HiDPI ADR-012 sharpness, responsive integer zoom, keyboard walking, and workstation bridge focus management (`8/8` passing).
- Locked shared TypeScript domain, bridge, and repository contracts in `src/types/contracts.ts` and `src/types/database.ts`.
- Locked central route table, transitions, shell header contract, and workstation metadata in `src/app/routerContract.ts`.
- Added M1–M3 worktree isolation matrix in `UI_CONTRACT.md` Section 7 and Antislop Gate checklist in `HANDOFF_TEMPLATE.md`.
- Added M0 milestone handoff in `HANDOFF.md`.

### Changed
- Wired `src/app/App.tsx` to manage the `studio:${teamId}` Realtime connection, coordinate remote-sync replay on `PhaserHost` mount, broadcast `avatar:chat-bubble` events and workstation `onDataMutated` revisions, and mount `StudioCollaborationBar` inside `<main>` (keeping `header [role="status"]` reserved for `Supabase connected`).
- Extracted `toDateInputValue` and `dateInputToIso` helpers into `src/components/workstation/workstationUtils.ts` for Node 24 native unit verification.
- Extracted `parseSafeHttpUrl` and `ParsedSafeHttpUrl` into pure TypeScript `src/components/workstation/workstationUtils.ts` (re-exported by `ResourceLibraryPanel.tsx`) so Node 24 unit tests execute directly with zero extra test runner dependencies.
- Tightened `tests/e2e/m2-student-journey.spec.ts` Test 1 (`UI-01`) to assert zero uncaught `pageErrors` while filtering only the intentional Supabase HTTP `400` invalid-credentials console log.
- Wired `src/app/App.tsx` to hydrate Supabase Auth sessions, route through `EntryGateway` -> `AcademicSpacesSelector` -> `Team Workspace Studio` (`PhaserHost` + `WorkstationPanel`), expose compact-viewport workstation triggers (`mobile-workstation-btn-*`), and manage `Sign Out` / `Leave Studio` cleanly.
- Locked `UI_CONTRACT.md` on `main` with Antislop dials (`ENERGY 1 / RHYTHM 2 / MOTION 1`) and verified contrast ratios.
- Extended `src/styles/index.css` with `--color-border-control` (`#757E74`), `--color-accent-sage-strong-hover` (`#3B5638`), and shared Cozy button/input/card/badge primitives.
- Updated `docs/MILESTONES.md`, `docs/PROJECT_AUDIT.md`, and `README.md` to reflect M0 completion and M1 readiness.

### Fixed
- Resolved WCAG AA contrast conflicts in `docs/DESIGN.md` by syncing secondary text (`#5C665C`), muted text (`#636B63`), primary CTA (`#4A6B46` / `#3B5638`), focus ring (`#4A6B46`), and control border (`#757E74`) tokens.

### Removed
-
