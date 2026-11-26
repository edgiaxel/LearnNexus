# Handoff: Lane 1 M6 + M9 Data, Realtime & RLS

- **Branch / Worktree:** `feature/m6-m9-data-realtime`
- **Owner:** Lane 1 Worktree Engineer (`supabase/**`, `src/services/**`, `tests/rls/**`)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `supabase/migrations/20261126000002_m6_m9_collab_pm.sql` - Added M6/M9 schema extensions (`room_messages`, `whiteboard_notes`, `whiteboard_strokes`, `activity_logs`), expanded team-member column grants and RLS policies on `projects`, `tasks`, and `resources` (including `resources_url_http_check`), `log_project_activity()` `security definer` trigger function, `REPLICA IDENTITY FULL` and idempotent `supabase_realtime` publication wiring for 7 tables, and idempotent starter row inserts.
- `supabase/seed.sql` - Added idempotent `ON CONFLICT (id) DO UPDATE` upserts for the 2 starter `whiteboard_notes` rows (`88888888-8888-4888-8888-888888888801`, `88888888-8888-4888-8888-888888888802`) and 1 starter `room_messages` welcome row (`99999999-9999-4999-8999-899999999901`).
- `src/services/realtimeUtils.ts` - Created pure TypeScript helpers (`getCharacterSpriteKey`, `truncateChatBubbleText`, `normalizeStrokePoints`) with zero browser or Supabase imports so Node native tests import directly.
- `src/services/academicService.ts` - Replaced all 18 `pendingContractResult` stubs with real Supabase Postgres queries and mutations (`getTeamMembers`, `updateProjectOverview`, `createTask`, `updateTask`, `deleteTask`, `createResource`, `deleteResource`, `getProjectActivity`, `getRoomMessages`, `sendRoomMessage`, `getWhiteboardNotes`, `createWhiteboardNote`, `updateWhiteboardNote`, `deleteWhiteboardNote`, `getWhiteboardStrokes`, `createWhiteboardStroke`, `deleteWhiteboardStroke`, `clearWhiteboardStrokes`), added pre-write `auth.getSession()` guard, added input validation, and included `assigneeId` in `mapTaskRow`.
- `src/services/realtimeService.ts` - Created `SupabaseStudioRealtimeRepository` (`realtimeService: StudioRealtimeRepository`) and re-exported `getCharacterSpriteKey` and `truncateChatBubbleText`, implementing `studio:${teamId}` channel presence (deduplicated excluding self), broadcast (`avatar:move`, `avatar:chat`, `workspace:sync`), `postgres_changes` across all 7 Realtime tables, and clean `disconnect()`.
- `tests/rls/verify-rls.mjs` - Expanded RLS verification to cover all 13 tables across `anon`, Nadia, Bima, and Rani, including authorized CRUD and cleanup restoring exact seeded counts (`5+3` tasks, `4+2` resources, `2+0` whiteboard notes, `0` strokes), `activity_logs` client-insert `42501` verification, `javascript:` URL check `23514` rejection, column-level update exclusions (`tasks.project_id`, `projects.team_id`, `resources.project_id`), and cross-team write isolation.
- `src/services/HANDOFF.md` - Lane handoff document.

## Exported Entry Points / Contracts
- `src/services/academicService.ts`: `SupabaseAcademicRepository`, `academicService: AcademicRepository` (implements all `AcademicRepository` methods from `src/types/database.ts`)
- `src/services/realtimeUtils.ts`: `getCharacterSpriteKey(userId, role?)`, `truncateChatBubbleText(raw, maxLen = 56)`, `normalizeStrokePoints(points)`
- `src/services/realtimeService.ts`: `SupabaseStudioRealtimeRepository`, `realtimeService: StudioRealtimeRepository`, re-exports `getCharacterSpriteKey`, `truncateChatBubbleText`

## Database / Environment Changes
- Added migration `supabase/migrations/20261126000002_m6_m9_collab_pm.sql` (not pushed from this worktree; orchestrator pushes after merge).
- Updated `supabase/seed.sql` with starter `whiteboard_notes` and `room_messages` rows.
- References existing `.env` keys `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; zero secrets committed.

## Zero-Mock & Verification Evidence
- Zero mock data or fallback payloads: every read/write in `academicService.ts` targets real Supabase Postgres/RLS with pre-write `auth.getSession()` checks and maps failures via `mapSupabaseError`.
- `npm run typecheck` (`tsc --noEmit` via temporary `node_modules` junction, cleaned afterwards): **PASS** (exit `0`).
- `npm run build` (`tsc --noEmit && vite build`): **PASS** (exit `0`, `95` modules transformed; temporary `dist/` removed after check).
- `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts`): **PASS** (`11/11` tests across `4` suites, `0` failed, `0` skipped).
- Direct Node import verification of `src/services/realtimeUtils.ts`: **PASS** (`getCharacterSpriteKey` pinned IDs `'adam'`/`'bob'` + deterministic pool hash, `truncateChatBubbleText` em-dash replacement + truncation, `normalizeStrokePoints` clamping/rounding/500-point cap).
- `node --check tests/rls/verify-rls.mjs`: **PASS** (exit `0`).

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `HANDOFF.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/*`, `src/components/*`, `package.json`, `supabase/migrations/20261126000001_m2_core_schema.sql`)
- [x] No duplicate navbars, global layouts, or custom theme overrides (service/DB/RLS lane only)
- [x] UI/React accessibility controls not touched in this lane; error messages and trigger summaries adhere to plain language and Contrast/UI contract rules
- [x] Zero literal em dashes (`\u2014`) in any authored SQL, comments, error copy, or handoff docs

## Caveats & Next Steps
- **Migration & Live RLS Execution Pending Orchestrator Push:** Per worktree instructions, `supabase db push` was not run from this worktree and `.env` is absent here, so `npm run test:rls` (`node tests/rls/verify-rls.mjs`) has been syntax-checked (`node --check`) and must be executed against the remote Supabase instance by the orchestrator after merging and running `supabase db push` + `supabase/seed.sql`.
- **Append-Only `room_messages` & `activity_logs`:** `verify-rls.mjs` executes one authorized `room_messages` insert by Nadia (`Studio workspace sync check completed.`) and triggers `activity_logs` entries via authenticated writes while restoring exact seeded counts on all mutable/deletable tables (`projects`, `tasks`, `resources`, `whiteboard_notes`, `whiteboard_strokes`).
