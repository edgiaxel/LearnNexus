# Handoff: M9 Project Management Workstation Panels & Whiteboard

- **Branch / Worktree:** `feature/m9-project-management`
- **Owner:** Worktree Engineer (Lane 3: `src/components/workstation/**`)
- **Linked Contract:** `UI_CONTRACT.md` (verified unchanged)

## Files Touched
- `src/components/workstation/WorkstationPanel.tsx` - Added `WhiteboardPanel` routing when `workstationId === 'whiteboard'`, expanded drawer width to `max-w-[540px]` for `whiteboard` (`max-w-[440px]` for `overview`/`tasks`/`resources`), and forwarded `currentUser`, `onlineUserIds`, `syncRevision`, and `onDataMutated` to child panels.
- `src/components/workstation/ProjectOverviewPanel.tsx` - Added inline `Edit Brief` mode (`overview-edit-btn`, title, description, dynamic objectives add/remove, save via `repository.updateProjectOverview` + `onDataMutated?.('project')`, inline error alert), `"In studio"` sage badges on online roster members via `onlineUserIds`, `Recent Activity` card (`project-activity-list`) calling `repository.getProjectActivity(overview.id, 8)` with loading/empty/error states, and silent background refresh on `syncRevision > 0`.
- `src/components/workstation/TasksSprintBoardPanel.tsx` - Preserved M2/M3 `data-testid`s, filter tabs, quick status `<select>`, `Unsaved change`, `Retry save`, `Revert`, and `tasks-save-indicator`; added `sprint-progress-summary` (`X of Y tasks done` + sage progress bar), fetched real team members (`repository.getTeamMembers(workspace.teamId)`), added collapsible `+ New Task` form (`repository.createTask`), inline Edit (`repository.updateTask`), two-step inline Delete (`repository.deleteTask`), `onDataMutated?.('tasks')` notifications, and silent background refresh on `syncRevision > 0`.
- `src/components/workstation/ResourceLibraryPanel.tsx` - Preserved M2/M3 `data-testid`s and `parseSafeHttpUrl` exports; added collapsible `+ Add Resource` form with `parseSafeHttpUrl` validation blocking unsafe schemes (`javascript:`, `data:`), `repository.createResource`, two-step inline Delete via `repository.deleteResource`, `onDataMutated?.('resources')`, and silent background refresh on `syncRevision > 0`.
- `src/components/workstation/WhiteboardPanel.tsx` - New `UI-08b` component implementing `WhiteboardPanelProps` with Shared Sketch Pad (`480x260` `<canvas>`, 4 WCAG pen colors, 2 stroke widths, live pointer drawing, `>=2`-point stroke persistence via `repository.createWhiteboardStroke`, `Undo last` via `repository.deleteWhiteboardStroke`, two-step `Clear board` via `repository.clearWhiteboardStrokes`) and Team Sticky Notes (pastel note composer via `repository.createWhiteboardNote`, pastel note grid, two-step inline delete via `repository.deleteWhiteboardNote`, and silent refresh on `syncRevision > 0`).
- `src/components/workstation/workstationUtils.ts` - Added `toDateInputValue` and `dateInputToIso` helpers for task due-date inputs.
- `src/components/workstation/HANDOFF.md` - Lane 3 handoff documentation.

## Exported Entry Points / Contracts
- `WorkstationPanel` (`src/components/workstation/WorkstationPanel.tsx`) implementing `WorkstationPanelProps`
- `ProjectOverviewPanel` (`src/components/workstation/ProjectOverviewPanel.tsx`) implementing `ProjectOverviewPanelProps`
- `TasksSprintBoardPanel` (`src/components/workstation/TasksSprintBoardPanel.tsx`) implementing `TasksSprintBoardPanelProps`
- `ResourceLibraryPanel`, `parseSafeHttpUrl`, `ParsedSafeHttpUrl` (`src/components/workstation/ResourceLibraryPanel.tsx`) implementing `ResourceLibraryPanelProps`
- `WhiteboardPanel` (`src/components/workstation/WhiteboardPanel.tsx`) implementing `WhiteboardPanelProps`
- `formatDisplayDate`, `parseSafeHttpUrl`, `ParsedSafeHttpUrl`, `getTwoLetterInitials`, `toDateInputValue`, `dateInputToIso` (`src/components/workstation/workstationUtils.ts`)

## Database / Environment Changes
- Migrations added under `supabase/migrations/`: None (Lane 3 UI only; consumes `AcademicRepository` contracts locked in `src/types/database.ts`).
- Env vars referenced: None added.

## Zero-Mock & Verification Evidence
- Every read and mutation in `ProjectOverviewPanel`, `TasksSprintBoardPanel`, `ResourceLibraryPanel`, and `WhiteboardPanel` calls `AcademicRepository` methods (`getProjectOverview`, `updateProjectOverview`, `getProjectActivity`, `getTeamMembers`, `getProjectTasks`, `createTask`, `updateTaskStatus`, `updateTask`, `deleteTask`, `getProjectResources`, `createResource`, `deleteResource`, `getWhiteboardStrokes`, `createWhiteboardStroke`, `deleteWhiteboardStroke`, `clearWhiteboardStrokes`, `getWhiteboardNotes`, `createWhiteboardNote`, `deleteWhiteboardNote`) with zero mock arrays or silent fallbacks.
- Verification commands run against temporary `node_modules` junction (cleaned up afterward):
  - `npm run typecheck` (`tsc --noEmit`): PASS (exit code 0)
  - `npm run test:unit` (`node --test tests/unit/m3-guards.test.ts`): PASS (11/11 tests, 4/4 suites, exit code 0)
  - `npm run build` (`tsc --noEmit && vite build`): PASS (95 modules transformed, built in 9.27s, exit code 0)
  - Playwright E2E tests (`npm run test:e2e`): Not run in this isolated Lane 3 worktree because Lane 1 (`feature/m6-m9-data-realtime`), Lane 2 (`feature/m6-phaser-multiplayer`), and `App.tsx` wiring integrate on `main`.

## Contract & Antislop Gate Checklist
- [x] Zero edits to locked central files (`UI_CONTRACT.md`, `src/styles/index.css`, `src/types/*`, `src/app/*`, `package.json`)
- [x] No duplicate navbars, global layouts, or custom theme overrides
- [x] WCAG AA contrast verified (`contrast-check.py`), keyboard navigation (`Tab`/`Enter`/`Escape`), 44px minimum touch targets, and visible `:focus-visible` preserved
- [x] Zero em dashes (`\u2014`), zero `animate-pulse`/`animate-bounce`; loading, empty (cause + next action), and error (cause + retry) states implemented

## Caveats & Next Steps
- On base commit `a9ab693`, `src/services/academicService.ts` returns `pendingContractResult()` stubs for the new M6/M9 repository methods and `src/app/App.tsx` does not yet pass `currentUser`, `onlineUserIds`, `syncRevision`, or `onDataMutated` into `WorkstationPanel` or mount `WhiteboardPanel` triggers. Full live DB/Realtime E2E verification runs after integrating Lanes 1, 2, 3, and 4 on `main`.
- `WhiteboardPanel` defaults `authorId` to `currentUser?.id ?? ''` and `authorName` to `currentUser?.displayName ?? 'Studio Member'` if `currentUser` is omitted by a caller.
