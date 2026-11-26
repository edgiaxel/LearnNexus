> **Current milestone:** Pre-M4 Scoped M6 + M9 Prototype Showcase (Next: M4 Quality & Integration)  
> **Overall status:** Track 1 M0–M3 verified on `main`; approved pre-M4 **Scoped M6 (Realtime Presence & Text Chat Bubbles) + M9 (Task/Project/Resource CRUD & Whiteboard)** slice in progress before M4 freeze  
> **Semifinal deadline:** 30 November 2026, 23:59 WIB  
> **Last updated:** 26 November 2026  
> **Repository:** [edgiaxel/LearnNexus](https://github.com/edgiaxel/LearnNexus)

---
**Important:** Dont replace these, this is my template prompt.

$antislop $antislop-ui $antislop-code $antislop-human 

$caveman $ultracave 

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

- **Full-scale vision:** A browser-based, multiplayer persistent virtual campus for collaborative university project-based learning — combining multi-zone configurable 2D campus maps, real-time multi-user presence, lecturer course/team/assignment management, and full project workspace tools (task CRUD, uploads, deliverables, timeline, whiteboard, activity log).
- **Semifinal prototype goal (Track 1, M0–M5):** Demonstrate the verified P0 vertical slice before 30 November 2026: student entry, assigned academic space selection, crisp 2D pixel-art studio navigation, interactive workstation panels, and durable Supabase Postgres persistence across sessions (with an optional scoped M6a real-time multi-user presence slice if approved before M5).
- **Current verified state (M0–M3):** Complete & tested on `main` — Supabase Auth + 3 demo accounts (`onAuthStateChange` + expiry guard), Academic Spaces selector, single static 2D pixel-art studio (`campusStudioMap.json`, ADR-012 sharp Phaser 3 rendering), read-only Project Overview & Resource Library, status-only Tasks Sprint Board with per-task unsaved/retry/revert resilience, `workspace_layouts` metadata display, `4/4` live RLS actors (`npm run test:rls`), `11/11` unit tests (`npm run test:unit`), and `18/18` Playwright E2E specs (`npm run test:e2e`).
- **Gap to full-scale product:** M0–M3 delivers ~100% of the P0 Semifinal Core (`F-001`–`F-009`), representing roughly **30–35%** of the full-scale platform vision. Multi-user realtime collaboration (`M6`), multi-map/configurable campus (`M7`), lecturer studio & class management (`M8`), full project CRUD/uploads/deliverables (`M9`), and production auth/admin ops (`M10`) are **Planned** (not yet implemented).
- **Links:** `PRD.md` / `DESIGN.md` / `ARCHITECTURE.md` / `ABSTRACT.md` / GitHub repository.

## 2. Milestone Overview

### Track 1 — STACK 2026 Semifinal Delivery (Due 30 Nov 2026)

| ID | Milestone | Outcome | Status | Exit criteria | Issues |
|---|---|---|---|---|---|
| M0 | Audit, Preparation & Shared Contract | Trustworthy starting point, locked `UI_CONTRACT.md`, Cozy design tokens, and runnable baseline | Completed | Local repo clean; shared contract locked on `main`; Tailwind tokens verified; subagent isolation ready | — |
| M1 | Foundation & Sharp Canvas Engine | App boots, single Phaser host, ADR-012 sharp pixel-art rendering, and typed event bridge | Completed | App builds; Phaser mounts once with `pixelArt: true`, `antialias: false`, integer zoom; `8/8` Playwright specs pass | GH-01, GH-02 |
| M2 | Core Workflow & Cozy Academic Space | Student navigates distinct 2D pixel-art studio and accesses live Supabase workstation panels | Completed | Distinct 2D pixel-art environment (`Interiors_free` / `Characters_free`); avatar controller; live Supabase panels; `14/14` E2E verified | GH-03, GH-04 |
| M2.5 | Design & Rendering Alignment | Cozy Digital Campus (pastel tokens, master design system, sharp canvas rendering rules) | Completed | `DESIGN.md` approved, tokens locked, `ENERGY 1 / RHYTHM 2 / MOTION 1` & sharp ADR-012 pixel-art config verified across desktop/mobile | — |
| M3 | Persistent Student Workspace | Project, tasks and resources load from durable Supabase Postgres; task status updates persist | Completed | Clean-context cross-user persistence (`Nadia -> Bima -> Nadia`), 4-actor RLS matrix, `11/11` unit tests, save/fetch failure recovery, and `18/18` E2E verified | GH-05 |
| M4 | Quality & Integration | Integrated P0 demo is stable, sharp, and verified (optional pre-M5 promotion of M6a realtime presence if approved) | Planned | Critical student journey passes; no blocking errors; access rules & secrets audited; rendering verified sharp | GH-06 |
| M5 | Release / Demo | Shareable demo, evidence and submission materials are ready | Planned | Deployment smoke-tested; proposal/video evidence complete before 30 Nov 2026, 23:59 WIB | GH-07 |

### Track 2 — Full-Scale LearnNexus Platform Roadmap (Post-Semifinal / Full Vision)

| ID | Milestone | Outcome | Status | Exit criteria | Feature IDs |
|---|---|---|---|---|---|
| M6 | Multi-User Real-Time Collaboration | Multiple users see each other move in real time inside a studio, with live occupancy and synced task-board updates | Planned | 2+ browser sessions render live remote avatars (`Adam`/`Alex`/`Amelia`/`Bob`), smooth interpolation, occupancy badge, and live task sync via Supabase Realtime without blocking async persistence | F-011, FR-014 |
| M7 | Multi-Map Virtual Campus & Configurable Layouts | Navigable multi-zone campus (Main Hall, Classrooms, Library, Student Commons, multi-pod Team Studios) driven by configurable `workspace_layouts` | Planned | Portal/doorway transitions work across >=3 campus zones + team pods; layouts load dynamically from `workspace_layouts.config_json` with preset/config editing | UI-10, UI-11, UI-12 |
| M8 | Lecturer Studio & Academic Space Management | Lecturers create/manage classes, teams, student rosters, course materials, announcements, and assigned tasks | Planned | Lecturer role (`UI-08`) + RLS write policies verified; lecturer assigns students/tasks and publishes course materials visible to students in real time | F-010, FR-013, FR-015, UI-08 |
| M9 | Full Project Management, Uploads & Deliverables | Full task/project/resource CRUD, Supabase Storage file uploads, deliverable submission/review, timeline, activity history, and collaborative whiteboard | Planned | Students create/edit/delete tasks, edit briefs, upload files to Storage, submit deliverables (`UI-09`), and view activity history; lecturers review submissions | F-006–F-008 (CRUD), F-012, UI-09 |
| M10 | Production Auth, Campus Operations & Hardening | Self-service onboarding, avatar customization, Platform Admin (`U-03`), institutional SSO/LMS readiness, and production observability | Planned | Self-signup/recovery, avatar picker, admin oversight, responsive polish, and production monitoring verified | U-03, P2 Ops |

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

### M1 — Foundation & Sharp Canvas Engine

**Target window:** 25–26 November  
**Outcome:** A working browser application with crisp pixel-art rendering (ADR-012), single canvas lifecycle, and typed event bridge.

- [x] React + TypeScript + Vite app shell rendering the Cozy Digital Campus master layout.
- [x] Configure Phaser 3 in `src/game/createGame.ts` with ADR-012 sharpness parameters: `pixelArt: true`, `antialias: false`, `roundPixels: true`, nearest-neighbor filtering (`Phaser.Textures.FilterMode.NEAREST`), and integer zoom.
- [x] Map static pixel-art assets in `public/assets/` from `assets/Interiors_free` and `assets/Characters_free` (`processed-assets/phaser/{atlases,tilesets,characters}`).
- [x] Phaser host (`PhaserHost.tsx`) mounts exactly one canvas, handles resizing cleanly, and disposes resources on unmount without duplicate canvases or leaks.
- [x] Typed event bridge (`src/game/bridge/eventBridge.ts`) connects Phaser workstation events (`overview`, `tasks`, `resources`) with React drawer panels.
- [x] Build and typecheck pass cleanly (`npm run typecheck && npm run build`) and Playwright E2E suite (`npm run test:e2e`) passes `8/8`.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-01 | Sharp Canvas Host + Cozy Layout Shell | F-003, F-005 | GH-01, GH-02 | Completed | Single crisp pixel-art canvas mounts cleanly inside Cozy Digital Campus shell |

**Exit criteria:** App builds, Phaser mounts with zero blur on high-DPI/standard displays, single canvas verified in Playwright tests.

### M2 — Core Workflow & Cozy Academic Space

**Target window:** 26–27 November  
**Outcome:** Student moves from Entry Gateway through Academic Spaces into a distinct 2D pixel-art studio pod and interacts with live Supabase workstation panels.

- [x] Build `CampusScene.ts` with 2D pixel-art tiles and furniture from `assets/Interiors_free` (wood/tile floors, desks, collaborative tables, bookshelves, plants).
- [x] Implement player avatar using `assets/Characters_free` with 4-directional walking and idle animations, keyboard input (WASD / Arrows), and collision boundaries.
- [x] Implement proximity interaction detection ("Press [E] to open Workstation") around 3 distinct workstations: Project Overview Desk, Tasks Sprint Board, and Resource Library Shelves.
- [x] Build `EntryGateway.tsx` in Cozy Digital Campus visual system with honest profile selection (Team Leader, Member, Guest).
- [x] Build `AcademicSpacesSelector.tsx` with cozy cards, course directory, and team workspace entry.
- [x] Build Workstation Panels (`ProjectOverviewPanel`, `TasksSprintBoardPanel`, `ResourceLibraryPanel`) as warm drawer dialogs with zero mock data—loading directly from Supabase Postgres.
- [x] Verify panel open/close via keyboard [E], click, and UI close button without resetting avatar or scene context.
- [x] Run Playwright test suite to verify end-to-end journey (`14/14` passing).

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-02 | Cozy Entry → Academic Spaces → 2D Pixel Studio | F-001, F-002, F-003, F-004 | GH-03 | Completed | Student reaches distinct 2D pixel-art studio pod with avatar navigation |
| VS-03 | Workstation Proximity → Live Supabase Drawers → Return | F-005, F-006, F-007, F-008 | GH-04 | Completed | Interactive workstations open live Postgres drawers in Cozy Digital Campus style |

**Exit criteria:** Complete student journey works with distinct Cozy pixel-art environment, sharp rendering, live Supabase data, and passes all Playwright tests.

### M2.5 — Design Alignment & Canvas Rendering Quality

**Target window:** Aligned with M1/M2  
**Outcome:** Cozy Digital Campus visual direction, target information architecture, Gather Town 2.0 design references, and sharp canvas rendering configuration applied from the start.

- [x] **Visual direction:** Cozy Digital Campus (warm pastel palette `#F7F4EC` + welcoming 2D pixel-art virtual campus).
- [x] **Target information architecture:** Virtual Campus (Main Hall, Auditorium, Classrooms, Library, Commons), Academic Spaces, and Team Workspaces aligned with `PRD.md` and `DESIGN.md`.
- [x] **Gather Town 2.0 design reference review:** Visual and layout references (`assets/1.png` to `7.png`) applied for spatial navigation, room layouts, furniture placement, and side drawers; asset licensing rules respected (`assets/LICENSE.txt`).
- [x] **Canvas rendering quality:** Enforce ADR-012 (`antialias: false`, `pixelArt: true`, `roundPixels: true`, nearest-neighbor filtering, integer zoom, DPR awareness).
- [x] **Master design system:** Design tokens, accessible sans-serif typography, restrained geometry, subtle elevation, and drawer specifications from `DESIGN.md`.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-03.5 | Cozy Digital Campus & Canvas Sharpness Alignment | UI-01–UI-12, F-001–F-008 | — | Completed | Master design spec and sharp canvas rendering enforced |

**Exit criteria:** `DESIGN.md` serves as the unambiguous source of truth for UI, rejected futuristic directions are avoided, and canvas sharpness rules are verified.

### M3 — Persistent Student Workspace

**Target window:** 27–28 November  
**Outcome:** The demonstrator proves that useful project information survives leaving and returning, rendered crisply within the Cozy Digital Campus theme.

- [x] Supabase project and environment variables configured.
- [x] Initial SQL migration and fictional seed data committed.
- [x] Minimal class/team/project/task/resource schema implemented.
- [x] RLS enabled and tested for demo and authenticated sessions (`npm run test:rls`: 4 actors verified).
- [x] Project overview loads from Supabase Postgres.
- [x] Task list loads from Supabase Postgres.
- [x] Resource list loads from Supabase Postgres.
- [x] Task status update mutations write to Supabase Postgres.
- [x] Canvas sharpness configuration (ADR-012) verified in `createGame.ts`.
- [x] Full page refresh and leave/re-enter test verifies persisted data across clean browser sessions (`Nadia -> Bima -> Nadia`).
- [x] Save failure and fetch failure states reviewed (verified with HTTP 500 injection + `Unsaved change` / `Retry save` / `Revert`).

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-04 | Seeded team workspace data loads from Postgres | F-006, F-007, F-008, F-009 | GH-05 | Completed | Panels show real persisted records |
| VS-05 | Update → save → refresh → reload | F-007, F-009 | GH-05 | Completed | A changed value remains after a refresh |

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
- [ ] Optional promotion gate: evaluate pulling **M6a (Scoped Multi-User Realtime Presence + Live Task Sync)** before M5 only if P0 regression suite stays 100% green.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-06 | Integrated P0 regression, sharpness, and access verification | F-001–F-009 | GH-06 | Planned | Repeatable student journey with verified error/access behavior |

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
| VS-07 | Deploy and rehearse the student journey | F-001–F-009 | GH-07 | Planned | Public demo link works from a clean browser session |
| VS-08 | Evidence and submission package | Competition deliverables | GH-07 | Planned | Proposal/video demonstrate only verified capabilities |

**Exit criteria:** The team can run the demo from a clean browser session, explain what is implemented versus planned, and submit before the deadline.

---

### M6 — Multi-User Real-Time Collaboration (Track 2 / Optional Pre-M5 Spike: M6a)

**Target window:** Post-M3 optional spike (`M6a`) or Post-Semifinal Phase 1  
**Outcome:** Multiple teammates inhabit the same 2D studio simultaneously with live avatar movement, room occupancy awareness, and real-time task synchronization while preserving async-first Postgres persistence (ADR-007, ADR-013).

- [ ] **M6a — Realtime Presence & Avatar Sync (Demo-Ready Slice):**
  - [ ] Subscribe to a studio-scoped Supabase Realtime channel (`room:<team_id>`) using Presence (who is online, display name, role, sprite key) and Broadcast (throttled `x`, `y`, `direction`, `anim` packets at ~10–15 Hz).
  - [ ] Render remote players in `CampusScene.ts` using existing `public/assets/characters/` spritesheets (`Adam`, `Alex`, `Amelia`, `Bob`) with smooth client-side interpolation and crisp nametags.
  - [ ] Add live room occupancy indicator in the studio HUD (`N online` + teammate list) and clean leave/disconnect cleanup.
  - [ ] Subscribe to Supabase Realtime `postgres_changes` on `public.tasks` (filtered by `project_id`) so status updates made by one teammate appear live in another teammate's open drawer.
  - [ ] Verify with 2-context Playwright E2E test (`Nadia` + `Bima` in the same studio see each other move and see live task status updates).
- [ ] **M6b — Proximity Social Collaboration:**
  - [ ] Proximity bubble detection between nearby avatars with subtle Cozy visual ring.
  - [ ] Scoped room/proximity text chat panel (persisted or ephemeral) with unread indicator.
  - [ ] Evaluate optional WebRTC proximity audio/video only as a later P2 increment (not required for M6 completion).

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-09 | Live Multi-User Avatars + Occupancy + Synced Tasks (`M6a`) | F-011, FR-014 | — | Planned | Two browser windows show live moving teammates and instant task-status sync |
| VS-10 | Proximity Interaction & Room Chat (`M6b`) | F-011 | — | Planned | Teammates standing near each other can exchange scoped room messages |

**Exit criteria:** Two concurrent sessions share the same studio smoothly with zero duplicate canvases, graceful offline fallback (async Postgres still works if Realtime drops), and passing 2-context Playwright E2E tests.

### M7 — Multi-Map Virtual Campus & Configurable Layouts

**Target window:** Post-Semifinal Phase 2  
**Outcome:** Replace the single hardcoded studio map with a navigable multi-zone Virtual Campus and data-driven configurable room layouts (`workspace_layouts.config_json`).

- [ ] **Multi-Zone Campus Maps (`UI-10`, `UI-11`, `UI-12`):**
  - [ ] Build distinct pixel-art tilemaps for **Main Hall** (Reception, Campus Info Board, Auditorium entrance), **Academic Building / Classroom**, **Campus Library**, **Student Commons**, and **multiple Team Studio Pods**.
  - [ ] Implement doorway/portal zones in Phaser (`PortalEvent`) so avatars walk between campus zones and team pods without tearing down the React shell or losing auth/course context.
  - [ ] Add campus mini-map / fast-travel directory drawer aligned with `DESIGN.md` Cozy Digital Campus tokens.
- [ ] **Configurable Maps & Layout Engine:**
  - [ ] Refactor `CampusScene.ts` to hydrate map layers, collision bounds, spawn points, portals, and workstation placements dynamically from a typed `RoomMapConfig` stored in `workspace_layouts.config_json` (rather than static `campusStudioMap.json`).
  - [ ] Provide curated room layout presets (e.g., *Cozy Study Pod*, *Sprint War Room*, *Research Studio*) selectable by Team Leaders / Lecturers and persisted to `workspace_layouts`.
  - [ ] Add a bounded **Room Layout Customizer** allowing authorized users to reposition workstations/decor items on the tile grid with collision validation and Postgres persistence.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-11 | Multi-Zone Campus & Portal Navigation | UI-10, UI-11, UI-12 | — | Planned | Student walks from Main Hall → Academic Space → Team Studio Pod via portals |
| VS-12 | Data-Driven Configurable `workspace_layouts` | F-003, F-004 | — | Planned | Team changes room preset or workstation placement; layout persists across reloads |

**Exit criteria:** At least 3 distinct campus zones plus team pods are navigable via portals, all rendered under ADR-012 sharp pixel-art rules, and layout config changes persist in `workspace_layouts`.

### M8 — Lecturer Studio & Academic Space Management

**Target window:** Post-Semifinal Phase 3  
**Outcome:** Enable the Lecturer actor (`U-02`) end-to-end with `UI-08` Lecturer Studio Management, course/team/task administration, and rich Academic Space course features.

- [ ] **Database & RLS Expansion:**
  - [ ] Add Supabase migrations and RLS write policies granting `class_members.role = 'lecturer'` permission to manage their classes, teams, team rosters, projects, tasks, announcements, and course materials.
  - [ ] Seed a realistic demo lecturer account (`dr.sari.demo@learnnexus.edu`) and verify strict RLS boundaries (`tests/rls/verify-rls.mjs`) so students cannot mutate lecturer-only records.
- [ ] **Lecturer Studio Management (`UI-08`, `F-010`, `FR-013`, `FR-015`):**
  - [ ] Build `LecturerDashboard` / `LecturerStudioManagement` (`UI-08`) following `DESIGN.md` and `screens/ui_08_lecturer_studio_management/`.
  - [ ] Create/edit classes, create team pods, and assign/reassign students to teams.
  - [ ] Assign project briefs, milestones, and tasks directly to specific teams or across all teams in a class.
  - [ ] Publish course announcements, syllabus/learning materials, and assignment deadlines.
- [ ] **Academic Space Course Features:**
  - [ ] Expand Academic Space view beyond team entry to include Course Announcements, Shared Course Materials, Assignment Briefs, and Class Discussion threads.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-13 | Lecturer Class/Team/Roster Management (`UI-08`) | F-010, FR-013 | — | Planned | Lecturer creates a team and assigns students; student immediately sees the assigned pod |
| VS-14 | Lecturer Task/Material Publishing → Student View | F-010, FR-015 | — | Planned | Lecturer assigns a task & resource; student sees it live in their studio workstation |

**Exit criteria:** Lecturer workflows pass Playwright E2E and RLS verification; students remain strictly prevented from unauthorized class/team mutations.

### M9 — Full Project Management, File Uploads & Deliverables

**Target window:** Post-Semifinal Phase 4  
**Outcome:** Upgrade workstation panels from read-mostly P0 views into a complete collaborative project workspace with full CRUD, file storage, submissions, and history.

- [ ] **Full Project & Task CRUD (`F-006`, `F-007`):**
  - [ ] Students can create new tasks, edit title/description/assignee/due date/priority, change status, and delete/archive tasks (replacing M2's column-scoped `status`-only grant with full team-member RLS policies).
  - [ ] Team Leaders / authorized members can edit project overview summary, objectives, and milestone targets.
- [ ] **Resource Management & Supabase Storage Uploads (`F-008`, ADR-008):**
  - [ ] Add/edit/remove resource links and upload files (PDF, slides, images, docs) to team-scoped **Supabase Storage** buckets with size/MIME validation and RLS policies.
- [ ] **Deliverables & Submission Workflow (`F-012`, `UI-09`):**
  - [ ] Build Deliverables workstation & submission panel (`UI-09`) supporting draft/submitted/reviewed states, attached links/files, submission timestamps, and lecturer feedback/rubric notes.
- [ ] **Collaborative Workspace Extensions (PRD 2.3):**
  - [ ] **Team Activity History:** Audit feed recording task updates, resource additions, layout changes, and submissions.
  - [ ] **Project Timeline:** Milestone/due-date timeline view derived from Postgres tasks and deliverables.
  - [ ] **Collaborative Canvas / Whiteboard Workstation:** Shared team sticky-notes/diagram board persisted in Postgres (with Realtime sync from M6).

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-15 | Full Task/Project/Resource CRUD + Storage Uploads | F-006, F-007, F-008 | — | Planned | Student creates a task, edits brief, and uploads a file that persists across reload |
| VS-16 | Deliverables Submission & Lecturer Review (`UI-09`) | F-012, UI-09 | — | Planned | Team submits a deliverable; lecturer reviews and posts feedback |
| VS-17 | Timeline, Activity Feed & Collaborative Whiteboard | PRD 2.3 | — | Planned | Team tracks history, views timeline, and sketches on a persistent whiteboard |

**Exit criteria:** Full CRUD, Storage upload/download, submission/review loop, and activity history persist in Supabase Postgres/Storage with E2E and RLS coverage.

### M10 — Production Auth, Campus Operations & Institutional Hardening

**Target window:** Post-Semifinal Phase 5 (P2 Production Scale)  
**Outcome:** Transition LearnNexus from a competition/pilot prototype to a production-ready university platform.

- [ ] **Self-Service Identity & Onboarding:** Email signup/verification, password reset, profile editing, and avatar sprite/accessory selection.
- [ ] **Platform Administration (`U-03`):** Admin console for institutional space provisioning, user/role governance, moderation, and audit logs.
- [ ] **Institutional Integration (Optional P2):** University SSO (SAML/OIDC) and LMS/SIS roster sync evaluation.
- [ ] **Production Readiness:** Code-splitting (separate Phaser chunk), performance budgets, error telemetry, full WCAG AA audit, and mobile/tablet touch-joystick navigation ergonomics.

| Slice ID | Vertical slice | Feature IDs | GitHub issues | Status | Demo outcome |
|---|---|---|---|---|---|
| VS-18 | Production Auth, Avatar Picker & Admin Console | U-03, P2 | — | Planned | New user registers, picks avatar, joins class; admin monitors campus health |

**Exit criteria:** Production security checklist, self-service auth, admin controls, and automated CI quality gates pass cleanly.

## 4. Current Focus

- **Current focus:** **Pre-M4 Scoped M6 + M9 Prototype Showcase** (`feature/m6-m9-*`), followed immediately by **M4 — Quality & Integration** and **M5 — Release / Demo**.
- **Scope decision (26 Nov 2026):** Promote core multi-user realtime collaboration (live avatars, proximity cues, studio text chat + avatar bubbles, live Postgres sync) and practical project management (full task CRUD, editable project overview + activity log, resource link CRUD, and Team Whiteboard workstation) ahead of M4. Defer **M7** (multi-map & layout editor), **M8** (Lecturer role `UI-08`), **M10** (self-signup, avatar picker, admin `U-03`), WebRTC voice/video, Storage binary uploads, and Lecturer deliverable grading (`UI-09`).
- **Dependencies:** M3 `main` baseline, `npm run test:unit`, `npm run test:rls`, `npm run test:e2e`, and Supabase `zftymjkcrdkhtshazzmw`.
- **Expected result:** Demonstrable multi-user realtime studio + full project management & whiteboard prototype backed by real Postgres/RLS/Realtime before M4 freeze.
- **Verification:** `npm run typecheck`, `npm run test:unit`, `npm run test:rls`, `npm run build`, and `npm run test:e2e`.
- **Blockers:** None.

## 5. Next Actions

1. Complete the **Pre-M4 Scoped M6 + M9 Prototype Showcase** across 4 isolated parallel worktrees, merge to `main`, push DB migration `20261126000002_m6_m9_collab_pm`, and verify multi-context E2E + 4-actor RLS.
2. Execute **M4** quality & security audit (secrets scan, bundle chunking review, full desktop/laptop demo rehearsal, all `F-001`–`F-009` + M6/M9 checks).
3. Confirm **M5** hosting target (`Vercel`) with environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), capture verified screenshots/video (<2m), and finalize STACK 2026 semifinal proposal before 30 Nov 2026, 23:59 WIB.
4. Post-semifinal: execute remaining Track 2 milestones (`M7` Multi-Map, `M8` Lecturer `UI-08`, full `M9` Storage/Deliverables `UI-09`, `M10` Production Ops).

## 6. Risks and Blockers

| Item | Impact | Owner/next action | Status |
|---|---|---|---|
| Canvas visual sharpness | Blurry canvas weakens prototype presentation | Enforced ADR-012 (`pixelArt: true`, `antialias: false`, `NEAREST`, DPR & integer zoom) | Resolved & Tested |
| Deadline is 30 Nov | Feature creep could prevent a coherent demo | Protect P0 (`M0`–`M5`); gate any pre-M5 M6a spike strictly behind green P0 tests | Active |
| Realtime multiplayer scope | Synchronous networking could derail timeline if unbounded | Keep async Postgres as source of truth; scope `M6a` to Supabase Presence/Broadcast + `postgres_changes` only | Mitigated (ADR-013) |
| Multi-map & layout complexity | Hand-building many maps + editor takes multi-week effort | Defer `M7` multi-zone campus & layout editor to Track 2 after semifinal freeze | Planned |
| Unapproved engine swap | Migrating to PixiJS would waste critical days | Retain Phaser 3; focus on config and assets | Resolved (ADR-002) |
| Proposal alignment | Proposal must reflect implemented direction accurately | Align proposal draft with verified build in M5 | Planned |

## 7. Change History

| Date | Change |
|---|---|
| 25 Nov 2026 | Clean slate reset: reverted project progress to M0 starting point; synced canonical docs and prepared M0 baseline. |
| 25 Nov 2026 | Completed M0: verified repo/runtime/Supabase access, resolved `DESIGN.md` WCAG contrast conflicts, locked `UI_CONTRACT.md`, `src/styles/index.css`, `src/types/*`, `src/app/routerContract.ts`, and wrote M0 `HANDOFF.md`. |
| 26 Nov 2026 | Completed M1: clean-slated Supabase project `zftymjkcrdkhtshazzmw`, scaffolded React 19/Vite/TS/Tailwind/Phaser `3.88.2`/Playwright shell, ported Config A sharp studio scene + assets + typed `eventBridge`, passed `typecheck`, `build`, and `8/8` Playwright E2E specs, and wrote M1 `HANDOFF.md`. |
| 26 Nov 2026 | Completed M2 & M2.5: locked M2/M2.5 contracts (`components.ts`, `AuthRepository`, `DEMO_PROFILE_DESCRIPTORS`), delivered schema/RLS/seed/services + `EntryGateway` + `AcademicSpacesSelector` + `WorkstationPanel` (`ProjectOverviewPanel`, `TasksSprintBoardPanel`, `ResourceLibraryPanel`) across 3 isolated worktrees, pushed migration & seed to `zftymjkcrdkhtshazzmw`, wired `App.tsx`, verified `14/14` Playwright E2E specs, and wrote M2/M2.5 `HANDOFF.md`. |
| 26 Nov 2026 | Completed M3: added `onAuthStateChange` + session-expiry guards, per-task unsaved/retry/revert resilience, panel `Refresh` & `Seeded Demo Data` badges, `workspace_layouts` metadata, `tests/rls/verify-rls.mjs` (4-actor RLS pass), `tests/unit/m3-guards.test.ts` (`11/11` pass), and `tests/e2e/m3-persistence-and-resilience.spec.ts` (`18/18` E2E pass), plus M3 `HANDOFF.md`. |
| 26 Nov 2026 | Expanded roadmap into Track 1 (Semifinal Delivery `M0`–`M5`) and Track 2 (Full-Scale Platform `M6`–`M10`: Multi-User Realtime, Multi-Map/Configurable Layouts, Lecturer Studio `UI-08`, Full Project CRUD/Storage/Deliverables `UI-09`, Production Ops `U-03`) while preserving template prompt and M0–M3 verified records. |