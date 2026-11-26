# LearnNexus

**A Persistent Virtual Learning Environment Connecting Academic Spaces with Collaborative Project Workspaces**

- **Competition Track:** STACK 2026 — Case 1: Smarter Campus and Learning (GDGoC ITB)
- **Team:** SibukTA
- **Live Demo Deployment:** [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app)
- **License:** Apache License 2.0 for source code ([`LICENSE`](./LICENSE)); third-party pixel art governed by [`assets/LICENSE.txt`](./assets/LICENSE.txt)

LearnNexus is a browser-based virtual campus built for university group projects. It pairs an accessible, warm-pastel React productivity workspace (**Cozy Digital Campus**) with an isolated 2D pixel-art studio powered by Phaser 3 and backed by Supabase Auth, 13-table PostgreSQL with Row Level Security (RLS), and Supabase Realtime. Instead of scattering project briefs, sprint tasks, reference links, and live collaboration across disconnected chat apps and temporary video calls, LearnNexus anchors every student team to a persistent academic course context and studio workspace.

> **Current Status:** M4 Quality Freeze complete & M5 Production Deployment live (`typecheck` PASS, `17/17` unit tests, `4/4` live RLS actors across 13 tables, `26/26` Playwright E2E specs, `99`-module Vite bundle split, and Vercel smoke test passing at [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app)). Ready for team semifinal submission steps (`docs/TEAM_SUBMISSION_CHECKLIST.md`). Track team issues on the [LearnNexus Kanban](https://github.com/users/edgiaxel/projects/5).

---

## Team (`SibukTA`) & Competition Context

| Member | Role | Competition Context |
|---|---|---|
| Edgi Axel | Team lead | STACK 2026 — Case 1: Smarter Campus and Learning |
| Jonathan Lukas Wijaya | Team member (`[CONFIRM EXACT TEAM ROLE]`) | STACK 2026 — Case 1: Smarter Campus and Learning |
| Deffa Kiane | Team member (`[CONFIRM EXACT TEAM ROLE]`) | STACK 2026 — Case 1: Smarter Campus and Learning |
| Khaerul Husnaen | Team member (`[CONFIRM EXACT TEAM ROLE]`) | STACK 2026 — Case 1: Smarter Campus and Learning |

---

## Implemented Core Journey vs Planned Scope

LearnNexus prioritizes an asynchronous-first, persistent student workflow while supporting live multi-user presence inside the team studio. The table below distinguishes verified capabilities from deferred Track 2 roadmap items.

### Core 10-Step Student Journey (Implemented)

1. **Enter Application (`UI-01`):** Sign in via student credentials or one of three labeled Demo Mode profiles backed by real Supabase Auth sessions.
2. **Select Academic Space (`UI-02`):** Inspect enrolled courses (`IF-4031`, `IF-3210`) and enter the assigned team workspace (or observe the empty-state guard for unassigned users).
3. **Navigate the 2D Studio (`UI-03` / `UI-04`):** Walk around the Cozy Digital Campus studio using `WASD` or Arrow keys with crisp pixel-art rendering and collision bounds.
4. **Collaborate Live in Studio (`M6`):** See online teammates move with smooth interpolation, 64px proximity rings, an occupancy roster, persisted `room_messages` studio chat, and 5-second floating avatar speech bubbles.
5. **Approach Interactive Workstations:** Walk near any of the 4 studio workstations (`Project Overview`, `Sprint Tasks`, `Resource Library`, `Team Whiteboard`) to reveal the `[E]` interaction prompt, or click directly.
6. **Open Contextual React Drawers (`UI-05` to `UI-08b`):** Trigger focus-trapped side drawers while keeping the 2D studio canvas mounted behind the panel.
7. **Manage Project Brief & Activity (`UI-05`):** View or edit the project title, description, and objectives, check live `"In studio"` roster badges, and inspect trigger-backed `Recent Activity`.
8. **Run Full Sprint Task & Resource CRUD (`UI-06` / `UI-07`):** Create, edit, filter, update status, and delete sprint tasks (with M3 `Unsaved change` / `Retry save` / `Revert` resilience), and add or delete verified `http(s)` resource links.
9. **Sketch & Post on Team Whiteboard (`UI-08b`):** Draw shared 480x260 freehand strokes and post/delete pastel sticky notes persisted in PostgreSQL and synced across active sessions.
10. **Leave and Return Durably:** Refresh the browser, leave the studio, or switch users (`Nadia` -> `Bima` -> `Nadia`) and verify every mutation remains stored in Supabase Postgres.

### Scope Boundary Matrix

| Capability | Milestone | Status | Notes |
|---|---|---|---|
| Entry Gateway (`UI-01`), Academic Spaces (`UI-02`), 2D Studio (`UI-03`/`04`) | M1, M2, M2.5 | **Implemented & Tested** | Cozy Digital Campus tokens (`#F7F4EC`, `#FFFFFF`, `#4A6B46`), WCAG AA verified, ADR-012 crisp pixel rendering |
| Project Overview (`UI-05`), Sprint Tasks (`UI-06`), Resource Library (`UI-07`) | M2, M3, Scoped M9 | **Implemented & Tested** | Full brief edit + `activity_logs`, full Task CRUD + failure recovery, safe HTTP(S) Resource CRUD |
| Team Whiteboard (`UI-08b`) | Scoped M9 | **Implemented & Tested** | Shared 480x260 HTML5 canvas strokes + pastel sticky notes persisted in Postgres |
| Live Studio Presence, Proximity Rings, Room Chat & Bubbles | Scoped M6 | **Implemented & Tested** | Supabase Realtime Presence, 80ms Broadcast, `postgres_changes`, persisted `room_messages` |
| Lazy Phaser Loading, Vendor Splitting, Vercel & CI Pipeline | M4 | **Implemented** | `React.lazy` `PhaserHost`, `manualChunks` in `vite.config.ts`, `vercel.json`, `.github/workflows/ci.yml` |
| Multi-Zone Campus Portals & Dynamic Layout Editor (`UI-10`/`11`/`12`) | M7 | **Planned / Deferred** | Multi-room campus transitions and runtime `workspace_layouts.config_json` editor |
| Lecturer Studio Management (`UI-08`) & Lecturer RLS Writes | M8 | **Planned / Deferred** | Course/team/roster creation and assignment publishing by lecturers (`U-02`) |
| Binary Storage Uploads, Project Timeline & Deliverables (`UI-09`) | M9 (Remaining) | **Planned / Deferred** | Supabase Storage file buckets, timeline view, and deliverable review/grading |
| Self-Service Signup, Avatar Picker, SSO, Admin (`U-03`), WebRTC Audio/Video | M10 / M6b | **Planned / Deferred** | Institutional auth/admin operations and browser peer media streams |

---

## Architecture & Tech Stack

- **Application Shell & Productivity UI:** React `19.1`, TypeScript `5.8`, Vite `6.2`, Tailwind CSS v4 (`src/styles/index.css`). All panels render in accessible HTML with focus trapping, keyboard shortcuts (`Tab`, `Enter`, `Escape`), and static `#EEF1E8` loading skeletons (`aria-busy="true"`).
- **2D Spatial Campus Engine:** Lazy-loaded Phaser `3.88.2` (`React.lazy` in `src/app/App.tsx` + Rollup `manualChunks` in `vite.config.ts` splitting `vendor-phaser`, `vendor-supabase`, and `vendor-react`) strictly isolated to `src/game/`. Enforces ADR-012 crisp pixel rendering (`pixelArt: true`, `antialias: false`, `roundPixels: true`, `Phaser.Textures.FilterMode.NEAREST`, integer camera zoom `2` or `3`, and CSS `image-rendering: pixelated; crisp-edges`).
- **Event Bridge:** Typed pub/sub bus (`src/game/bridge/eventBridge.ts`) decoupling Phaser scene proximity/interaction/chat-bubble events from React state without rendering productivity UI inside the canvas.
- **Backend, Auth & Persistence:** Supabase Auth + `@supabase/supabase-js` v2 + 13-table PostgreSQL schema (`supabase/migrations/20261126000001_m2_core_schema.sql`, `supabase/migrations/20261126000002_m6_m9_collab_pm.sql`) protected by strict Row Level Security (RLS), column-level write grants, URL protocol checks (`url ~* '^https?://'`), and `SECURITY DEFINER` activity triggers.
- **Realtime Collaboration:** Supabase Realtime (`src/services/realtimeService.ts`) using studio-scoped channels (`studio:${teamId}`) with Presence, 80ms-throttled movement Broadcast, `postgres_changes` subscriptions across 7 tables, and `workspace:sync` fallback. Async Postgres remains authoritative even when Realtime disconnects.

### Repository Map

| Path | Purpose |
|---|---|
| `src/app/` | Application shell (`App.tsx`) and route/workstation contracts (`routerContract.ts`) |
| `src/components/` | `entry/` (`EntryGateway`), `campus/` (`AcademicSpacesSelector`), `workstation/` (`WorkstationPanel`, `ProjectOverviewPanel`, `TasksSprintBoardPanel`, `ResourceLibraryPanel`, `WhiteboardPanel`), and `realtime/` (`StudioCollaborationBar`) |
| `src/game/` | Isolated Phaser 3 host (`PhaserHost.tsx`), `createGame.ts`, `CampusScene.ts`, `eventBridge.ts`, and `campusStudioMap.json` |
| `src/services/` | Typed repositories (`authService.ts`, `academicService.ts`, `realtimeService.ts`, `realtimeUtils.ts`, `errorMapper.ts`) |
| `supabase/` | Ordered SQL migrations and idempotent demo seed (`supabase/seed.sql`) |
| `tests/` | Unit guards (`tests/unit/`), 4-actor 13-table RLS verifier (`tests/rls/verify-rls.mjs`), and Playwright E2E specs (`tests/e2e/`) |
| `docs/` | Canonical specs (`PRD.md`, `DESIGN.md`, `ARCHITECTURE.md`, `MILESTONES.md`), engineering report (`REPORT.md`), semifinal proposal (`PROPOSAL_SEMIFINAL.md`), usability sheet (`USABILITY_TEST_SHEET.md`), and team checklist (`TEAM_SUBMISSION_CHECKLIST.md`) |

---

## Teammate Setup & PR Contribution Tutorial

### Prerequisites

- **Node.js:** `v20.19+` or `v22+` (verified locally on `v24.15.0` and CI on Node `22`)
- **npm:** Lockfile-compatible `npm` (`package-lock.json` committed)
- **Git** and modern desktop Chromium/Chrome browser (Playwright Chromium installs via `npx playwright install chromium` if running E2E locally)

### Local Environment Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/edgiaxel/LearnNexus.git
   cd LearnNexus
   ```

2. **Install exact locked dependencies:**

   ```bash
   npm ci
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env` and request the project's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` privately from the Team Lead (never commit `.env`, and never place a `service_role` key in client config):

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. **Start the local development server:**

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173` in a desktop browser.

### Verification Commands

Run these checks before opening a pull request:

```bash
npm run typecheck   # Strict TypeScript check (tsc --noEmit)
npm run test:unit   # Node native unit guard suites
npm run test:rls    # Live 4-actor Supabase RLS verification across 13 tables (requires .env)
npm run test:e2e    # Playwright Chromium end-to-end suite against localhost:5173 (requires .env)
npm run build       # Typecheck + Vite production bundle build
```

### Pull Request & CI Workflow

1. Sync with `main` and create a feature branch for one bounded GitHub Issue:

   ```bash
   git switch main
   git pull origin main
   git switch -c feature/<short-name>
   ```

2. Keep changes strictly within your issue scope and verify `npm run typecheck`, `npm run test:unit`, and `npm run build` pass locally (plus `npm run test:rls` and `npm run test:e2e` for database, realtime, or UI changes).
3. Inspect `git status` and `git diff` to ensure `.env`, `node_modules/`, and unrelated edits are excluded.
4. Push your branch and open a Pull Request targeting `main`.
5. Wait for the GitHub Actions CI workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) to pass on Node `22` (`npm ci`, `npm run typecheck`, `npm run test:unit`, `npm run build`) and obtain teammate review before merging.

---

## Demo Accounts & Seed Reset Runbook

LearnNexus provides three fictional, non-sensitive student demonstration accounts seeded in `supabase/seed.sql`. Each profile authenticates through real Supabase Auth and obeys database RLS boundaries.

| Account Email | Display Name | Role | Seeded Scope & Testing Purpose |
|---|---|---|---|
| `nadia.demo@learnnexus.edu` | `Nadia Pratama (Demo)` | `team_lead` | Enrolled in `IF-4031` (`Team SibukTA`) and `IF-3210` (`Team Studio B`); primary lead profile |
| `bima.demo@learnnexus.edu` | `Bima Santoso (Demo)` | `student` | Enrolled in `IF-4031` (`Team SibukTA`) only; ideal paired session with Nadia for live multiplayer and RLS cross-team isolation |
| `rani.demo@learnnexus.edu` | `Rani Kusuma (Demo)` | `guest_demo` | Enrolled in `0` courses; verifies honest empty states (`UI-02`) and strict RLS read/write blocking |

### Entering Demo Accounts

- **Recommended (One-Click Demo Mode):** On `UI-01` Entry Gateway, choose a profile card (`Nadia`, `Bima`, or `Rani`) and click **Enter Campus as Demo**.
- **Credential Sign-In:** Use the **Student Sign In** form with one of the demo emails above; demo login credentials for local verification are documented in `supabase/seed.sql` and `src/services/authService.ts` (or request access details from the Team Lead).

### Resetting Seeded Demo Data

[`supabase/seed.sql`](supabase/seed.sql) uses deterministic UUIDs and `ON CONFLICT` upserts so maintainers can safely re-apply it in the Supabase SQL Editor (or database runner) to restore the baseline 3 demo users, 2 courses (`IF-4031`, `IF-3210`), 2 teams, 2 projects, 8 sprint tasks, 6 HTTPS resources, 2 workspace layouts, 2 starter whiteboard notes, and 1 welcome chat message without duplicating records. Before live judging or recording, re-run `supabase/seed.sql` and optionally remove temporary test rows created during rehearsals in `tasks`, `resources`, `whiteboard_notes`, `whiteboard_strokes`, `room_messages`, and `activity_logs`.

---

## Vercel Deployment Guide

LearnNexus deploys as a static Vite single-page application configured by [`vercel.json`](vercel.json):

- **Build & Output Settings:** `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`.
- **SPA Routing:** Rewrites all routes (`/(.*)`) to `/index.html` so deep refreshes land cleanly on the React shell.
- **Security Headers:** Applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` across all responses.
- **Required Environment Variables in Vercel:** Configure both variables in Project Settings -> Environment Variables (using only the public/anon Supabase key, never `service_role`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Post-Deploy Smoke Test:** Open the production URL in an incognito browser, confirm `Supabase connected` in the header, sign in as Nadia, walk to `Sprint Tasks`, update a task, reload the browser, and verify the update persists cleanly.

---

## Material AI Assistance Disclosure & AI Usage Glossary

In compliance with STACK 2026 Technology and AI Usage Rule #4 (`docs/STACK_2026.md`):

- **Zero Runtime AI in LearnNexus:** The LearnNexus application itself contains **zero runtime AI features**. There are no LLM API calls, chatbots, automated graders, or AI agents running inside the product for students or lecturers.
- **AI Coding Assistance During Development:** During engineering and documentation preparation, Team SibukTA used AI coding assistants strictly as development tools under human review:

| AI Tool | Scope of Assistance | Human Team Responsibilities |
|---|---|---|
| Google Antigravity / Gemini coding models (acting as AI pair programmers / multi-worktree coding agents) | Repository scaffolding, TypeScript refactoring, Supabase SQL migration and RLS policy drafting, Playwright E2E test authoring, and documentation formatting | Problem definition, Cozy Digital Campus visual design and UX architecture, PostgreSQL schema and RLS security review, manual browser testing, usability test execution, and final acceptance verification |

### AI-Development Glossary

- **AI Coding Assistant:** An AI pair-programming tool used by developers inside the IDE to draft code, tests, or SQL under explicit human direction and review.
- **Agentic Multi-Worktree Workflow:** A parallel development pattern where bounded tasks execute in separate Git branches/worktrees against locked interface contracts before human/orchestrator review and integration onto `main`.
- **Human Verification Gate:** The mandatory team step where human contributors inspect diffs, review RLS policies, and manually verify browser behavior before accepting changes.
- **Deterministic Verification:** Automated, reproducible checks (`tsc --noEmit`, `node --test`, `verify-rls.mjs`, Playwright E2E, and `vite build`) run on real code and live Supabase Postgres rather than assumed outputs.

---

## License & Third-Party Asset Attribution

- **Source Code License:** LearnNexus application source code, tests, configuration, and documentation written by Team SibukTA are licensed under the **Apache License, Version 2.0** ([`LICENSE`](./LICENSE)).
- **2D Pixel-Art Assets (Non-Commercial Scope):** Character and interior tileset assets in `assets/` and `public/assets/` use the **LimeZu Modern Interiors Free Version** ([https://limezu.itch.io/moderninteriors](https://limezu.itch.io/moderninteriors)), excluded from the Apache 2.0 grant and governed strictly by [`assets/LICENSE.txt`](./assets/LICENSE.txt):
  - **Allowed:** Using and editing the sprites in non-commercial projects.
  - **Prohibited:** Commercial use, editing sprites for commercial projects, or reselling sprites.
- **UI & Spatial Design References:** Screenshots in `assets/1.png`, `assets/2.jpg`, and `assets/3.png` through `assets/7.png` are external Gather Town / Gather Town 2.0 design references used solely for spatial layout and contextual drawer inspiration; they are not bundled or redistributed as runtime assets.
