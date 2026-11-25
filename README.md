# LearnNexus

**A Persistent Virtual Learning Environment Connecting Academic Spaces with Collaborative Project Workspaces**

LearnNexus is a browser-based virtual campus platform developed by **SibukTA** for **STACK 2026 — Case 1: Smarter Campus and Learning**.

The platform combines a welcoming, pastel-colored productivity application with a navigable 2D pixel-art virtual campus. Rather than functioning as a generic meeting tool or Gather Town clone, LearnNexus connects academic course contexts (syllabus, announcements, learning materials) directly to persistent team workspaces where student groups manage their project overviews, task sprint boards, and resource libraries across sessions.

> **Project status:** M0–M3 complete & verified (`18/18` Playwright E2E, `11/11` unit, `4/4` live RLS actors passing) — Cozy Entry Gateway, Academic Spaces, live Supabase Auth/RLS/Postgres cross-session persistence, failure-recovery UX, and sharp Config A Phaser 3 studio integrated; next: **M4 Quality & Integration Freeze**. Track tasks on the [LearnNexus Kanban](https://github.com/users/edgiaxel/projects/5).

## Team

| Member | Role |
|---|---|
| Edgi Axel | Team lead |
| Jonathan Lukas Wijaya | Team member |
| Deffa Kiane | Team member |
| Khaerul Husnaen | Team member |

## Product Scope & Primary Student Journey

The semifinal demonstrator prioritizes one coherent, persistent student journey:

1. **Enter Application:** Enter LearnNexus via student credentials or verified demo profile.
2. **Virtual Campus:** Arrive at the campus entry point with clear spatial orientation.
3. **Academic Space:** Navigate to an assigned course space (e.g. `Software Engineering Studio`).
4. **Course Context:** View course announcements and learning materials.
5. **Team Workspace:** Enter the assigned team studio pod (`Team SibukTA`).
6. **Contextual Workstation:** Approach an interactive workstation and trigger interaction (`[E]`).
7. **Productivity Panels:** Open contextual React drawer panels (Project Overview, Tasks, Resources).
8. **Make Changes:** Update sprint task status or project records.
9. **Durable Persistence:** Changes are written durably to Supabase Postgres.
10. **Leave and Return:** Leave the space and return later to find all project information retained.

A finished production platform is not the goal of this stage. Refer to [`PRD.md`](docs/PRD.md) and [`DESIGN.md`](docs/DESIGN.md) for detailed requirements and screen specifications.

## Canonical Project Documents

| Document | Purpose |
|---|---|
| [`PRD.md`](docs/PRD.md) | Product requirements, principles, feature IDs, priorities, and acceptance criteria |
| [`DESIGN.md`](docs/DESIGN.md) | Cozy Digital Campus visual system, tokens, spatial layout, screen inventory, and Gather references |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical stack, system boundaries, canvas rendering audit, data model, and decisions (ADRs) |
| [`MILESTONES.md`](docs/MILESTONES.md) | Milestones (M0–M5), vertical slices, current focus, and progress map |
| [`AGENTS.md`](AGENTS.md) | Instructions and visual/architectural guardrails for coding agents |
| [`CHANGELOG.md`](docs/CHANGELOG.md) | Meaningful completed changes |
| [`PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md) | Repository inspection records and technical audits |

The PRD, DESIGN, ARCHITECTURE, and MILESTONE documents must be present in the repository before implementation agents rely on them. If any are missing, report the missing reference; do not reconstruct them from memory.

## Technology Overview

- **Frontend Application Shell:** React 19 + TypeScript + Vite. Accessible HTML application chrome, navigation tabs, contextual side drawers, and forms.
- **2D Spatial Campus Engine:** Phaser 3 (v3.88.2). Retained for top-down 2D pixel-art map rendering, avatar walking controllers, smooth camera follow, collision boundaries, and workstation proximity triggers. Configured for sharp pixel rendering (`pixelArt: true`, `antialias: false`, nearest-neighbor filtering, DPR awareness).
- **Backend & Persistence:** Supabase Postgres with Row Level Security (RLS) and `@supabase/supabase-js` v2. Asynchronous-first persistence for academic courses, teams, projects, tasks, and resources.
- **Visual Design System:** Cozy Digital Campus. Light, warm cream parchment background (`#F7F4EC`), clean white surfaces, soft sage (`#C9D7BA`), muted green (`#A4B99C`), lavender (`#DAD2E9`), warm peach (`#F1D2BC`), and dark charcoal text (`#30343B`).
- **Testing:** Playwright automated end-to-end browser test suite running against `localhost`.

Do not infer package versions or install commands from this README. The actual package manifest and lockfile determine the installed stack.

## Prerequisites

M1 verified prerequisites & scripts:

- [x] Supported runtime: Node.js `v24.15.0` (`v20.19+` compatible)
- [x] Package manager: `npm` `11.12.1` (`package-lock.json` committed)
- [x] Required environment variables: `.env.example` verified (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [x] Database/backend project access (Supabase) verified (`/auth/v1/health` `200`, `anon` key, clean-slate DB ready for M2)
- [x] Local development command: `npm run dev` (Vite on port `5173`)
- [x] Test, type-check, and build commands verified: `npm run typecheck`, `npm run test:e2e`, `npm run build`

## Getting Started

1. Clone the repository:

   ```bash
   git clone git@github.com:edgiaxel/LearnNexus.git
   cd LearnNexus
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create local environment file:

   ```bash
   cp .env.example .env
   ```

4. Start development server:

   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. Run verified checks:

   ```bash
   npm run typecheck  # Strict TypeScript verification
   npm run test:e2e   # Playwright end-to-end browser tests
   npm run build      # Production build
   ```

## Development Workflow

1. Select a Ready GitHub Issue.
2. Read its linked PRD feature, design specification, and architecture constraints.
3. Create a branch:

   ```bash
   git switch -c feature/<short-name>
   ```

4. Implement only the issue's bounded scope.
5. Run the relevant checks and inspect the diff.
6. Push the branch and open a pull request.
7. Link the pull request to its issue and request review.
8. Merge only after review and required checks pass.

Use GitHub Issues for task-level tracking. `MILESTONE.md` records milestone-level progress and the current focus; it is not a second issue tracker.

## Quality and Security

- Keep secrets out of source control.
- Validate user input at trust boundaries.
- Enforce access to classes and team workspaces in the backend, not only in the UI.
- Persist authoritative project data in the database; do not treat client state as durable storage.
- Test error, loading, empty, and unauthorized states.
- Do not claim realtime collaboration unless multiple clients have been tested against the same shared state.
- Do not claim persistence until data survives refresh or a new session.

## License

See [`LICENSE`](./LICENSE).
