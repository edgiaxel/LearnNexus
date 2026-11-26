# UI Contract & Shared Boundaries — LearnNexus

> **Status:** Locked M0 Contract on `main` (Verified 25 November 2026)
> **Visual Direction:** Cozy Digital Campus (`docs/DESIGN.md` v0.3)
> **Technical Reference:** `docs/ARCHITECTURE.md` v0.3 (ADR-011, ADR-012, ADR-013, ADR-014)
> **Antislop Design Read & Dials:** Academic collaboration web app in warm cream and pastel pixel-art style; `ENERGY 1 / RHYTHM 2 / MOTION 1`.

All worktrees and contributors must inherit this contract verbatim. Do not create duplicate navbars, global layouts, custom theme overrides, or unapproved rendering engines.

---

## 1. Visual Design Tokens (WCAG AA Verified)

Defined in `src/styles/index.css`:

| Token | Value | Purpose | Contrast Verification |
|---|---|---|---|
| `--color-bg-warm` | `#F7F4EC` | Warm cream campus parchment background | With `#30343B`: 11.37:1 (AAA) |
| `--color-surface-primary` | `#FFFFFF` | Cards, panels, drawers, dialogs | With `#30343B`: 12.50:1 (AAA) |
| `--color-surface-secondary` | `#EEF1E8` | Soft sage-tinted secondary surface, skeletons | With `#30343B`: 10.9:1; with `#5C665C`: 5.24:1 (AA) |
| `--color-surface-tertiary` | `#E5E9DE` | Hover and active subtle surface tint | — |
| `--color-accent-sage-soft` | `#C9D7BA` | Soft sage supporting tint / tag background | With `#30343B`: use dark text only |
| `--color-accent-sage` | `#A4B99C` | Muted green brand accent (borders, dark-text pills) | With `#30343B`: 5.95:1 (AA); never pair with `#FFFFFF` text |
| `--color-accent-sage-strong` | `#4A6B46` | Primary CTA button fill (`btn-primary`) | With `#FFFFFF`: 6.03:1 (AA) |
| `--color-accent-sage-strong-hover` | `#3B5638` | Primary CTA hover/active fill (`btn-primary:hover`) | With `#FFFFFF`: 8.16:1 (AAA) |
| `--color-accent-lavender` | `#DAD2E9` | Soft lavender category / team tag | With `#30343B`: 8.56:1 (AAA) |
| `--color-accent-blue` | `#C9DFE8` | Soft sky blue info / resource link tint | With `#30343B`: 9.05:1 (AAA) |
| `--color-accent-peach` | `#F1D2BC` | Warm peach milestones / warning tint | With `#30343B`: 8.74:1 (AAA) |
| `--color-accent-yellow` | `#F0DFA7` | Butter yellow pending notices | With `#30343B`: 9.42:1 (AAA) |
| `--color-text-charcoal` | `#343A40` | Headings and high-contrast titles | With `#FFFFFF`: 11.51:1 (AAA) |
| `--color-text-primary` | `#30343B` | Primary body copy and form inputs | 12.50:1 on `#FFFFFF` (AAA) |
| `--color-text-secondary` | `#5C665C` | Secondary labels, captions, metadata | 5.98:1 on `#FFFFFF`, 5.24:1 on `#EEF1E8` (AA) |
| `--color-border-subtle` | `#E3E5DC` | Subtle 1px decorative card dividers only | 1.27:1 on `#FFFFFF` (decorative only) |
| `--color-border-control` | `#757E74` | Interactive control and input borders (WCAG 1.4.11) | 4.21:1 on `#FFFFFF`, 3.83:1 on `#F7F4EC`, 3.68:1 on `#EEF1E8` |
| `--color-border-focus` | `#4A6B46` | High-contrast focus ring (`2px solid`, `2px offset`) | 6.03:1 on `#FFFFFF`, 5.49:1 on `#F7F4EC` |

### Prohibited Visual Patterns
- No dark sci-fi / cyberpunk themes (`#020617`, neon accents, scanlines, glowing HUDs).
- No military terminology or artificial clearance labels.
- No em dashes (`—`) in UI copy.
- No fabricated metrics, placeholder names disguised as real users, or unverified claims.
- Every data view must handle **loading**, **empty** (with cause + next action), and **error** (with cause + retry) states.

---

## 2. Typography & Geometry

- **Font stack:** `'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Scale:** Display `28px/36px` (600), H1 `22px/28px` (600), H2 `18px/24px` (600), H3 `15px/20px` (500), Body `14px/20px` (400), Meta `12px/16px` (400/500), Pill `11px/14px` (600).
- **Radii:** Buttons/badges `8px`, Cards/inputs `10px`, Drawers/dialogs `14px`, Pills `9999px`.
- **Spacing grid:** `4px / 8px / 12px / 16px / 24px / 32px / 48px`.
- **Touch targets:** Interactive controls >= `44px` tap target on mobile/touch.

---

## 3. Router & Navigation Skeleton

The single application shell (`App.tsx`) coordinates the linear student flow without duplicate navbars:

```text
1. entry      -> EntryGateway (UI-01: Student sign-in or labeled Demo Profile)
2. spaces     -> AcademicSpacesSelector (UI-02: Enrolled courses & team assignment)
3. workspace  -> Studio Shell (UI-03/04: Top context bar + PhaserHost canvas + StudioCollaborationBar in <main>)
                   └── Contextual Right Drawer (440px desktop; 540px for whiteboard; focus-trapped, Esc closes)
                         ├── overview   -> ProjectOverviewPanel (UI-05: Editable brief + online roster + Recent Activity)
                         ├── tasks      -> TasksSprintBoardPanel (UI-06: Full CRUD + sprint progress + M3 retry/revert)
                         ├── resources  -> ResourceLibraryPanel (UI-07: Add/delete safe links)
                         └── whiteboard -> WhiteboardPanel (UI-08b: Sketch pad + pastel sticky notes)
```

### Shell & Focus Rules
- Top bar (`<header>`) owns ONLY: Brand mark, Context breadcrumbs (`Course / Team`), Supabase health status badge (`header [role="status"]`), active student badge, Leave Studio button, and Sign Out button. Never render collaboration or chat status badges inside `<header>`.
- `StudioCollaborationBar` mounts inside `<main>` (workspace header/canvas footer region), never as a second navbar.
- Opening a drawer pauses Phaser keyboard movement while keeping the canvas mounted and visible.
- Focusing an HTML input outside a drawer (such as Studio Chat) emits `ui:input-focus` (`focused: true`) to suspend Phaser global arrow-key capture without stealing focus, restoring capture on blur (`focused: false`).
- Closing a drawer (`Escape` or `Close`) emits `panel:closed` and immediately restores canvas focus.

---

## 4. Shared TypeScript Contracts

Future `src/types/` modules must conform to these canonical shapes:

```ts
export type AppRoute = 'entry' | 'spaces' | 'workspace';

export type WorkstationId = 'overview' | 'tasks' | 'resources' | 'whiteboard';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type CharacterSpriteKey = 'adam' | 'alex' | 'amelia' | 'bob';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface StudentProfile {
  id: string;
  displayName: string;
  role: 'student' | 'team_lead' | 'guest_demo';
  isDemo: boolean;
}

export interface AcademicSpace {
  id: string;
  code: string;
  name: string;
  semester: string;
  teamId: string;
  teamName: string;
}

export interface ProjectOverview {
  id: string;
  teamId: string;
  title: string;
  description: string;
  objectives: string[];
  updatedAt: string;
}

export interface SprintTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeName: string | null;
  dueAt: string | null;
  updatedAt: string;
}

export interface ResourceItem {
  id: string;
  projectId: string;
  title: string;
  url: string;
  category: 'docs' | 'design' | 'tools' | 'general';
  createdAt: string;
}

export interface WorkstationInteractPayload {
  workstationId: WorkstationId;
  label: string;
}

export interface BridgeEvents {
  'workstation:proximity': { workstationId: WorkstationId | null; label?: string };
  'workstation:interact': WorkstationInteractPayload;
  'panel:closed': { workstationId: WorkstationId };
}
```

---

## 5. Phaser & Rendering Contract (ADR-012 & ADR-014)

- **Engine:** Phaser 3 (`v3.88.2`) inside `src/game/PhaserHost.tsx` and `src/game/scenes/` only.
- **Sharp pixel-art configuration:**
  - `render: { antialias: false, roundPixels: true, pixelArt: true }`
  - `Phaser.Textures.FilterMode.NEAREST` on all loaded tilesets, spritesheets, and objects.
  - Integer camera zoom factors only (e.g. `2` or `3`).
  - DPR-aware canvas scaling + CSS `image-rendering: pixelated; image-rendering: crisp-edges;`.
- **Zero productivity UI on canvas:** All project overviews, sprint boards, resource lists, and forms render in React HTML.

---

## 6. Zero-Mock & Persistence Rule (ADR-013)

- Supabase Postgres with Row Level Security (RLS) is the authoritative data source.
- Never silently substitute mock/hardcoded data on a failed Supabase request.
- Any demonstration profile selector must be explicitly labeled as Demo Mode and still read/write real Postgres records (never fake in-memory success).
- Never display `"Saved"` until the Postgres mutation resolves cleanly.

---

## 7. Multi-Agent Worktree Isolation & Ownership Matrix

All M1–M3 worktrees branch from `main` after M0 is locked. Subagents must obey these strict boundaries:

### Locked Central Files (Orchestrator-Only on `main`)
Feature worktrees must NOT modify these shared files:
- `UI_CONTRACT.md`, `HANDOFF.md`, `HANDOFF_TEMPLATE.md`
- `src/styles/index.css`
- `src/types/contracts.ts`, `src/types/database.ts`, `src/types/components.ts`, `src/types/gameDebug.ts`
- `src/app/routerContract.ts`, `src/app/App.tsx`
- `src/game/**`, `public/assets/**`
- `src/lib/supabase.ts`
- `package.json`, `vite.config.ts`, `tsconfig.json`

### Non-Overlapping Worktree Lanes (M1–M3)
| Worktree Branch | Exclusive Folder Ownership | Owns |
|---|---|---|
| `feature/m1-game-engine` | `src/game/**`, `public/assets/**` | `PhaserHost.tsx`, `createGame.ts`, `eventBridge.ts`, `CampusScene.ts`, static pixel assets |
| `feature/m2-supabase-data` | `supabase/**`, `src/services/**` | SQL migrations, seed SQL, RLS policies, `errorMapper.ts`, `authService.ts`, `academicService.ts`, `src/services/HANDOFF.md` |
| `feature/m2-entry-spaces` | `src/components/entry/**`, `src/components/campus/**` | `EntryGateway.tsx`, `AcademicSpacesSelector.tsx`, `src/components/entry/HANDOFF.md` |
| `feature/m2-workstation-panels` | `src/components/workstation/**` | `WorkstationPanel.tsx`, `ProjectOverviewPanel.tsx`, `TasksSprintBoardPanel.tsx`, `ResourceLibraryPanel.tsx`, `src/components/workstation/HANDOFF.md` |
| `feature/e2e-verification` | `tests/e2e/**` | Playwright end-to-end specs against `localhost` |
| `feature/m3-auth-rls-hardening` | `src/services/**`, `supabase/**`, `tests/rls/**` | Auth state listener, session-expiry auth checks, `tests/rls/verify-rls.mjs`, `src/services/HANDOFF.md` |
| `feature/m3-panel-resilience` | `src/components/workstation/**`, `src/components/entry/**`, `src/components/campus/**` | Unsaved per-task write states, inline retry/revert, panel refresh, demo badge, session-expiry notices, `src/components/workstation/HANDOFF.md` |
| `feature/m3-persistence-e2e` | `tests/e2e/**`, `tests/unit/**` | M3 cross-session & failure-injection Playwright suite, unit tests, `tests/e2e/HANDOFF.md` |

### Non-Overlapping Worktree Lanes (Pre-M4 Scoped M6 + M9)
| Worktree Branch | Exclusive Folder Ownership | Owns |
|---|---|---|
| `feature/m6-m9-data-realtime` | `supabase/**`, `src/services/**`, `tests/rls/**` | Migration `20261126000002_m6_m9_collab_pm.sql`, seed updates, CRUD methods in `academicService.ts`, `realtimeUtils.ts`, `realtimeService.ts`, expanded 4-actor `verify-rls.mjs`, `src/services/HANDOFF.md` |
| `feature/m6-phaser-multiplayer` | `src/game/**` | 4th workstation `whiteboard` on `chalkboard_sprint`, 4-character `NEAREST` spritesheets, throttled move broadcast, interpolated remote avatars + crisp nametags, 4-tile sage proximity rings, 5s chat bubbles, `ui:input-focus` guard, `PhaserHost.tsx`, `src/game/HANDOFF.md` |
| `feature/m9-project-management` | `src/components/workstation/**` | Full task CRUD + sprint progress bar, editable project brief + online pills + `Recent Activity`, resource add/delete, `WhiteboardPanel.tsx` sketch pad + sticky notes, `src/components/workstation/HANDOFF.md` |
| `feature/m6-studio-chat-ui` | `src/components/realtime/**` | `StudioCollaborationBar.tsx` (sync pill, `Online (N)` roster, `Nearby` peer cue, collapsible persisted Studio Chat with unread badge), `src/components/realtime/HANDOFF.md` |

### M2 / M2.5 / M3 / M6+M9 Additional Contract Rules
- **Repository & Auth Contracts:** `src/types/database.ts` locks `AuthRepository`, `AcademicRepository` (including M9 CRUD, chat, whiteboard, and activity methods), and `StudioRealtimeRepository`; `src/types/components.ts` locks all view component prop contracts (`EntryGatewayProps`, `AcademicSpacesSelectorProps`, `WorkstationPanelProps`, `ProjectOverviewPanelProps`, `TasksSprintBoardPanelProps`, `ResourceLibraryPanelProps`, `WhiteboardPanelProps`, `StudioCollaborationBarProps`).
- **Per-Lane Handoff Path:** Worktrees must write their handoff report inside their owned folder (`src/services/HANDOFF.md`, `src/game/HANDOFF.md`, `src/components/workstation/HANDOFF.md`, `src/components/realtime/HANDOFF.md`) rather than editing root `HANDOFF.md`.
- **M2.5 MOTION 1 Skeleton Rule:** Loading states must use static `#EEF1E8` placeholder blocks with explicit status text and `aria-busy="true"`; endless CSS pulse/bounce loops (`animate-pulse`) are prohibited.
- **Locked `data-testid` Contract:**
  - Entry (`UI-01`): `entry-gateway`, `entry-session-notice`, `demo-profile-<key>`, `demo-enter-btn`, `email-input`, `password-input`, `toggle-password-btn`, `credentials-submit-btn`, `entry-error-banner`
  - Academic Spaces (`UI-02`): `academic-spaces-directory`, `space-card-<code>`, `enter-studio-btn`, `spaces-empty-state`, `spaces-error-banner`, `spaces-retry-btn`, `switch-profile-btn`
  - Workstation Drawer & Panels (`UI-05`–`UI-08b`): `workstation-drawer`, `close-drawer-btn`, `return-to-studio-btn`, `panel-refresh-btn`, `demo-data-badge`, `project-overview-panel`, `project-title`, `project-objectives-list`, `team-roster-list`, `overview-edit-btn`, `overview-title-input`, `overview-description-input`, `overview-objective-input-<index>`, `overview-add-objective-btn`, `overview-save-btn`, `overview-cancel-btn`, `project-activity-list`, `tasks-sprint-panel`, `sprint-progress-summary`, `task-filter-<all|todo|in_progress|done>`, `task-new-toggle-btn`, `task-create-form`, `task-title-input`, `task-description-input`, `task-assignee-select`, `task-due-input`, `task-create-submit-btn`, `task-item-<id>`, `task-status-select-<id>`, `task-unsaved-badge-<id>`, `task-retry-btn-<id>`, `task-revert-btn-<id>`, `task-edit-btn-<id>`, `task-edit-save-btn-<id>`, `task-delete-btn-<id>`, `task-delete-confirm-btn-<id>`, `tasks-save-indicator`, `resource-library-panel`, `resource-filter-<all|docs|design|tools|general>`, `resource-new-toggle-btn`, `resource-create-form`, `resource-title-input`, `resource-url-input`, `resource-category-select`, `resource-description-input`, `resource-create-submit-btn`, `resource-item-<id>`, `resource-open-link-<id>`, `resource-delete-btn-<id>`, `resource-delete-confirm-btn-<id>`, `whiteboard-panel`, `whiteboard-canvas`, `whiteboard-color-<hex>`, `whiteboard-width-<2|4>`, `whiteboard-undo-btn`, `whiteboard-clear-btn`, `whiteboard-clear-confirm-btn`, `whiteboard-note-input`, `whiteboard-note-color-<yellow|sage|lavender|peach>`, `whiteboard-note-submit-btn`, `whiteboard-note-item-<id>`, `whiteboard-note-delete-btn-<id>`, `whiteboard-note-delete-confirm-btn-<id>`
  - Studio Collaboration (`M6`): `realtime-status-badge`, `online-teammates-btn`, `online-teammates-list`, `nearby-teammates-badge`, `studio-chat-toggle`, `studio-chat-unread-badge`, `studio-chat-panel`, `studio-chat-list`, `studio-chat-input`, `studio-chat-send-btn`
  - App Shell (`App.tsx`): `leave-studio-btn`, `sign-out-btn`, `header-user-badge`, `header-breadcrumbs`, `workstation-prompt`, `workspace-layout-meta`, `mobile-workstation-btn-<overview|tasks|resources|whiteboard>`

### Subagent Compliance Rules
1. Import shared types and routes from `src/types/contracts.ts`, `src/types/database.ts`, `src/types/components.ts`, and `src/app/routerContract.ts`.
2. Reuse CSS classes and tokens from `src/styles/index.css` (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.control-input`, `.surface-card`, `.status-badge`). Never create duplicate navbars, global layouts, or custom theme overrides.
3. Implement real Supabase Postgres queries/mutations via `AuthRepository` and `AcademicRepository` (zero mock data or silent fallbacks).
4. Handle loading, empty (cause + next action), and error (cause + retry) states in every data view.
5. Pass the Antislop Delivery Gate (WCAG AA contrast, keyboard focus, zero em dashes in UI copy, zero `animate-pulse`) and write a lane `HANDOFF.md` following `HANDOFF_TEMPLATE.md`.
