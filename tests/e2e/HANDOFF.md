# Handoff - M4/M5 QA Audit & Media Evidence Scripts

- **Branch / Worktree:** `feature/m4-m5-qa-evidence` (worktree `subagent-QA-wt-f8d21a4b` branched from `main` at `f604b8a`)
- **Owner:** Lane 1 (QA & Media Evidence)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `tests/e2e/m4-quality-audit.spec.ts` - Playwright M4 quality audit covering lazy Phaser isolation & `dist/assets` chunk/secret verification, two-way live Studio Chat and avatar bubbles between Nadia and Bima, keyboard/focus/cursor accessibility (`Tab`/`Enter`/`Escape` + focus restoration to `phaser-canvas-container`), and responsive layout/antislop/safe-link checks across `1280x720`, `1024x700`, and `390x844`.
- `scripts/capture-evidence.mjs` - Standalone ES module Playwright script capturing 9 PNG screenshots (`01` through `09`) into `docs/evidence/screenshots/` with auto-managed Vite server (`ensureServer()` + Windows `taskkill` cleanup), whiteboard stroke undo cleanup, and `ffmpeg` `hstack` 1920x1080 multi-user composite (`09-multiuser-realtime-split.png`).
- `scripts/record-demo.mjs` - Standalone ES module Playwright + `ffmpeg` script producing 1080p 30fps H.264 demo videos (`recordings/take-a-single-user-core-crud-1080p.mp4` and `recordings/take-b-multi-user-splitscreen-1080p.mp4`) with `ensureServer()`, smooth WASD navigation, Postgres reload persistence proof, multi-user chat/whiteboard sync, and temporary record cleanup.
- `tests/e2e/HANDOFF.md` - Lane 1 handoff report.

## Exported Entry Points / Contracts
- `tests/e2e/m4-quality-audit.spec.ts` - Playwright spec executed via `npx playwright test tests/e2e/m4-quality-audit.spec.ts`
- `scripts/capture-evidence.mjs` - Node CLI script executed via `node scripts/capture-evidence.mjs` (uses `BASE_URL` and `FFMPEG_PATH` env overrides)
- `scripts/record-demo.mjs` - Node CLI script executed via `node scripts/record-demo.mjs` (uses `BASE_URL` and `FFMPEG_PATH` env overrides)

## Database / Environment Changes
- Migrations added under `supabase/migrations/`: `None`
- Env vars referenced: `BASE_URL` (optional, defaults to `http://127.0.0.1:5173`), `FFMPEG_PATH` (optional, defaults to `C:\ffmpeg\bin\ffmpeg.exe`); target app still relies on standard `.env` Vite/Supabase configuration during execution. Zero secrets committed.

## Zero-Mock & Verification Evidence
- All E2E checks and media automation scripts exercise real Supabase Auth demo accounts (`team_lead` Nadia, `member` Bima, `guest_empty` Rani), real Postgres CRUD/reload persistence, and real Supabase Realtime presence/broadcast/Postgres Changes without mocks or hardcoded fallbacks.
- Checks run directly in this worktree (no `node_modules` or `.env` installed per lane isolation rules):
  - `node --check scripts/capture-evidence.mjs` -> PASS (exit code 0)
  - `node --check scripts/record-demo.mjs` -> PASS (exit code 0)
  - `node --experimental-strip-types --check tests/e2e/m4-quality-audit.spec.ts` -> PASS (exit code 0)
  - Static em-dash (`U+2014`) scan across `tests/e2e/m4-quality-audit.spec.ts`, `scripts/capture-evidence.mjs`, `scripts/record-demo.mjs`, and `tests/e2e/HANDOFF.md` -> PASS (0 matches)
- Pending integration/runtime checks (to run on the main workspace with `node_modules`, `.env`, Playwright Chromium, and `ffmpeg` available):
  - `npm run typecheck`
  - `npm run build`
  - `npx playwright test tests/e2e/m4-quality-audit.spec.ts`
  - `node scripts/capture-evidence.mjs`
  - `node scripts/record-demo.mjs`

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `HANDOFF.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/**`, `src/services/**`, `supabase/**`, `.github/**`, `vercel.json`, `LICENSE`, `.gitignore`, `package.json`, `vite.config.ts`)
- [x] No duplicate navbars, global layouts, or custom theme overrides
- [x] Keyboard navigation (`Tab`/`Enter`/`Escape`), `:focus-visible`, pointer cursors, and Escape focus restoration explicitly audited in `tests/e2e/m4-quality-audit.spec.ts`
- [x] Zero em dashes (`U+2014`), zero `.animate-pulse`/`.animate-bounce`, and safe `http(s)` + `noopener` resource link assertions implemented in `tests/e2e/m4-quality-audit.spec.ts`

## Caveats & Next Steps
- Because this shared worktree intentionally omits `node_modules` and `.env`, TypeScript compilation (`npm run typecheck`) and live browser execution (`playwright test`, `capture-evidence.mjs`, `record-demo.mjs`) were not executed inside this worktree.
- When running `capture-evidence.mjs` and `record-demo.mjs` against a seeded local or hosted Supabase instance, temporary tasks, whiteboard strokes, and sticky notes are automatically cleaned up; the demo chat lines sent into `room_messages` remain in chat history (matching `AcademicRepository` which intentionally omits message deletion).
