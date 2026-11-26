# Handoff - M6 Studio Collaboration Bar & Studio Chat UI

- **Branch / Worktree:** `feature/m6-studio-chat-ui` (`subagent-CHAT-wt-1795e519`)
- **Owner:** Lane 4 Studio Chat and Collaboration UI Engineer
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `src/components/realtime/StudioCollaborationBar.tsx` - Created Cozy Digital Campus collaboration bar (`StudioCollaborationBar`) implementing `StudioCollaborationBarProps` with realtime sync badge, nearby peers cue, collapsible online teammates roster card, and collapsible persisted Studio Chat panel.
- `src/components/realtime/HANDOFF.md` - Lane handoff summary and verification evidence.

## Exported Entry Points / Contracts
- `StudioCollaborationBar` from `src/components/realtime/StudioCollaborationBar.tsx`
  - Props contract: `StudioCollaborationBarProps` (`src/types/components.ts`)
  - Locked `data-testid` hooks implemented: `realtime-status-badge`, `online-teammates-btn`, `online-teammates-list`, `nearby-teammates-badge`, `studio-chat-toggle`, `studio-chat-unread-badge`, `studio-chat-panel`, `studio-chat-list`, `studio-chat-input`, `studio-chat-send-btn` (plus optional wrapper `studio-collaboration-bar`).
  - Focus bridge contract: invokes `onInputFocusChange(true)` on chat input focus and `onInputFocusChange(false)` on blur, Close button, `Escape`, `chatOpen` collapse, and component unmount.

## Database / Environment Changes
- Migrations added under `supabase/migrations/`: None
- Env vars referenced: None (pure UI component wired through `StudioCollaborationBarProps` callbacks from `App.tsx`)

## Zero-Mock & Verification Evidence
- Real persistence & realtime wiring: `StudioCollaborationBar` has zero mock fallbacks and relies exclusively on parent props (`remotePlayers`, `nearbyPeerIds`, `messages`, `connectionStatus`, `onSendMessage`, `onRetryMessages`) backed by Supabase Postgres/Realtime in peer lanes (`src/services/**`, `src/app/App.tsx`).
- Draft preservation check: `draft` clears only when `await onSendMessage(trimmed)` resolves to `true`; failed (`false`) or rejected sends preserve `draft` and render `sendError` in a `#FAECEB` alert.
- Commands run after final code edit (with temporary `node_modules` junction linked to `C:\Users\Axel Zeed\Development\LearnNexus\node_modules` and removed afterwards):
  - `npm run typecheck` (`tsc --noEmit`): PASS (exit code 0)
  - `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts`): PASS (11/11 tests, 4/4 suites, exit code 0)
  - `npm run build` (`tsc --noEmit && vite build`): PASS (94 modules transformed, exit code 0)
  - `node .../scratch/verify-chat-ui.mjs` (Playwright Chromium harness rendering `StudioCollaborationBar` inside the Cozy shell at `390x844` mobile and `1280x800` desktop): PASS (`PASS [mobile-390]`, `PASS [desktop-1280]`, zero console/page errors, zero horizontal overflow, verified status transitions, `Online (N)` roster + `Nearby` pills + `Escape`/Close focus return, unread badge hide-on-open, `#EEF1E8` loading skeleton with `aria-busy="true"` and zero `animate-pulse`/`animate-bounce`, `#FAECEB` chat/send error alerts + Retry callback, empty state, draft preservation on `false` vs clear on `true`, `onInputFocusChange` true/false lifecycle, `>= 44px` touch targets, and `:focus-visible` `2px solid` outline).

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/*`, `src/services/*`, `src/components/workstation/*`, `package.json`)
- [x] No duplicate navbars, global layouts, or custom theme overrides (`<section>` inside `<main>`, zero `<header>` or `<nav>` elements)
- [x] WCAG AA contrast verified (`contrast-check.py`: `#30343B` on `#EEF1E8` 10.94:1, `#5C665C` on `#EEF1E8` 5.24:1, `#30343B` on `#C9D7BA` 8.28:1, `#8E2F29` on `#FAECEB` 7.05:1, `#FFFFFF` on `#4A6B46` 6.03:1), keyboard navigation (`Tab`/`Enter`/`Escape`), and visible `:focus-visible` verified
- [x] Zero em dashes (`\u2014`) in UI copy, error copy, and comments; loading (`aria-busy="true"`, static `#EEF1E8` blocks, zero `animate-pulse`/`animate-bounce`), empty (cause + next action), and error (cause + retry) states implemented

## Caveats & Next Steps
- `StudioCollaborationBar` was verified against a standalone Vite + Playwright harness (`verify-chat-ui.mjs`) because integration into `src/app/App.tsx` occurs when parallel lanes (`feature/m6-m9-data-realtime`, `feature/m6-phaser-multiplayer`, `feature/m9-project-management`, `feature/m6-studio-chat-ui`) are merged onto `main`.
- When integrating into `src/app/App.tsx`, mount `<StudioCollaborationBar />` inside `<main>` (never inside `<header>`) and wire `onInputFocusChange` to emit `eventBridge.emit('ui:input-focus', { focused })` while keeping `remotePlayers` filtered to `userId !== currentUser.id`.
