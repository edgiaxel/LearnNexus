# UI Contract & Shared Boundaries — LearnNexus

> **Status:** Locked M0 Contract on `main`
> **Visual Direction:** Cozy Digital Campus (`docs/DESIGN.md` v0.3)
> **Technical Reference:** `docs/ARCHITECTURE.md` v0.3 (ADR-011, ADR-012, ADR-013, ADR-014)

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
| `--color-accent-lavender` | `#DAD2E9` | Soft lavender category / team tag | With `#30343B` |
| `--color-accent-blue` | `#C9DFE8` | Soft sky blue info / resource link tint | With `#30343B` |
| `--color-accent-peach` | `#F1D2BC` | Warm peach milestones / warning tint | With `#30343B` |
| `--color-accent-yellow` | `#F0DFA7` | Butter yellow pending notices | With `#30343B` |
| `--color-text-charcoal` | `#343A40` | Headings and high-contrast titles | — |
| `--color-text-primary` | `#30343B` | Primary body copy and form inputs | 12.50:1 on `#FFFFFF` |
| `--color-text-secondary` | `#5C665C` | Secondary labels, captions, metadata | 5.98:1 on `#FFFFFF`, 5.24:1 on `#EEF1E8` (AA) |
| `--color-border-subtle` | `#E3E5DC` | Subtle 1px card and panel borders | — |
| `--color-border-focus` | `#4A6B46` | High-contrast focus ring (`2px solid`, `2px offset`) | >= 3:1 non-text contrast |

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
3. workspace  -> Studio Shell (UI-03/04: Top context bar + PhaserHost canvas)
                   └── Contextual Right Drawer (440px desktop, focus-trapped, Esc closes)
                         ├── overview  -> ProjectOverviewPanel (UI-05)
                         ├── tasks     -> TasksSprintBoardPanel (UI-06)
                         └── resources -> ResourceLibraryPanel (UI-07)
```

### Shell & Focus Rules
- Top bar owns: Brand mark, Context breadcrumbs (`Course / Team`), primary route indicator, Leave Space button (`workspace` -> `spaces`), and active student badge.
- Opening a drawer pauses Phaser keyboard movement while keeping the canvas mounted and visible.
- Closing a drawer (`Escape` or `Close`) emits `panel:closed` and immediately restores canvas focus.

---

## 4. Shared TypeScript Contracts

Future `src/types/` modules must conform to these canonical shapes:

```ts
export type AppRoute = 'entry' | 'spaces' | 'workspace';

export type WorkstationId = 'overview' | 'tasks' | 'resources';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

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
