# Changelog

Notable, meaningful changes to LearnNexus are documented here.

This file records completed work only. Planned features and unfinished tasks belong in `docs/MILESTONES.md` or GitHub Issues.

## [Unreleased]

### Added
- Scaffolded M1 React 19 + TypeScript + Vite 6 + Tailwind v4 + Phaser `3.88.2` + Playwright baseline (`package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`).
- Added Cozy Digital Campus shell (`src/app/App.tsx`) with live Supabase health verification (`src/lib/supabase.ts`), Leave/Enter Studio routing, accessible right drawer (`role="dialog"`, `Tab` trap, `Escape` focus return), and honest M1 empty states.
- Integrated Config A sharp Phaser 3 studio (`src/game/createGame.ts`, `src/game/scenes/CampusScene.ts`, `src/game/maps/campusStudioMap.json`, `src/game/PhaserHost.tsx`, `src/game/bridge/eventBridge.ts`, `src/types/gameDebug.ts`) and copied processed pixel-art atlases, tilesets, and character sheets to `public/assets/`.
- Mapped studio interactables (`workstation-overview` -> `overview`, `meeting-table` -> `tasks`, `resource-shelf` -> `resources`) using `WORKSTATION_META`.
- Added Playwright E2E suite (`tests/e2e/phaser-lifecycle.spec.ts` and `tests/e2e/workstation-bridge.spec.ts`) verifying single-canvas lifecycle, 1x and 2x HiDPI ADR-012 sharpness, responsive integer zoom, keyboard walking, and workstation bridge focus management (`8/8` passing).
- Locked shared TypeScript domain, bridge, and repository contracts in `src/types/contracts.ts` and `src/types/database.ts`.
- Locked central route table, transitions, shell header contract, and workstation metadata in `src/app/routerContract.ts`.
- Added M1–M3 worktree isolation matrix in `UI_CONTRACT.md` Section 7 and Antislop Gate checklist in `HANDOFF_TEMPLATE.md`.
- Added M0 milestone handoff in `HANDOFF.md`.

### Changed
- Locked `UI_CONTRACT.md` on `main` with Antislop dials (`ENERGY 1 / RHYTHM 2 / MOTION 1`) and verified contrast ratios.
- Extended `src/styles/index.css` with `--color-border-control` (`#757E74`), `--color-accent-sage-strong-hover` (`#3B5638`), and shared Cozy button/input/card/badge primitives.
- Updated `docs/MILESTONES.md`, `docs/PROJECT_AUDIT.md`, and `README.md` to reflect M0 completion and M1 readiness.

### Fixed
- Resolved WCAG AA contrast conflicts in `docs/DESIGN.md` by syncing secondary text (`#5C665C`), muted text (`#636B63`), primary CTA (`#4A6B46` / `#3B5638`), focus ring (`#4A6B46`), and control border (`#757E74`) tokens.

### Removed
-
