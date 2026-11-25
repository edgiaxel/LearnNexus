# Handoff: M1 Game Engine Integration

- **Branch / Worktree:** `feature/m1-game-engine` (`C:\Users\Axel Zeed\Development\LearnNexus\.worktrees\game`)
- **Owner:** M1 Game Engine Engineer
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `src/game/PhaserHost.tsx` - Mounts strictly one Phaser `<canvas>` inside `[data-testid="phaser-canvas-container"]` (clearing leftover canvases for React 19 StrictMode and unmount), syncs resizes via `ResizeObserver` to `game.scale.resize(...)`, disposes scene/debug bindings synchronously on unmount, and restores container focus on `panel:closed`.
- `src/game/createGame.ts` - Exports `createGame(parent: HTMLElement): Phaser.Game` with ADR-012 sharpness settings (`pixelArt: true`, `antialias: false`, `roundPixels: true`, `Phaser.Scale.RESIZE`, Arcade Physics zero-gravity, `[new CampusScene()]`).
- `src/game/scenes/CampusScene.ts` - Ports Config A (`16px` native tiles + integer zoom `3` for viewport width >= 640 and `2` for < 640), `Phaser.Textures.FilterMode.NEAREST` across all 5 textures, tilemap layers, static/object colliders, Y-sorted furniture/player depth, Adam 4-direction animations, workstation mapping (`overview`, `tasks`, `resources` via `WORKSTATION_META`), `keydown-E` and sprite `pointerdown` interaction, `workstation:interact` / `panel:closed` keyboard lock & resume, and `window.__LEARNNEXUS_GAME__` (`getState()`, `teleportToWorkstation()`).
- `src/game/maps/campusStudioMap.json` - Copied studio map JSON from `prototype/environment-spike/src/maps/campusStudioMap.json`.
- `public/assets/atlases/*` - Copied processed Phaser interior atlases (`interiors_16x16.*`, `interiors_48x48.*`).
- `public/assets/tilesets/*` - Copied processed Phaser tilesets (`Room_Builder_free_16x16.png` and companion tilesets).
- `public/assets/characters/*` - Copied processed Phaser character spritesheets (`Adam_*`, `Alex_*`, `Amelia_*`, `Bob_*`, `Characters_MV.png`, `characters-phaser-anims.json`).
- `src/game/bridge/eventBridge.ts` - Verified existing typed bridge (`on`, `off`, `emit` over snapshot copy, `clear`) already matches `BridgeEvents`, `BridgeEventName`, and `BridgeHandler`; left unmodified.
- `HANDOFF_M1_GAME_ENGINE.md` - Worktree handoff summary.

## Exported Entry Points / Contracts
- `PhaserHost` and `PhaserHostProps` (`src/game/PhaserHost.tsx`)
- `createGame(parent: HTMLElement): Phaser.Game` (`src/game/createGame.ts`)
- `CampusScene` (`src/game/scenes/CampusScene.ts`)
- `eventBridge` (`src/game/bridge/eventBridge.ts`, unchanged)
- `window.__LEARNNEXUS_GAME__` implementing `LearnNexusGameApi` (`src/types/gameDebug.ts`)

## Database / Environment Changes
- Migrations added under `supabase/migrations/`: None
- Env vars referenced: None

## Zero-Mock & Verification Evidence
- Zero mock game data or fake backend persistence added; workstation titles import directly from `src/app/routerContract.ts` (`WORKSTATION_META`), and all bridge events strictly conform to `src/types/contracts.ts`.
- Commands run inside `C:\Users\Axel Zeed\Development\LearnNexus\.worktrees\game`:
  - `npm run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`:
    - `tsc --noEmit` -> PASSED (exit 0, 0 errors)
    - `vite build` -> PASSED (exit 0, `82 modules transformed`, built `dist/index.html`, `dist/assets/index-C-fTPVZp.css`, `dist/assets/index-YgSXdsRl.js` in `21.72s`)
  - Headless Chromium Playwright runtime smoke script against `vite` dev server (`http://127.0.0.1:5179`, React 19 StrictMode enabled) -> PASSED (exit 0):
    - Desktop `1280x720`: `canvasCount: 1`, `ready: true`, `tileSize: 16`, `cameraZoom: 3`, `roundPixels: true`, `pixelArt: true`, `antialias: false`, `filterModes: {"room_builder_16":1,"interiors_16":1,"adam_idle":1,"adam_idle_anim":1,"adam_run":1}`, `playerTileX: 3.5`, `playerTileY: 11.81`
    - `KeyW` walk: moved to `(3.5, 10.55)`, `facing: "up"`, `activeAnim: "adam_idle_anim_up"`
    - `teleportToWorkstation` + `E` + `Escape` verified for `overview`, `tasks`, `resources`: drawer opened with matching `data-workstation-id`, `panelOpenDuring: true`, `movedWhileLocked: false`, `panelOpenAfter: false`, `posPreserved: true`, focus returned to `[data-testid="phaser-canvas-container"]`
    - Prompt click + drawer Close button verified (`panelOpen: false`, focus returned to `phaser-canvas-container`)
    - Mobile resize `390x844`: `cameraZoom: 2`, `canvasWidth: 344`, `canvasHeight: 571`
    - Leave Studio / Enter Studio lifecycle: `afterLeave: {"canvases":0,"hasDebugApi":false}`, `afterReturnCount: 1`
    - `Errors: []`, `Failed asset reqs: []`

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `HANDOFF_TEMPLATE.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/lib/*`, `src/main.tsx`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `docs/*`, `tests/*`, `.env*`)
- [x] No duplicate navbars, global layouts, or custom theme overrides
- [x] Keyboard accessibility preserved (canvas focus restored on `panel:closed`; Space and Shift omitted from Phaser global key capture so React buttons stay Space-activatable; Phaser keyboard input and global capture disabled while workstation drawers are open)
- [x] Zero em dashes in UI copy or code comments; concise comments focused on why

## Caveats & Next Steps
- The end-to-end Playwright suite under `tests/e2e/**` is owned by the parallel `feature/e2e-verification` worktree and was not edited here; full cross-worktree `npm run test:e2e` should run after merging `feature/m1-game-engine` and `feature/e2e-verification` onto `main`.
- `public/assets/` includes the full copied `processed-assets/phaser/{atlases,tilesets,characters}` directories as requested; `CampusScene` loads only the 16px assets (`Room_Builder_free_16x16.png`, `interiors_16x16.*`, `Adam_idle_16x16.png`, `Adam_idle_anim_16x16.png`, `Adam_run_16x16.png`).
