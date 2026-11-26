# Handoff: Lane 2 M6 Phaser Multiplayer & 4th Whiteboard Workstation

- **Branch / Worktree:** `feature/m6-phaser-multiplayer` (`subagent-GAME-wt-0a379a1f`)
- **Owner:** Game Engine Lane (`src/game/**`)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `src/game/maps/campusStudioMap.json`: Added `"interaction"` metadata (`objectId: "whiteboard-board"`, `label: "Team Whiteboard"`, `category: "Collaboration"`, `radiusTiles: 2.3`) solely on existing `chalkboard_sprint` (`tileX: 14.3, tileY: 1.4`). Floors, walls, borders, collision grid, and all other objects left untouched.
- `src/game/scenes/CampusScene.ts`:
  - Added `'whiteboard-board': 'whiteboard'` in `WORKSTATION_ID_MAP` while preserving `TELEPORT_TARGETS.whiteboard = { x: 14.4, y: 4.0 }`.
  - Preloaded all 4 characters (`adam`, `alex`, `amelia`, `bob` `_idle_anim` and `_run` 16x32 sheets plus `adam_idle`), enforced `Phaser.Textures.FilterMode.NEAREST` on all 11 textures in `TEXTURE_KEYS`, and returned all of them in `getFilterModes()`.
  - Registered `<sprite>_idle_anim_<dir>` (8 fps) and `<sprite>_run_<dir>` (10 fps) for all 4 sprites with `'adam'` kept as default local sprite so existing M1/M2/M3 E2E tests pass unchanged.
  - Added `'avatar:local-identity'` handler storing `localUserId`, `localDisplayName`, and validated `localSpriteKey` while switching animations cleanly without resetting player coordinates.
  - Added throttled (~80ms) `'avatar:local-move'` emission while walking, immediate `moving: false` emission on stop, and initial-position emission on `'avatar:remote-sync'` when new remote peers appear.
  - Implemented `Map<string, RemoteAvatarRuntime>` handling `'avatar:remote-sync'`, `'avatar:remote-move'`, and `'avatar:remote-leave'` (ignoring packets matching `localUserId`), exponential lerp (`1 - Math.exp(-12 * dt)`), integer pixel snapping (`Math.round(x), Math.round(y)`), `10 + renderY` depth sorting, directional run/idle animations, and high-DPI Cozy nametags (`#FFFFFF` / `#757E74`, `resolution: Math.max(3, window.devicePixelRatio || 2)`, `scale = 1 / zoom`, updated on `handleResize`).
  - Implemented 64px (4-tile) soft-sage proximity ground rings (`0xc9d7ba` fill alpha `0.22`, `0xa4b99c` stroke) beneath local and nearby remote avatars plus sorted `'avatar:proximity-peers'` change emission.
  - Implemented `Map<string, ChatBubbleRuntime>` handling `'avatar:chat-bubble'` for both local and remote `userId` with Cozy `#FFFFFF` / `#757E74` pills (`#30343B` text truncated to <=56 chars, `resolution: 3` scaled `1 / zoom`, depth `9995`), motion tracking, resize rescaling, and 5000ms auto-expiration.
  - Added `'ui:input-focus'` handler tracking `externalInputFocused`, stopping movement and calling `disableGlobalCapture()` / `resetKeys()` on focus, restoring global capture on blur when `!this.panelOpen`, and guarding `update()` and `handleKeyDownE`.
  - Updated `installDebugApi().getState()` with real `localSpriteKey`, `remotePlayerCount`, `remotePlayerIds`, `nearbyPeerIds`, and `activeChatBubbleCount`, and destroyed all added sprites, text objects, graphics, and bridge listeners in `cleanup()`.
- `src/game/PhaserHost.tsx`: Added optional `localIdentity?: LocalAvatarIdentity` prop and emitted `'avatar:local-identity'` on `campus:ready` and on identity value changes via refs without recreating the Phaser game instance.
- `src/game/HANDOFF.md`: Lane handoff report.

## Exported Entry Points / Contracts
- `PhaserHost` and `PhaserHostProps` (extended with optional `localIdentity?: LocalAvatarIdentity`) and `LocalAvatarIdentity` in `src/game/PhaserHost.tsx`.
- `CampusScene` in `src/game/scenes/CampusScene.ts` conforming to `BridgeEvents` (`src/types/contracts.ts`) and `LearnNexusGameApi` (`src/types/gameDebug.ts`).
- Note: `src/game/PhaserHost.tsx` keeps `localIdentity` optional so existing callers and M1/M2/M3 routes continue working without modification until integrated on `main`.

## Database / Environment Changes
- Database migrations: `None` (owned by `feature/m6-m9-data-realtime`).
- Environment variables: `None`.

## Zero-Mock & Verification Evidence
- Phaser layer remains strictly spatial (`src/game/**`) with zero mocked persistence or inline data substitutions; multiplayer state is driven exclusively by typed `eventBridge` packets from the Supabase Realtime layer.
- Commands run via temporary `node_modules` directory junction (`cmd /c mklink /J node_modules "C:\Users\Axel Zeed\Development\LearnNexus\node_modules"` then `cmd /c rmdir node_modules`):
  - `npm run typecheck` (`tsc --noEmit`): PASS (exit code 0, zero errors).
  - `npm run build` (`tsc --noEmit && vite build`): PASS (exit code 0, 94 modules transformed, built in ~9.3s).
  - `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts`): PASS.
- E2E Playwright specs (`npm run test:e2e`): Not run in this isolated worktree (full multiplayer integration requires peer lanes `feature/m6-m9-data-realtime`, `feature/m9-project-management`, `feature/m6-studio-chat-ui`, and `src/app/App.tsx` wiring on `main`).

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `src/services/*`, `src/components/*`, `package.json`)
- [x] Zero duplicate navbars, global layouts, or productivity UI rendered inside Phaser canvas
- [x] ADR-012 crisp pixel rendering preserved (`pixelArt: true`, `antialias: false`, `roundPixels: true`, `NEAREST` filter mode on all 11 textures, integer camera zoom 2 or 3, integer sprite snapping)
- [x] Cozy Digital Campus tokens applied to canvas overlays (`#FFFFFF`, `#757E74`, `#30343B`, `#C9D7BA`, `#A4B99C`)
- [x] Zero em dashes (`\u2014`) and zero `animate-pulse` / `animate-bounce` in all touched files

## Caveats & Next Steps
- `src/app/App.tsx` (locked during parallel work) will pass `localIdentity` into `<PhaserHost />` and wire `StudioRealtimeConnection` events to `eventBridge` (`avatar:remote-sync`, `avatar:remote-move`, `avatar:remote-leave`, `avatar:chat-bubble`, `avatar:local-move`, `avatar:proximity-peers`, `ui:input-focus`) during orchestrator integration on `main`.
- End-to-end Playwright verification of multiplayer sync, whiteboard drawer interaction, chat bubbles, and input-focus keyboard isolation should run after integrating all four M6/M9 lanes onto `main`.
