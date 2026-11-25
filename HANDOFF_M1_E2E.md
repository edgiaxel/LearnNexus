# Handoff: M1 E2E Verification Specs

- **Branch / Worktree:** `feature/e2e-verification` (`C:\Users\Axel Zeed\Development\LearnNexus\.worktrees\e2e`)
- **Owner:** M1 E2E Verification Engineer
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `tests/e2e/phaser-lifecycle.spec.ts`: Added 5 Playwright tests covering app shell tokens, accessibility landmarks, zero em dashes, live Supabase health badge, ADR-012 sharpness on standard and `deviceScaleFactor: 2` DPI, Leave/Enter Studio unmount/remount lifecycle, and integer zoom responsiveness (`1280x720`, `1024x700`, `390x844`).
- `tests/e2e/workstation-bridge.spec.ts`: Added 3 Playwright tests covering keyboard avatar movement and idle animation transitions, `[E]` interaction across all 3 workstations (`overview`, `tasks`, `resources`) with input lock and `Escape` focus return, and prompt pointer cursor + `Tab` focus trapping + Close button focus restoration.
- `HANDOFF_M1_E2E.md`: M1 E2E verification handoff document.

## Exported Entry Points / Contracts
- No application source exports modified; test specs consume `WORKSTATION_META` from `src/app/routerContract.ts`, `WorkstationId` from `src/types/contracts.ts`, and `LearnNexusGameState` / `window.__LEARNNEXUS_GAME__` from `src/types/gameDebug.ts`.

## Database / Environment Changes
- Migrations: `None`
- Env vars referenced: None directly in test code (`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at runtime for the live `/auth/v1/health` badge check in `phaser-lifecycle.spec.ts`).

## Zero-Mock & Verification Evidence
- Zero mocks or fake persistence: tests navigate directly to `/` and assert live Supabase `/auth/v1/health` resolution (`Supabase connected`) and real `window.__LEARNNEXUS_GAME__` state without mocking APIs or Phaser modules.
- Commands run in `C:\Users\Axel Zeed\Development\LearnNexus\.worktrees\e2e`:
  - `npm run typecheck` (`tsc --noEmit`): **PASS** (exit code `0`)
  - `npx playwright test --list`: **PASS** (exit code `0`, discovered `8 tests in 2 files`)
- `npm run test:e2e`: **Not yet executed in this isolated worktree** (deferred to central `main` integration after merging `feature/m1-game-engine`, because `src/game/PhaserHost.tsx` in `.worktrees\e2e` is still the M1 stub without `window.__LEARNNEXUS_GAME__`).

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `HANDOFF_TEMPLATE.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/game/*`, `src/lib/*`, `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `docs/*`, `.env*`)
- [x] No duplicate navbars, global layouts, or custom theme overrides
- [x] Keyboard navigation (`ArrowRight`, `ArrowUp`, `KeyE`, `Tab`, `Escape`), drawer `role="dialog"` focus trapping, canvas focus restoration, and `cursor: pointer` verified in E2E assertions (runtime execution pending `main` merge)
- [x] Zero em dashes (`\u2014`) in rendered UI text asserted via `document.body.innerText` check

## Caveats & Next Steps
- On `App.tsx`'s `spaces` view, both `<header>` and `<main>` render `[data-testid="enter-studio-btn"]`; `phaser-lifecycle.spec.ts` explicitly clicks `main [data-testid="enter-studio-btn"]` to avoid a Playwright strict-mode duplicate-locator error.
- Next step: Merge `feature/m1-game-engine` and `feature/e2e-verification` on `main` (with `.env` present) and run `npm run test:e2e` to execute all 8 Playwright specs end-to-end.
