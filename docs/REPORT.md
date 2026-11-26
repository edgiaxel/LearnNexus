# LearnNexus: M4/M5 Engineering & Verification Report

- **Project:** LearnNexus (A Persistent Virtual Campus for Collaborative Project-Based Learning)
- **Team:** SibukTA (STACK 2026 — Case 1: Smarter Campus and Learning)
- **Baseline:** Track 1 M0-M4 Quality Freeze + Scoped M6/M9 complete & M5 Production Deployment live
- **Live Deployment:** [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app)
- **Date:** 26 November 2026

---

## 1. Executive Summary

LearnNexus delivers a complete, database-backed student collaboration vertical slice built on React 19, TypeScript 5.8, Vite 6.2, Tailwind CSS v4, lazy-loaded Phaser 3.88.2, and Supabase (Auth, 13-table PostgreSQL with Row Level Security, and Realtime). Every workspace view reads and writes real PostgreSQL records under authenticated sessions with zero client-side mock fallbacks.

Pre-M4 integration verified `17/17` Node native unit guard tests, `4/4` live Supabase RLS actors across all `13` public tables, and `22/22` Playwright Chromium E2E tests spanning Entry Gateway (`UI-01`), Academic Spaces (`UI-02`), 2D Cozy Digital Campus Studio (`UI-03`/`04`), Project Overview (`UI-05`), Sprint Tasks CRUD (`UI-06`), Resource Library (`UI-07`), Team Whiteboard (`UI-08b`), and live multi-user Presence/Chat (`M6`). M4 hardens production delivery with `React.lazy` code-splitting for Phaser, Rollup vendor chunk separation, `vercel.json` SPA rewrites and HTTP security headers, GitHub Actions CI (`.github/workflows/ci.yml`), expanded M4 quality auditing, and curated 1080p visual evidence.

---

## 2. Architecture & Bundle Optimization Analysis

### 2.1 Strict Architectural Boundaries

- **React 19 Shell (`src/app/App.tsx`):** Owns the single top header bar (breadcrumbs, `header [role="status"]` Supabase health badge, user pill, Leave Studio, Sign Out), `StudioCollaborationBar` inside `<main>`, and the focus-trapped contextual right drawer (`440px` for `overview`/`tasks`/`resources`; `540px` for `whiteboard`).
- **Isolated Phaser 3 Engine (`src/game/`):** `PhaserHost.tsx`, `createGame.ts`, and `CampusScene.ts` strictly own 2D spatial rendering (`campusStudioMap.json`), collision boundaries, 4-character `NEAREST`-filtered spritesheets (`adam`, `alex`, `amelia`, `bob`), 64px proximity rings, 5-second floating chat bubbles, and `[E]` workstation proximity detection. No productivity UI or forms are drawn on the canvas (ADR-014).
- **ADR-012 Sharp Pixel-Art Rendering:** Configured in `createGame.ts` and `CampusScene.ts` with `render: { pixelArt: true, antialias: false, roundPixels: true }`, `Phaser.Textures.FilterMode.NEAREST` across all 11 textures, integer camera zoom (`3` desktop, `2` mobile), integer pixel snapping for remote interpolation, and CSS `image-rendering: pixelated; crisp-edges`.
- **Typed Bridge (`src/game/bridge/eventBridge.ts`):** Mediates `workstation:proximity`, `workstation:interact`, `panel:closed`, `ui:input-focus`, and `avatar:*` events between Phaser and React without coupling scene memory to database persistence.
- **Asynchronous-First Persistence + Optional Realtime (ADR-013):** `SupabaseAcademicRepository` (`src/services/academicService.ts`) treats Supabase Postgres as the single source of truth. `SupabaseStudioRealtimeRepository` (`src/services/realtimeService.ts`) adds `studio:${teamId}` Presence, 80ms-throttled movement Broadcast, `postgres_changes` across 7 tables, and `workspace:sync` fallback; if Realtime drops, all workspace CRUD continues cleanly.

### 2.2 Code-Splitting & Rollup Vendor Chunking

Before M4 optimization, the single Vite production bundle totaled `~2.13 MB` because Phaser 3 loaded eagerly alongside the Entry Gateway (`UI-01`) and Academic Spaces selector (`UI-02`). Two structural improvements in `f604b8a` eliminate unnecessary initial payload weight:

1. **Route-Level Lazy Loading (`src/app/App.tsx`):** `PhaserHost` loads dynamically via `React.lazy(() => import('../game/PhaserHost')...)` inside a `<Suspense>` boundary using a static `#EEF1E8` skeleton (`aria-busy="true"`, `"Loading 2D studio canvas..."`). Students visiting `UI-01` and `UI-02` never download or parse Phaser until entering a studio (`UI-03/04`).
2. **Rollup `manualChunks` (`vite.config.ts`):** Splits third-party dependencies into deterministic cacheable vendor bundles:
   - `vendor-phaser`: `/node_modules/phaser/`
   - `vendor-supabase`: `/node_modules/@supabase/`
   - `vendor-react`: `/node_modules/react/`, `/node_modules/react-dom/`, `/node_modules/scheduler/`

#### Production Bundle Metrics

Measured from `npm run build` (`vite v6.4.6`, `99` modules transformed in `11.22s`): initial JS + CSS load totals `663.15 kB` raw (`174.59 kB` gzip), deferring `1,511.73 kB` raw (`347.75 kB` gzip) of Phaser engine and scene code until a student enters the 2D `workspace` route.

| Chunk / Asset | Category | Raw Size (`kB`) | Gzip Size (`kB`) | Loading Timing |
|---|---|---|---|---|
| `dist/index.html` | Static HTML Shell | `0.60 kB` | `0.35 kB` | Initial page load |
| `dist/assets/index-D2WuUhG2.js` | App Shell, UI-01/02, Drawers & Services | `158.67 kB` | `35.87 kB` | Initial page load |
| `dist/assets/PhaserHost-CM4XjDcy.js` | Spatial Studio Scene & Map Data | `33.08 kB` | `8.74 kB` | Lazy on entering `workspace` |
| `dist/assets/vendor-react-PY8vvcCh.js` | React 19 + React DOM + Scheduler | `223.19 kB` | `69.21 kB` | Initial page load (cached) |
| `dist/assets/vendor-supabase-B9O_2iRq.js` | `@supabase/supabase-js` v2 | `230.52 kB` | `60.07 kB` | Initial page load (cached) |
| `dist/assets/vendor-phaser-DNvWzekM.js` | Phaser `3.88.2` Engine | `1,478.65 kB` | `339.01 kB` | Lazy on entering `workspace` |
| `dist/assets/index-FeizwK2V.css` | Tailwind CSS v4 + Cozy Tokens | `50.77 kB` | `9.44 kB` | Initial page load |

---

## 3. Security, Secrets & 13-Table RLS Matrix Summary

### 3.1 Client Secret Hygiene & Transport Controls

- **Zero Service-Role Exposure:** Client initialization (`src/lib/supabase.ts`) reads solely `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Local `.env`, `node_modules/`, `dist/`, `recordings/`, and `test-results/` are excluded by `.gitignore`.
- **Deployment Security Headers (`vercel.json`):** Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` on every route.
- **Safe External Resource Validation:** Client validation via `parseSafeHttpUrl` (`src/components/workstation/workstationUtils.ts`) and database check constraint `resources_url_http_check` (`url ~* '^https?://'`) block `javascript:`, `data:`, and `ftp:` payloads (verified failing with Postgres SQLSTATE `23514`).
- **Pre-Write Session Guard:** `requireActiveSession()` in `academicService.ts` checks `auth.getSession()` before mutations and maps expired sessions (`PGRST301` / missing session) to clean re-authentication prompts without claiming unpersisted edits succeeded.

### 3.2 13-Table Postgres RLS & Column-Level Privilege Matrix

All 13 tables in `public` enable Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), revoke all privileges from `anon` and `public`, and enforce membership via `SECURITY DEFINER` helpers (`is_class_member`, `is_team_member`, `can_access_project`, `shares_team_with`). Column-level grants evolved cleanly from M2 (`GRANT UPDATE (status) ON public.tasks`) to Scoped M9 full collaborative CRUD (`20261126000002_m6_m9_collab_pm.sql`).

| Table | `anon` Access | Authenticated `SELECT` Scope | Authenticated `INSERT / UPDATE / DELETE` & Column Guards | Verified Enforcement (`verify-rls.mjs`) |
|---|---|---|---|---|
| `profiles` | Blocked (`42501`, 0 rows) | Own profile or teammates (`shares_team_with(id)`) | Read-only from client; seeded/inserted via `handle_new_user()` trigger | Nadia & Bima cannot see Rani; Rani sees own profile only |
| `classes` | Blocked (`42501`, 0 rows) | Enrolled classes (`is_class_member(id)`) | Read-only for students | Nadia sees 2 classes (`IF-4031`, `IF-3210`); Bima sees 1 (`IF-4031`); Rani sees 0 |
| `class_members` | Blocked (`42501`, 0 rows) | Own rows (`user_id = auth.uid()`) | Read-only for students | Nadia sees 2 rows; Bima sees 1 row; Rani sees 0 |
| `teams` | Blocked (`42501`, 0 rows) | Member teams (`is_team_member(id)`) | Read-only for students | Nadia sees 2 teams; Bima sees 1 (`Team SibukTA`); Rani sees 0 |
| `team_members` | Blocked (`42501`, 0 rows) | Same-team roster (`is_team_member(team_id)`) | Read-only for students | Nadia sees 3 rows across 2 teams; Bima sees 2; Rani sees 0 |
| `projects` | Blocked (`42501`, 0 rows) | Team projects (`is_team_member(team_id)`) | Column-scoped `UPDATE (title, description, objectives)` by team member; `team_id` immutable | Nadia/Bima edit & restore Project 1; `team_id` move rejected (`42501`); Bima/Rani blocked on Project 2 |
| `tasks` | Blocked (`42501`, 0 rows) | Accessible project (`can_access_project(project_id)`) | M2 `UPDATE (status)` expanded to M9 `INSERT`, `UPDATE (title, description, status, assignee_id, assignee_name, due_at, sort_order)`, `DELETE`; `project_id` update blocked | Nadia/Bima CRUD on Project 1 + cleanup to exact `5+3` tasks; `project_id` move blocked (`42501`); cross-team blocked |
| `resources` | Blocked (`42501`, 0 rows) | Accessible project (`can_access_project(project_id)`) | M9 `INSERT`, `UPDATE (title, description, url, resource_type)`, `DELETE` + `url ~* '^https?://'` check; `project_id` immutable | `javascript:alert(1)` rejected (`23514`); Nadia/Bima CRUD + cleanup to `4+2` resources; cross-team blocked |
| `workspace_layouts` | Blocked (`42501`, 0 rows) | Team member (`is_team_member(team_id)`) | Read-only in Semifinal (`M7` deferred) | Nadia sees 2; Bima sees 1; Rani sees 0 |
| `room_messages` | Blocked (`42501`, 0 rows) | Team member (`is_team_member(team_id)`) | `INSERT (team_id, user_id, display_name, body)` requiring `is_team_member(team_id) AND user_id = auth.uid()` and trimmed length `1..500`; `DELETE` blocked | Spoofed `user_id` blocked (`42501`); whitespace body blocked (`23514`); delete blocked (`42501`) |
| `whiteboard_notes` | Blocked (`42501`, 0 rows) | Accessible project (`can_access_project(project_id)`) | `INSERT` (`author_id = auth.uid()`), `UPDATE (content, color)`, `DELETE` with color enum check | Nadia/Bima CRUD + cleanup to `2+0` notes; Rani/cross-team blocked |
| `whiteboard_strokes` | Blocked (`42501`, 0 rows) | Accessible project (`can_access_project(project_id)`) | `INSERT` (`author_id = auth.uid()`), `DELETE` with 4-color WCAG enum, width `2|4`, points length `2..500` | Nadia/Bima create/delete + cleanup to `0` strokes; Rani/cross-team blocked |
| `activity_logs` | Blocked (`42501`, 0 rows) | Accessible project (`can_access_project(project_id)`) | **Zero client writes**; written solely by `SECURITY DEFINER` trigger `log_project_activity()` | Client `INSERT` blocked (`42501`) for Nadia, Bima, Rani, and `anon` |

---

## 4. Automated Test & Quality Audit Coverage

### 4.1 Verification Suite Inventory

| Check Command | Scope & Coverage | Pre-M4 Baseline Result | Post-M4 Status |
|---|---|---|---|
| `npm run typecheck` | Strict `tsc --noEmit` across `src/`, `tests/`, `vite.config.ts`, `playwright.config.ts` | PASS (exit `0`) | **PASS** (exit `0`) |
| `npm run test:unit` | `tests/unit/m3-guards.test.ts` (4 suites, 11 tests: `mapSupabaseError`, `canTransitionRoute`, `workstationUtils`, `parseSafeHttpUrl`) + `tests/unit/m6-m9-guards.test.ts` (4 suites, 6 tests: `getCharacterSpriteKey`, `truncateChatBubbleText`, `normalizeStrokePoints`, `WORKSTATION_META` & date helpers) | PASS (`17/17` across `8` suites) | **PASS** (`17/17` across `8` suites, `0` failed) |
| `npm run test:rls` | `tests/rls/verify-rls.mjs`: live 4-actor verification (`anon`, Nadia, Bima, Rani) across all `13` public tables + cleanup count assertion | PASS (`4/4` actors, `13/13` tables) | **PASS** (`4/4` actors, `13/13` tables; re-verified post-smoke) |
| `npm run test:e2e` | `26` Playwright Chromium specs across `6` files (`m2-student-journey.spec.ts` [6], `m3-persistence-and-resilience.spec.ts` [4], `m4-quality-audit.spec.ts` [4], `m6-m9-realtime-and-pm.spec.ts` [4], `phaser-lifecycle.spec.ts` [5], `workstation-bridge.spec.ts` [3]) | PASS (`22/22` baseline specs) | **PASS** (`26/26` specs in `2.9m`, `0` failed, `0` skipped) |
| `npm run build` | `tsc --noEmit && vite build` with lazy `PhaserHost` + Rollup `manualChunks` + client secret scan | PASS (`98` modules pre-split) | **PASS** (`99` modules transformed; `0` client secrets) |

### 4.2 Final M4 Verification Summary

- `npm run typecheck`: **PASS** (exit `0`)
- `npm run test:unit`: **PASS** (`17/17` tests across `8` suites)
- `npm run test:rls`: **PASS** (`4/4` actors `anon`, `nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu` across all `13` tables; verified again after production smoke cleanup)
- `npm run build`: **PASS** (`99` modules; separate `vendor-react`, `vendor-supabase`, `vendor-phaser`, and lazy `PhaserHost` chunks verified in `dist/assets/` with zero secrets)
- `npm run test:e2e`: **PASS** (`26/26` Playwright Chromium tests passed in `2.9m`, including lazy Phaser isolation before Studio entry, two-way live Studio Chat and avatar bubbles between Nadia and Bima, `Tab`/`Enter`/`Escape` focus management, and responsive layout/antislop/safe-link checks at `1280x720`, `1024x700`, and `390x844`)

### 4.3 M4 Bug-Fix Log

1. **Remaining Em Dash in Token Header (`src/styles/index.css:1`):** Replaced the single `\u2014` character inside the CSS header comment with `:` so `src/` contains zero em dashes.
2. **Root License Scope Restoration (`LICENSE`):** Restored Apache License 2.0 at repo root (fixing the broken README link) with an explicit carve-out preserving LimeZu sprite non-commercial licensing under `assets/LICENSE.txt`.
3. **Split-Screen Bubble Spacing & History Clarity (`scripts/capture-evidence.mjs`):** Adjusted simultaneous screenshot coordinates from `(9.7, 9.4)` / `(11.8, 9.4)` to `(8.6, 9.4)` / `(12.5, 9.4)` (3.9 tiles inside the 4-tile proximity radius) and cleared prior rehearsal strings in `public.room_messages` so `09-multiuser-realtime-split.png` renders crisp non-overlapping speech bubbles and synchronized 4-message Studio Chat panels.
4. **Runtime & Layout Audit Outcome:** `26/26` Playwright E2E checks and live production smoke testing uncovered `0` blocking runtime, console, horizontal-overflow, focus-trap, or RLS defects.

---

## 5. Curated Screenshot Evidence Gallery

Screenshots captured by the M4/M5 QA pipeline (`scripts/capture-evidence.mjs`) from the running Chromium application (`docs/evidence/screenshots/`):

| # | Screen / Flow Demonstrated | Artifact Path | Notes |
|---|---|---|---|
| `01` | Entry Gateway (`UI-01`): Cozy Digital Campus welcome, Demo Mode profiles, and Student Sign In | [`docs/evidence/screenshots/01-entry-gateway.png`](./evidence/screenshots/01-entry-gateway.png) | Verified initial landing view (`1280x800`) |
| `02` | Academic Spaces (`UI-02`): Enrolled course directory for Nadia (`IF-4031`, `IF-3210`) | [`docs/evidence/screenshots/02-academic-spaces.png`](./evidence/screenshots/02-academic-spaces.png) | Live Postgres space memberships (`1280x800`) |
| `03` | Cozy 2D Pixel Studio (`UI-03/04`): Sharp ADR-012 studio with `[E] Open Sprint Tasks` prompt | [`docs/evidence/screenshots/03-studio-pixel-canvas.png`](./evidence/screenshots/03-studio-pixel-canvas.png) | Crisp `NEAREST` rendering (`1280x800`) |
| `04` | Project Overview Drawer (`UI-05`): Editable brief, objectives, `"In studio"` roster badge | [`docs/evidence/screenshots/04-workstation-overview.png`](./evidence/screenshots/04-workstation-overview.png) | Trigger-backed activity & roster (`1280x800`) |
| `05` | Sprint Tasks Board (`UI-06`): Sprint completion bar, filter pills, task CRUD & status controls | [`docs/evidence/screenshots/05-workstation-tasks-crud.png`](./evidence/screenshots/05-workstation-tasks-crud.png) | Persists to Supabase Postgres (`1280x800`) |
| `06` | Resource Library (`UI-07`): Category filters (`Docs`, `Design`, `Tools`, `General`) and safe links | [`docs/evidence/screenshots/06-workstation-resources.png`](./evidence/screenshots/06-workstation-resources.png) | Validates `https?://` (`1280x800`) |
| `07` | Team Whiteboard (`UI-08b`): Shared `480x260` sketch pad + persisted pastel sticky notes | [`docs/evidence/screenshots/07-workstation-whiteboard.png`](./evidence/screenshots/07-workstation-whiteboard.png) | Stroke cleaned up post-shot (`1280x800`) |
| `08` | Unassigned Guest Boundary (`UI-02`): Honest empty state for `Rani Kusuma (Demo)` (`0` classes) | [`docs/evidence/screenshots/08-unassigned-guest-empty.png`](./evidence/screenshots/08-unassigned-guest-empty.png) | Verifies RLS isolation (`1280x800`) |
| `09` | Multi-User Realtime Split View: Concurrent Nadia + Bima avatars, 64px proximity cue, live chat bubbles, and synced chat panels | [`docs/evidence/screenshots/09-multiuser-realtime-split.png`](./evidence/screenshots/09-multiuser-realtime-split.png) | Verified live two-browser sync (`1920x1080`) |

---

## 6. Raw 1080p Demo Recordings & Vercel Deployment Smoke Test

### 6.1 Raw Playwright 1080p Captures (Gitignored Media for Video Editing)

Raw captures live under `recordings/` (excluded from Git via `.gitignore`) so the team can combine them with spoken intro/voiceover and English subtitles:

| Take | Scenario | Output File | Measured Duration & Resolution |
|---|---|---|---|
| **Take A** | Single-user core journey: Entry (`UI-01`) -> `IF-4031` (`UI-02`) -> 2D studio walk -> `[E]` workstations -> Task/Brief/Resource persistence across browser reload | `recordings/take-a-single-user-core-crud-1080p.mp4` | `62.87s @ 1920x1080` (`h264`, `30 fps`, `3.39 MB`) |
| **Take B** | Multi-user split-screen collaboration: Nadia & Bima concurrent avatars, 64px proximity ring, two-way Studio Chat + 5s floating bubbles, and Team Whiteboard live sync | `recordings/take-b-multi-user-splitscreen-1080p.mp4` | `75.73s @ 1920x1080` (`h264`, `30 fps`, `4.22 MB`) |

### 6.2 Vercel Production Deployment Smoke Test

- **Target URL:** [https://learnnexus-nine.vercel.app](https://learnnexus-nine.vercel.app) (`zeenity/learnnexus`, `HTTP 200 OK`)
- **Configuration Verified:** `vercel.json` SPA fallback rewrite (`/(.*) -> /index.html`), HTTP security headers (`nosniff`, `Strict-Transport-Security`, `strict-origin-when-cross-origin`), and public-only env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Smoke Test Checklist (Verified in Fresh Chromium Contexts against `https://learnnexus-nine.vercel.app`):**
  - [x] Incognito Chromium loads `UI-01` (`HTTP 200`, `Supabase connected`) with `0` console/page errors
  - [x] Lazy `PhaserHost` + `vendor-phaser` chunks do not load until entering `IF-4031` Team Workspace Studio (`0` pre-studio requests; sharp Config A `pixelArt: true`, `antialias: false`, `cameraZoom: 3` on mount)
  - [x] Multi-window Realtime (`Nadia` + `Bima`) connects with `Live sync`, `Online (2)`, and delivers two-way persisted Studio Chat cleanly on production
  - [x] Synthetic smoke-test chat messages removed afterwards and `npm run test:rls` re-verified (`4/4` actors)

---

## 7. Honest Implemented vs Planned Matrix & Known Limitations

### 7.1 Implemented vs Deferred Status

- **Implemented & Verified:** Authenticated & Demo entry (`UI-01`), Academic Spaces + empty state (`UI-02`), sharp ADR-012 2D pixel-art studio (`UI-03/04`), Project Overview edit + online roster + trigger-backed `activity_logs` (`UI-05`), Sprint Tasks full CRUD + M3 failure recovery (`UI-06`), Resource Library safe HTTP(S) CRUD (`UI-07`), Team Whiteboard 480x260 canvas + sticky notes (`UI-08b`), live multi-user avatars/proximity/chat bubbles (`M6`), and 13-table Postgres RLS.
- **Planned / Deferred (Track 2 Roadmap):** Multi-zone campus portals (`UI-10`, `UI-11`, `UI-12`) & runtime `workspace_layouts` customizer (`M7`); Lecturer Studio Management (`UI-08`) & lecturer RLS write policies (`M8`); Supabase Storage binary file uploads, project timeline view, and deliverable submission/review (`UI-09`, remaining `M9`); self-service signup/SSO/avatar picker/Platform Admin `U-03` (`M10`); WebRTC proximity audio/video (`M6b`).

### 7.2 Known Limitations

1. **Ephemeral Spatial Position:** Live avatar coordinates and presence clear on disconnect; only workspace records, whiteboard artifacts, activity logs, and room chat persist in PostgreSQL.
2. **Append-Only Chat & Activity Rows:** `room_messages` and `activity_logs` intentionally block client `DELETE` via RLS (`42501`), so rehearsal messages remain in room history until reset via SQL / `supabase/seed.sql` maintenance.
3. **Desktop-Primary Spatial Controls:** Full `WASD`/Arrow avatar walking and `[E]` triggers target desktop/laptop browsers; compact viewports (`< 768px`) display direct workstation panel launch buttons (`mobile-workstation-btn-*`) without on-screen touch joysticks.
4. **Student Usability Data Collection Pending:** Automated unit, RLS, and Playwright browser checks are complete, while peer student usability scores (`N = 5-10`) are awaiting execution with [`docs/USABILITY_TEST_SHEET.md`](./USABILITY_TEST_SHEET.md) prior to final PDF export.
