> **Current milestone:** M1 — Foundation & Sharp Canvas Engine  
> **Overall status:** M0 complete — shared contracts locked on `main`; ready for M1 scaffold  
> **Deadline:** 30 November 2026, 23:59 WIB  
> **Last updated:** 25 November 2026  
> **Repository:** [edgiaxel/LearnNexus](https://github.com/edgiaxel/LearnNexus)

---
**Important:** Dont replace these, this is my template prompt.

[antislop](slashCommand;antislop) [antislop-ui](slashCommand;antislop-ui) [antislop-code](slashCommand;antislop-code) [antislop-human](slashCommand;antislop-human)

[caveman](slashCommand;caveman) [ultracave](slashCommand;ultracave) be brief, use less token.

Read `docs/` (PRD, architecture, latest milestone handoff/changelog) and inspect existing project code before acting.

Role: **Main Orchestrator** managing a multi-agent Git worktree workflow. Execute strictly in these phases:

1. **Prep & Shared Contract (on `main` BEFORE worktrees):**
   - Clean up stale worktrees/branches and verify `main` builds clean.
   - Lock shared contracts (`UI_CONTRACT.md`, shared types, API schemas, global theme, Navigation/Layout, and central router skeleton) on `main` so all worktrees inherit identical UI/navigation/state rules.
2. **Plan & Isolate:**
   - Run [/plan](slashCommand;plan) to split this milestone into isolated worktrees with strict, non-overlapping folder ownership.
   - Ban subagents from creating duplicate navbars, global layouts, custom themes, or editing central shared files directly.
   - Require every subagent to connect real DB/backend logic (zero mocks/hardcoded data) and output a brief `HANDOFF.md` (files touched, exported entry points, env/schema changes, caveats, what needs to do next) upon completion.
3. **Merge, Wire & Verify:**
   - Review subagent `HANDOFF.md` reports, merge branches into `main`, and centrally integrate all new features from each worktree.
   - Audit for zero mock/hardcoded data—everything must hit real database and backend endpoints.
   - Run Playwright CLI against localhost to verify end-to-end user flows, navigation consistency, and DB persistence. Fix any regressions.
4. **Docs Sync & Milestone Handoff:**
   - Update necessary documentation and remove temporary worktrees.
   - Write a concise HANDOFF.md for each milestone summarizing completed features, DB/API contracts, touched files, and next-milestone readiness for the next fresh session.

Remember check again to make sure theres a shared contract before doing the execution, each subagents can execute with the same rule, dont invent different rule from one another, make sure each subagents know each other what they do and you as the main orchestrator need to know what each subagents did. You as the orchestrator act as the audit to see works for each subagents and check their work if its aligned with the current project. If not you are alllowed to edit/fix/change so every work synced wth the current project.

### Current Milestone Target:

---

## 1. Project at a Glance

- **Goal:** Demonstrate a persistent, spatial academic workspace that connects academic spaces with collaborative project workspaces for university students.
- **MVP outcome:** A student enters the application, selects an assigned academic space, navigates a 2D environment to a team workspace, interacts with workstations, accesses project/task/resource panels, updates task status, and can leave and return with saved project information retained.
- **Current state:** M0 complete on `main` — `UI_CONTRACT.md`, `HANDOFF_TEMPLATE.md`, `src/styles/index.css`, `src/types/contracts.ts`, `src/types/database.ts`, `src/app/routerContract.ts`, `HANDOFF.md`, and synced `docs/` are locked; `.env` / Supabase reachability verified; no `package.json` or M1 app scaffold exists yet.
- **Next action:** Execute **M1 — Foundation & Sharp Canvas Engine**: scaffold React 19 + TypeScript + Vite + Tailwind + Phaser 3 (`v3.88.2`) + Playwright on `main`, then fan out M2 feature worktrees.
- **Links:** `PRD.md` / `DESIGN.md` / `ARCHITECTURE.md` / GitHub repository.
- **Planning note:** The schedule is intentionally aggressive because the semifinal submission is due on 30 November 2026. Deliverable is an honest, high-trust single-user demonstrator with real persistence.

## 2. Milestone Overview

| ID | Milestone | Outcome | Status | Exit criteria | Issues |
|---|---|---|---|---|---|
| M0 | Audit, Preparation & Shared Contract | Trustworthy starting point, locked `UI_CONTRACT.md`, Cozy design tokens, and runnable baseline | Completed | Local repo clean; shared contract locked on `main`; Tailwind tokens verified; subagent isolation ready | — |
| M1 | Foundation & Sharp Canvas Engine | App boots, single Phaser host, ADR-012 sharp pixel-art rendering, and typed event bridge | Ready / Next | App builds; Phaser mounts once with `pixelArt: true`, `antialias: false`, integer zoom; static pixel assets loaded | — |
| M2 | Core Workflow & Cozy Academic Space | Student navigates distinct 2D pixel-art studio and accesses live Supabase workstation panels | Planned | Distinct 2D pixel-art environment (`Interiors_free` / `Characters_free`); avatar controller; live Supabase panels; E2E verified | — |
| M2.5 | Design & Rendering Alignment | Cozy Digital Campus (pastel tokens, master design system, sharp canvas rendering rules) | Planned | DESIGN.md approved, tokens locked, rendering rules applied, sharp pixel-art config verified | — |
| M3 | Persistent Student Workspace | Project, tasks and resources are loaded from durable Supabase Postgres data; task status updates persist | Planned | Refresh/re-entry preserves project/task data; failure states visible; E2E verified | — |
| M4 | Quality & Integration | Integrated P0 demo is stable, sharp, and verified | Planned | Critical student journey passes; no blocking errors; access rules reviewed; rendering verified sharp | — |
| M5 | Release / Demo | Shareable demo, evidence and submission materials are ready | Planned | Deployment smoke-tested; proposal/video evidence complete before deadline | — |

## 3. Milestone Details

### M0 — Audit, Preparation & Shared Contract

**Target window:** 25 November  
**Outcome:** A verified starting point with locked shared contracts, warm cream / soft pastel design tokens, and strict subagent worktree boundaries.

- [x] Connected GitHub repository identified and inspected (`edgiaxel/LearnNexus`).
- [x] Default branch and worktree inspected (clean `main` baseline).
- [x] Review and lock `UI_CONTRACT.md` on `main`: Cozy Digital Campus visual tokens (`#F7F4EC` warm cream, `#C9D7BA` soft sage, `#DAD2E9` lavender, `#F1D2BC` peach, `#30343B` dark text), shared TypeScript contracts, and router/navigation skeleton.
- [x] Verify `src/styles/index.css` warm cream background, typography, and crisp canvas CSS rules.
- [x] Verify `.env.example`, local `.env`, and Supabase project access.
- [x] Clean up any stale git branches or worktrees.
- [x] Enforce zero-mock rule and standard `HANDOFF_TEMPLATE.md` for all subagent tasks.

**Exit criteria:** Shared contracts locked on `main`; all worktrees inherit identical UI and navigation contracts without duplicate layouts or custom styling.

**Issues:** Pending M0 task tracking.

### M1 — Foundation & Sharp Canvas Engine

**Target window:** 25–26 November  
**Outcome:** A working browser application with crisp pixel-art rendering (ADR-012), single canvas lifecycle, and typed event bridge.

- [ ] React + TypeScript + Vite app shell rendering the Cozy Digital Campus master layout.
- [ ] Configure Phaser 3 in `src/game/createGame.ts` with ADR-012 sharpness parameters: `pixelArt: true`, `antialias: false`, `roundPixels: true`, nearest-neighbor filtering (`Phaser.Textures.FilterMode.NEAREST`), and integer zoom.
- [ ] Map static pixel-art assets in `public/assets/` from `assets/Interiors_free` and `assets/Characters_free`.
- [ ] Phaser host (`PhaserHost.tsx`) mounts exactly one canvas, handles resizing cleanly, and disposes resources on unmount without duplicate canvases or leaks.
- [ ] Typed event bridge (`src/game/bridge/eventBridge.ts`) connects Phaser workstation events with React drawer panels.
- [ ] Build and typecheck pass cleanly (`npm run typecheck && npm run build`).

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-01 | Sharp Canvas Host + Cozy Layout Shell | F-003, F-005 | — | Planned | Single crisp pixel-art canvas mounts cleanly inside Cozy Digital Campus shell |

**Exit criteria:** App builds, Phaser mounts with zero blur on high-DPI/standard displays, single canvas verified in Playwright tests.

### M2 — Core Workflow & Cozy Academic Space

**Target window:** 26–27 November  
**Outcome:** Student moves from Entry Gateway through Academic Spaces into a distinct 2D pixel-art studio pod and interacts with live Supabase workstation panels.

- [ ] Build `CampusScene.ts` with 2D pixel-art tiles and furniture from `assets/Interiors_free` (wood/tile floors, desks, collaborative tables, bookshelves, plants).
- [ ] Implement player avatar using `assets/Characters_free` with 4-directional walking and idle animations, keyboard input (WASD / Arrows), and collision boundaries.
- [ ] Implement proximity interaction detection ("Press [E] to open Workstation") around 3 distinct workstations: Project Overview Desk, Tasks Sprint Board, and Resource Library Shelves.
- [ ] Build `EntryGateway.tsx` in Cozy Digital Campus visual system with honest profile selection (Team Leader, Member, Guest).
- [ ] Build `AcademicSpacesSelector.tsx` with cozy cards, course directory, and team workspace entry.
- [ ] Build Workstation Panels (`ProjectOverviewPanel`, `TasksSprintBoardPanel`, `ResourceLibraryPanel`) as warm drawer dialogs with zero mock data—loading directly from Supabase Postgres.
- [ ] Verify panel open/close via keyboard [E], click, and UI close button without resetting avatar or scene context.
- [ ] Run Playwright test suite to verify end-to-end journey.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-02 | Cozy Entry → Academic Spaces → 2D Pixel Studio | F-001, F-002, F-003, F-004 | — | Planned | Student reaches distinct 2D pixel-art studio pod with avatar navigation |
| VS-03 | Workstation Proximity → Live Supabase Drawers → Return | F-005, F-006, F-007, F-008 | — | Planned | Interactive workstations open live Postgres drawers in Cozy Digital Campus style |

**Exit criteria:** Complete student journey works with distinct Cozy pixel-art environment, sharp rendering, live Supabase data, and passes all Playwright tests.

### M2.5 — Design Alignment & Canvas Rendering Quality

**Target window:** Aligned with M1/M2  
**Outcome:** Cozy Digital Campus visual direction, target information architecture, Gather Town 2.0 design references, and sharp canvas rendering configuration applied from the start.

- [ ] **Visual direction:** Cozy Digital Campus (warm pastel palette `#F7F4EC` + welcoming 2D pixel-art virtual campus).
- [ ] **Target information architecture:** Virtual Campus (Main Hall, Auditorium, Classrooms, Library, Commons), Academic Spaces, and Team Workspaces aligned with `PRD.md` and `DESIGN.md`.
- [ ] **Gather Town 2.0 design reference review:** Visual and layout references (`assets/1.png` to `7.png`) applied for spatial navigation, room layouts, furniture placement, and side drawers; asset licensing rules respected (`assets/LICENSE.txt`).
- [ ] **Canvas rendering quality:** Enforce ADR-012 (`antialias: false`, `pixelArt: true`, `roundPixels: true`, nearest-neighbor filtering, integer zoom, DPR awareness).
- [ ] **Master design system:** Design tokens, accessible sans-serif typography, restrained geometry, subtle elevation, and drawer specifications from `DESIGN.md`.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-03.5 | Cozy Digital Campus & Canvas Sharpness Alignment | UI-01–UI-12, F-001–F-008 | — | Planned | Master design spec and sharp canvas rendering enforced |

**Exit criteria:** `DESIGN.md` serves as the unambiguous source of truth for UI, rejected futuristic directions are avoided, and canvas sharpness rules are verified.

### M3 — Persistent Student Workspace

**Target window:** 27–28 November  
**Outcome:** The demonstrator proves that useful project information survives leaving and returning, rendered crisply within the Cozy Digital Campus theme.

- [ ] Supabase project and environment variables configured.
- [ ] Initial SQL migration and fictional seed data committed.
- [ ] Minimal class/team/project/task/resource schema implemented.
- [ ] RLS enabled and tested for demo and authenticated sessions.
- [ ] Project overview loads from Supabase Postgres.
- [ ] Task list loads from Supabase Postgres.
- [ ] Resource list loads from Supabase Postgres.
- [ ] Task status update mutations write to Supabase Postgres.
- [ ] Canvas sharpness configuration (ADR-012) verified in `createGame.ts`.
- [ ] Full page refresh and leave/re-enter test verifies persisted data across clean browser sessions.
- [ ] Save failure and fetch failure states reviewed.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-04 | Seeded team workspace data loads from Postgres | F-006, F-007, F-008, F-009 | — | Planned | Panels show real persisted records |
| VS-05 | Update → save → refresh → reload | F-007, F-009 | — | Planned | A changed value remains after a refresh |

**Exit criteria:** At least one durable data path is demonstrated end-to-end across a page reload or leave/re-enter cycle, and the canvas renders crisply without blur.

### M4 — Quality & Integration

**Target window:** 28–29 November  
**Outcome:** The P0 student workflow is integrated, testable, sharp, and safe to demonstrate.

- [ ] Playwright smoke test covers the primary student journey.
- [ ] Unit/component checks cover critical state and panel behavior.
- [ ] Phaser mount/unmount and duplicate-canvas behavior verified.
- [ ] Canvas rendering verified sharp on normal and high-DPI displays (no bilinear blur).
- [ ] RLS membership checks verified (if restricted data/auth is enabled).
- [ ] Empty, loading, error and save-failure states reviewed.
- [ ] Resource links checked.
- [ ] Desktop/laptop layout used in the demo checked.
- [ ] No secrets or service-role key in the repository/client bundle.
- [ ] All P0 acceptance criteria reviewed against PRD.
- [ ] Realtime, uploads, lecturer dashboard and submissions remain deferred unless P0 is already stable.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-06 | Integrated P0 regression, sharpness, and access verification | F-001–F-009 | — | Planned | Repeatable student journey with verified error/access behavior |

**Exit criteria:** The demonstrator works repeatedly in the target browser, persistence is real, canvas rendering is sharp, and no known critical blocker remains.

### M5 — Release / Demo

**Target window:** 29–30 November  
**Outcome:** A stable shareable demo and complete semifinal submission evidence.

- [ ] Deployment target and project access confirmed.
- [ ] Production build deployed.
- [ ] Environment variables configured without committing secrets.
- [ ] Deployed URL opened and smoke-tested.
- [ ] Demo account/entry instructions prepared.
- [ ] Demo data reset/seed state prepared.
- [ ] Screenshots captured from the actual working application.
- [ ] Proposal PDF updated to match implemented behavior.
- [ ] Under-2-minute video/Reel recorded and checked.
- [ ] Submission links and files verified before 30 November, 23:59 WIB.
- [ ] Final source and known limitations documented.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-07 | Deploy and rehearse the student journey | F-001–F-009 | — | Planned | Public demo link works from a clean browser session |
| VS-08 | Evidence and submission package | Competition deliverables | — | Planned | Proposal/video demonstrate only verified capabilities |

**Exit criteria:** The team can run the demo from a clean browser session, explain what is implemented versus planned, and submit before the deadline.

## 4. Current Focus

- **Current focus:** **M1 — Foundation & Sharp Canvas Engine**
- **Why this is next:** M0 contracts (`UI_CONTRACT.md`, `src/styles/index.css`, `src/types/*`, `src/app/routerContract.ts`) are locked on `main`; M1 establishes the React 19 + TypeScript + Vite + Phaser 3 (`v3.88.2`) + Playwright baseline before M2 parallel worktrees branch out.
- **Dependencies:** Locked M0 contracts on `main`, Node `v24.22.1`, npm `9.2.0`, and `assets/` spritesheets.
- **Expected result:** Runnable app shell with single Phaser host, ADR-012 sharp pixel-art rendering, and typed event bridge.
- **Verification:** `npm run typecheck`, `npm run build`, and Playwright single-canvas lifecycle smoke test.
- **Blockers:** None. Ready to execute M1.

## 5. Next Actions

1. Initialize M1 scaffold (`package.json`, React 19, TypeScript, Vite, Tailwind, Phaser `v3.88.2`, Playwright) on `main`.
2. Implement `PhaserHost.tsx`, `createGame.ts` (ADR-012), `eventBridge.ts`, and `App.tsx` shell on `main`.
3. Fan out M2 feature worktrees (`feature/m2-supabase-data`, `feature/m2-entry-spaces`, `feature/m2-workstation-panels`) per `UI_CONTRACT.md` Section 7.

## 6. Risks and Blockers

| Item | Impact | Owner/next action | Status |
|---|---|---|---|
| Canvas visual sharpness | Blurry canvas weakens prototype presentation | Enforce ADR-012 (`pixelArt: true`, `antialias: false`, DPR awareness) from M1 | Planned |
| Deadline is 30 Nov | Feature creep could prevent a coherent demo | Team: protect P0; defer P1/P2 | Active |
| Realtime multiplayer scope | Synchronous networking could derail timeline | Keep asynchronous persistence as core; defer realtime | Mitigated (ADR-013) |
| Unapproved engine swap | Migrating to PixiJS would waste critical days | Retain Phaser 3; focus on config and assets | Resolved (ADR-002) |
| Proposal alignment | Proposal must reflect implemented direction accurately | Align proposal draft with verified build in M5 | Planned |

## 7. Change History

| Date | Change |
|---|---|
| 25 Nov 2026 | Clean slate reset: reverted project progress to M0 starting point; synced canonical docs and prepared M0 baseline. |
| 25 Nov 2026 | Completed M0: verified repo/runtime/Supabase access, resolved `DESIGN.md` WCAG contrast conflicts, locked `UI_CONTRACT.md`, `src/styles/index.css`, `src/types/*`, `src/app/routerContract.ts`, and wrote M0 `HANDOFF.md`. |