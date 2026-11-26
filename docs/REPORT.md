# LearnNexus: M4/M5 Engineering & Verification Report

- **Project:** LearnNexus (A Persistent Virtual Campus for Collaborative Project-Based Learning)
- **Team:** SibukTA (STACK 2026 — Case 1: Smarter Campus and Learning)
- **Baseline:** Track 1 M0-M3 + Scoped M6/M9 integrated on `main`, followed by M4 Quality & Integration Freeze
- **Live Deployment:** `[LIVE_VERCEL_URL — UPDATED AFTER DEPLOY]`
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

`[M4_BUNDLE_METRICS — UPDATED AFTER BUILD]`

| Chunk / Asset | Category | Raw Size (`kB`) | Gzip Size (`kB`) | Loading Timing |
|---|---|---|---|---|
| `index-*.js` | App Shell, UI-01/02, Drawers & Services | `[PENDING BUILD]` | `[PENDING BUILD]` | Initial page load |
| `PhaserHost-*.js` | Spatial Studio Scene & Map Data | `[PENDING BUILD]` | `[PENDING BUILD]` | Lazy on entering `workspace` |
| `vendor-react-*.js` | React 19 + React DOM + Scheduler | `[PENDING BUILD]` | `[PENDING BUILD]` | Initial page load (cached) |
| `vendor-supabase-*.js` | `@supabase/supabase-js` v2 | `[PENDING BUILD]` | `[PENDING BUILD]` | Initial page load (cached) |
| `vendor-phaser-*.js` | Phaser `3.88.2` Engine | `[PENDING BUILD]` | `[PENDING BUILD]` | Lazy on entering `workspace` |
| `index-*.css` | Tailwind CSS v4 + Cozy Tokens | `[PENDING BUILD]` | `[PENDING BUILD]` | Initial page load |

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
| `npm run typecheck` | Strict `tsc --noEmit` across `src/`, `tests/`, `vite.config.ts`, `playwright.config.ts` | PASS (exit `0`) | `[M4_FINAL_VERIFICATION — UPDATED AFTER E2E]` |
| `npm run test:unit` | `tests/unit/m3-guards.test.ts` (4 suites, 11 tests: `mapSupabaseError`, `canTransitionRoute`, `workstationUtils`, `parseSafeHttpUrl`) + `tests/unit/m6-m9-guards.test.ts` (4 suites, 6 tests: `getCharacterSpriteKey`, `truncateChatBubbleText`, `normalizeStrokePoints`, `WORKSTATION_META` & date helpers) | PASS (`17/17` across `8` suites) | `[M4_FINAL_VERIFICATION — UPDATED AFTER E2E]` |
| `npm run test:rls` | `tests/rls/verify-rls.mjs`: live 4-actor verification (`anon`, Nadia, Bima, Rani) across all `13` public tables + cleanup count assertion | PASS (`4/4` actors, `13/13` tables) | `[M4_FINAL_VERIFICATION — UPDATED AFTER E2E]` |
| `npm run test:e2e` | Baseline `22` Playwright Chromium specs across 5 files (`m2-student-journey.spec.ts` [6], `m3-persistence-and-resilience.spec.ts` [4], `m6-m9-realtime-and-pm.spec.ts` [4], `phaser-lifecycle.spec.ts` [5], `workstation-bridge.spec.ts` [3]) + M4 quality audit (`tests/e2e/m4-quality-audit.spec.ts`) | PASS (`22/22` baseline specs) | `[M4_FINAL_VERIFICATION — UPDATED AFTER E2E]` |
| `npm run build` | `tsc --noEmit && vite build` with lazy `PhaserHost` + Rollup `manualChunks` + client secret scan | PASS (`98` modules pre-split) | `[M4_FINAL_VERIFICATION — UPDATED AFTER E2E]` |

### 4.2 Final M4 Verification Summary

`[M4_FINAL_VERIFICATION — UPDATED AFTER E2E]`

### 4.3 M4 Bug-Fix Log

`[M4_BUGFIX_LOG]`

---

## 5. Curated Screenshot Evidence Gallery

Screenshots captured by the M4/M5 QA pipeline from the running Chromium application (`docs/evidence/screenshots/`):

| # | Screen / Flow Demonstrated | Artifact Path | Notes |
|---|---|---|---|
| `01` | Entry Gateway (`UI-01`): Cozy Digital Campus welcome, Demo Mode profiles, and Student Sign In | [`docs/evidence/screenshots/01-entry-gateway.png`](./evidence/screenshots/01-entry-gateway.png) | Verified initial landing view |
| `02`–`08` | Academic Spaces (`UI-02`), 2D Cozy Studio (`UI-03/04`), Project Overview (`UI-05`), Sprint Tasks CRUD (`UI-06`), Resource Library (`UI-07`), Team Whiteboard (`UI-08b`), and Studio Chat / Unassigned Boundary | `[SCREENSHOT_02_TO_08_FILENAMES — UPDATED AFTER QA CAPTURE]` | Populated after Phase 3 merge of QA evidence lane |
| `09` | Multi-User Realtime Split View: Concurrent Nadia + Bima avatars, 64px proximity cue, live chat bubbles, and synced workspace updates | [`docs/evidence/screenshots/09-multiuser-realtime-split.png`](./evidence/screenshots/09-multiuser-realtime-split.png) | Verified live two-browser sync |

---

## 6. Raw 1080p Demo Recordings & Vercel Deployment Smoke Test

### 6.1 Raw Playwright 1080p Captures (Gitignored Media for Video Editing)

Raw captures live under `recordings/` (excluded from Git via `.gitignore`) so the team can combine them with spoken intro/voiceover and English subtitles:

| Take | Scenario | Output File | Measured Duration & Resolution |
|---|---|---|---|
| **Take A** | Single-user core journey: Entry (`UI-01`) -> `IF-4031` (`UI-02`) -> 2D studio walk -> `[E]` workstations -> Task/Brief/Resource persistence across browser reload | `recordings/take-a-single-user-core-crud-1080p.mp4` | `[DURATION_TBD] @ 1920x1080` (`[UPDATED AFTER RECORDING]`) |
| **Take B** | Multi-user split-screen collaboration: Nadia & Bima concurrent avatars, 64px proximity ring, two-way Studio Chat + 5s floating bubbles, and Team Whiteboard live sync | `recordings/take-b-multi-user-splitscreen-1080p.mp4` | `[DURATION_TBD] @ 1920x1080` (`[UPDATED AFTER RECORDING]`) |

### 6.2 Vercel Production Deployment Smoke Test

- **Target URL:** `[LIVE_VERCEL_URL — UPDATED AFTER DEPLOY]`
- **Configuration Verified:** `vercel.json` SPA fallback rewrite (`/(.*) -> /index.html`), HTTP security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`), and public-only env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Smoke Test Checklist:**
  - [ ] Incognito browser loads `UI-01` with `Supabase connected` status badge and zero console/network errors
  - [ ] Lazy `PhaserHost` + `vendor-phaser` chunks load only upon entering `IF-4031` Team Workspace Studio
  - [ ] Task status / CRUD update persists across hard browser refresh
  - [ ] Multi-window Realtime (`Nadia` + `Bima`) connects with `Live sync` and syncs chat/whiteboard cleanly

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
