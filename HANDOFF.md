# Handoff — Pre-M4 Scoped M6 + M9 Prototype Showcase

- **Branch / Worktree:** `main` (merged `feature/m6-m9-data-realtime`, `feature/m6-phaser-multiplayer`, `feature/m9-project-management`, and `feature/m6-studio-chat-ui` via `--no-ff`; temporary worktrees and feature branches removed)
- **Owner:** Main Orchestrator (with 4 isolated `wt` lanes: `DB`, `GAME`, `PM`, `CHAT`)
- **Linked Contract:** `UI_CONTRACT.md` (Locked M0–M3 + Scoped M6/M9 contracts on `main`)
- **Date:** 26 November 2026

## Completed Scope & Exit Criteria

- **Shared Scoped M6 + M9 Contracts (`UI_CONTRACT.md`, `src/types/*`, `src/app/routerContract.ts`):**
  - Extended `WorkstationId` with `'whiteboard'` (`UI-08b`, `WORKSTATION_META.whiteboard` `Team Whiteboard`), added realtime presence/broadcast/bubble types (`CharacterSpriteKey`, `AvatarPresencePayload`, `AvatarMoveBroadcast`, `AvatarChatBubbleEvent`, `WorkstationSyncKind`), and added domain records (`RoomMessageRecord`, `WhiteboardNoteRecord`, `WhiteboardStrokeRecord`, `ActivityLogRecord`, CRUD payloads).
- **Supabase Migration, Realtime & 13-Table RLS (`supabase/migrations/20261126000002_m6_m9_collab_pm.sql`, `supabase/seed.sql`, `src/services/*`, `tests/rls/verify-rls.mjs`):**
  - Applied live migration on remote Supabase project `zftymjkcrdkhtshazzmw` adding team-member CRUD grants & RLS policies across `projects`, `tasks`, and `resources`, `resources_url_http_check`, tables `room_messages`, `whiteboard_notes`, `whiteboard_strokes`, and `activity_logs`, security-definer `log_project_activity()` audit trigger, `REPLICA IDENTITY FULL` + `supabase_realtime` publication across 7 tables, and idempotent seeded notes.
  - Replaced stubs in `src/services/academicService.ts` with 18 live Supabase CRUD/chat/whiteboard/activity methods; added `src/services/realtimeService.ts` (`connectStudioRoom`, Presence, `80ms`-throttled Broadcast, `postgres_changes` + `workspace:sync` fallback) and pure `src/services/realtimeUtils.ts`.
  - Expanded `tests/rls/verify-rls.mjs` across all 4 actors (`anon`, `nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu`) and all 13 tables, verifying cleanup restores seeded row counts.
- **Multiplayer Phaser Studio & 4th Whiteboard Workstation (`src/game/*`):**
  - Bound north-wall `chalkboard_sprint` (`int16_obj_0134`) in `src/game/maps/campusStudioMap.json` to `objectId: "whiteboard-board"` -> `'whiteboard'`.
  - Updated `src/game/scenes/CampusScene.ts` and `src/game/PhaserHost.tsx` to preload `adam`, `alex`, `amelia`, and `bob` with `Phaser.Textures.FilterMode.NEAREST`, emit throttled `avatar:local-move`, render interpolated pixel-snapped remote teammates + `resolution: 3` crisp nametags, draw 4-tile (`64px`) sage proximity rings (`avatar:proximity-peers`), display 5s `avatar:chat-bubble` pills, and suspend Phaser keyboard capture on `ui:input-focus`.
- **Full Project Management & Whiteboard UI (`src/components/workstation/*`):**
  - Upgraded `ProjectOverviewPanel.tsx` (inline `Edit Brief`, live `"In studio"` roster badges, trigger-backed `Recent Activity`), `TasksSprintBoardPanel.tsx` (real sprint progress summary, `+ New Task`, inline task Edit, two-step Delete, team roster assignee select, due dates, preserving M3 `Unsaved change`/`Retry save`/`Revert` UX), `ResourceLibraryPanel.tsx` (`+ Add Resource` with `parseSafeHttpUrl`, two-step Delete), `WorkstationPanel.tsx`, and `workstationUtils.ts` (`toDateInputValue`, `dateInputToIso`).
  - Created `WhiteboardPanel.tsx` featuring a `480x260` shared HTML5 sketch pad (4 Cozy WCAG pen colors, 2 stroke widths, Undo, two-step Clear) and persisted pastel sticky notes.
- **Studio Collaboration HUD, Central App Wiring & Suites (`src/components/realtime/StudioCollaborationBar.tsx`, `src/app/App.tsx`, `tests/*`):**
  - Added `StudioCollaborationBar.tsx` inside `<main>` (live Realtime status pill, online/nearby peer chips, collapsible `room_messages` studio chat drawer) keeping `header [role="status"]` untouched (`Supabase connected`).
  - Wired `App.tsx` to connect `realtimeService.connectStudioRoom`, coordinate `PhaserHost` ready-state remote replay, pass team roster / `onlineMemberIds` / `syncRevisionByWorkstation` / `onDataMutated`, and trigger floating avatar chat bubbles.
  - Added `tests/unit/m6-m9-guards.test.ts` and `tests/e2e/m6-m9-realtime-and-pm.spec.ts` covering concurrent multi-context avatar/chat sync, cross-browser task CRUD, brief edit + activity log + resource CRUD, and whiteboard sketch + sticky note sync.

## Files Touched

- Central Contracts, Docs & Shell: `UI_CONTRACT.md`, `package.json`, `src/types/contracts.ts`, `src/types/database.ts`, `src/types/components.ts`, `src/types/gameDebug.ts`, `src/app/routerContract.ts`, `src/app/App.tsx`, `HANDOFF.md`, `README.md`, `docs/MILESTONES.md`, `docs/CHANGELOG.md`, `docs/DESIGN.md`
- Database, Services & RLS: `supabase/migrations/20261126000002_m6_m9_collab_pm.sql`, `supabase/seed.sql`, `src/services/academicService.ts`, `src/services/realtimeService.ts`, `src/services/realtimeUtils.ts`, `src/services/HANDOFF.md`, `tests/rls/verify-rls.mjs`
- Phaser Studio: `src/game/maps/campusStudioMap.json`, `src/game/scenes/CampusScene.ts`, `src/game/PhaserHost.tsx`, `src/game/HANDOFF.md`
- Workstation & Collaboration UI: `src/components/workstation/WorkstationPanel.tsx`, `ProjectOverviewPanel.tsx`, `TasksSprintBoardPanel.tsx`, `ResourceLibraryPanel.tsx`, `WhiteboardPanel.tsx`, `workstationUtils.ts`, `src/components/workstation/HANDOFF.md`, `src/components/realtime/StudioCollaborationBar.tsx`, `src/components/realtime/HANDOFF.md`
- Unit & E2E Tests: `tests/unit/m6-m9-guards.test.ts`, `tests/e2e/m6-m9-realtime-and-pm.spec.ts`

## Verified Commands & Results

- `npm run typecheck` (`tsc --noEmit`): **PASS** (exit `0`)
- `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts tests/unit/m6-m9-guards.test.ts`): **PASS** (`17/17` tests across `8` suites, `0` failed, `0` skipped)
- `npm run test:rls` (`node tests/rls/verify-rls.mjs`): **PASS** (`4/4` actors `anon`, `nadia.demo@learnnexus.edu`, `bima.demo@learnnexus.edu`, `rani.demo@learnnexus.edu` across all `13` tables; seeded row counts restored cleanly)
- `npm run build` (`tsc --noEmit && vite build`): **PASS** (exit `0`, `98` modules transformed)
- Static antislop scan (`src/`, `tests/`): **PASS** (`0` em dashes `\u2014` outside `src/styles/index.css:1` header comment; `0` `animate-pulse` / `animate-bounce` classes)
- `npx playwright test --reporter=list` (`npm run test:e2e`): **PASS** (`22 passed (2.0m)` across M1, M2, M2.5, M3, and Scoped M6 + M9 specs)

## Database & Environment State

- Remote project: `zftymjkcrdkhtshazzmw` (`ap-southeast-1`) running migrations `20261126000001_m2_core_schema` and `20261126000002_m6_m9_collab_pm`.
- Deferred out of scope (remaining Planned): M7 multi-map campus & layout customizer, M8 Lecturer Studio Management (`UI-08`), self-service signup/avatar picker/admin (`M10`), WebRTC audio/video, Supabase Storage binary uploads, and Lecturer deliverable grading (`UI-09`).

## Caveats & Next Steps (M4 Quality & Integration)

- **Caveat (Bundle Size):** Single Vite client chunk exceeds `500 kB` (`~2.13 MB`) due to Phaser 3; evaluate manual vendor chunking during M4/M10 hardening.
- **Caveat (Persisted Studio Chat Messages):** `room_messages` rows created during multi-user E2E chat tests remain persisted in Supabase Postgres by design (and are capped to recent room history on load).
- **Next Steps (M4 Quality & Integration -> M5 Release):** Complete final M4 P0/M6/M9 acceptance checklist audit against `PRD.md`, review `.env`/bundle hygiene, rehearse desktop/laptop demo flow (`Nadia` + `Bima`), deploy to Vercel, and prepare STACK 2026 semifinal submission before 30 Nov 2026, 23:59 WIB.
