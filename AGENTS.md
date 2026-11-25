# LearnNexus — Agent Instructions

> Repository-level instructions for Antigravity IDE and other coding agents.
> Keep this file concise. Product and technical details belong in the canonical project documents.

## Project

LearnNexus is a browser-based persistent virtual campus for collaborative university project work. Its core experience combines a navigable 2D academic environment with practical team-workspace panels for project information, tasks, and resources. The current delivery goal is a credible, demonstrable STACK 2026 semifinal prototype—not a production-ready university platform.

## Read Before Working

Read the relevant sections only; do not reread every document for every task.

- `PRD.md` — product scope, actors, feature IDs, and acceptance criteria.
- `DESIGN.md` — navigation, screen behavior, interaction states, and visual direction.
- `ARCHITECTURE.md` — selected technical architecture, boundaries, data model, commands, and technical decisions.
- `MILESTONE.md` — milestone outcomes, vertical slices, current focus, and dependencies.
- `README.md` — project setup and developer onboarding.
- `CHANGELOG.md` — meaningful completed changes.

If a referenced document is missing, do not invent its contents. Report the missing reference and ask for it or work only within information that is available.

## Source-of-Truth Rules

1. The repository is the source of truth for implemented behavior.
2. `PRD.md` is the source of truth for product requirements.
3. `DESIGN.md` is the source of truth for approved interface behavior.
4. `ARCHITECTURE.md` is the source of truth for technical decisions and verified commands.
5. `MILESTONE.md` is the source of truth for milestone-level progress. GitHub Issues are the task-level source of truth when created.
6. Distinguish `Planned`, `Implemented`, `Tested`, and `Released`. Never describe planned work as implemented.
7. If documents conflict with code or each other, report the conflict before making a consequential change.

## Working Rules

- Inspect the relevant files, repository status, branch, and existing patterns before editing.
- Work only within the assigned issue or explicitly approved task.
- Preserve unrelated user changes and uncommitted work.
- Prefer the smallest complete implementation over broad rewrites.
- Do not add dependencies, services, frameworks, or infrastructure without a clear need and justification.
- Do not silently expand the approved MVP.
- Do not invent API behavior, package versions, environment variables, commands, test results, or deployment status.
- Verify current official documentation when a version-sensitive API, SDK, pricing, quota, or platform claim matters.
- Keep secrets, tokens, credentials, and private user data out of source code, commits, screenshots, logs, and documentation.
- Use `.env` files locally where required; commit only safe example files such as `.env.example`, with placeholder values.
- Ask before destructive actions, paid usage, production changes, database resets/migrations affecting real data, merges, or deployments.
- Do not add AI features. AI integration is not required for the current product scope.

## Implementation & Visual Guardrails

- **Follow DESIGN.md as the source of truth for UI:** All application chrome, cards, drawers, dialogs, badges, and forms must adhere to the **Cozy Digital Campus** visual system and design tokens (`#F7F4EC` warm cream background, `#FFFFFF` surfaces, soft sage `#C9D7BA`, muted green `#A4B99C`, soft lavender `#DAD2E9`, warm peach `#F1D2BC`, and dark charcoal text `#30343B`).
- **Do not reintroduce rejected futuristic directions:** No dark sci-fi themes, cyberpunk visuals, neon HUDs, scanline overlays, military terminology, clearance levels, or artificial technical identifiers. Light visual foundation is mandatory; dark mode is deferred and must not define the primary visual direction.
- **Ensure crisp canvas rendering (ADR-012):** Configure Phaser with `render: { antialias: false, roundPixels: true, pixelArt: true }`, nearest-neighbor texture filtering (`Phaser.Textures.FilterMode.NEAREST`), integer camera zoom factors, DPR awareness, and CSS `image-rendering: pixelated; image-rendering: crisp-edges;`. Do not allow bilinear texture smoothing to blur pixel-art assets.
- **Keep spatial rendering strictly isolated:** Phaser 3 operates only inside `PhaserHost.tsx` and scene classes. The rendering engine must never render application-wide productivity UI, form controls, task sprint boards, or markdown editors on the canvas.
- **Use React for productivity interfaces:** All project overview cards, task sprint boards, resource libraries, and dialogs must be rendered in accessible HTML/React.
- **Use Phaser only for spatial environment responsibilities:** Top-down 2D pixel-art map rendering, avatar walking movement, smooth camera follow, collision boundaries, and workstation proximity/interaction events.
- **Do not replace Phaser with PixiJS:** Phaser 3 remains the approved 2D engine because it provides tilemaps, avatar controllers, and collision out-of-the-box. PixiJS is deferred for future evaluation only; do not introduce a second rendering engine.
- **Enforce asynchronous-first persistence:** Supabase Postgres with RLS is the authoritative source of truth. Users must be able to accomplish meaningful work even when teammates are offline. Do not make realtime presence a prerequisite for task or project persistence.
- **No unapproved technology migrations:** Do not replace Supabase with another backend or rewrite existing database schemas without explicit documented justification.
- **Do not rebuild working features:** Preserve verified M1/M2 code (such as `PhaserHost`, `eventBridge`, `AcademicSpacesSelector`, and Playwright tests). Do not rewrite working modules without a documented defect or approved requirement change.
- **Do not invent features outside the PRD:** Maintain strict adherence to P0 acceptance criteria and approved screen specifications.
- **Accurate reporting standard:** Distinguish `Planned`, `Implemented`, `Tested`, and `Released`. Never claim mock or seeded data is durable backend persistence until verified against page reloads or leave-and-return tests.

## Product Scope Guardrails

Prioritize the core student journey:

1. Enter the application or demo session.
2. Reach the assigned academic space.
3. Navigate the 2D environment.
4. Enter the assigned team workspace.
5. Interact with a workstation.
6. View useful project information, tasks, or resources.
7. Leave and return without losing the persisted project data.

Defer broad lecturer administration, complex multiplayer synchronization, video calls, real-time collaborative editing, large campus maps, advanced gamification, and production-scale infrastructure unless the approved milestone explicitly brings them into scope.

A single-user, demonstrable vertical slice with real persistence is more valuable than several unfinished subsystems. Treat realtime presence/synchronization as a separate risk-controlled increment, not a prerequisite for the first working journey.

## Task Loop

For each non-trivial task:

1. Read the GitHub issue and linked PRD/design/architecture references.
2. Inspect the current branch, worktree, relevant code, and dependencies.
3. State a short implementation and verification plan.
4. Implement one bounded change.
5. Add or update tests for changed behavior.
6. Run the relevant checks and record exact commands/results.
7. Review the complete diff for regressions, unrelated edits, security issues, and generated files.
8. Report changed files, tests, limitations, and remaining risks.
9. Update the issue and project documents only when the verified change warrants it.

If requirements are ambiguous or conflict with the approved documents, stop and ask one focused question rather than guessing.

## Git and Team Collaboration

- Default integration branch: `main`.
- Do not commit directly to `main` for feature work.
- Branch names: `feature/<short-name>`, `fix/<short-name>`, or `chore/<short-name>`.
- Open a pull request for review before merging.
- Keep PRs small and linked to one or more GitHub Issues.
- Do not merge until required checks pass and a reviewer has inspected the diff.
- Do not force-push shared branches.
- For parallel work, assign independent files/features and use separate branches or worktrees. Worktrees isolate files; they do not coordinate agents.
- Before starting parallel work, identify shared files and dependencies. Avoid simultaneous edits to the same files.
- Every contributor/agent must report: branch, changed files, commands run, test results, and known limitations.
- The repository owner/team lead coordinates integration.

## Commands

Use only commands documented in `ARCHITECTURE.md` or verified from the actual package configuration. Do not assume install, dev, lint, test, type-check, or build scripts exist.

Until the project scaffold and package configuration are committed, all project-specific commands are **Not yet verified**. See `README.md` and `PROJECT_AUDIT.md`.

## Completion Standard

A task is complete only when:

- Its acceptance criteria are met.
- Relevant checks have actually run and their results are reported.
- The diff has been reviewed.
- No secrets or unrelated changes are included.
- Documentation and issue status reflect the verified result.
- The change is ready for review or has been explicitly handed off.
