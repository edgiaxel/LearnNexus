> **Status:** Created on GitHub (Issues [#1](https://github.com/edgiaxel/LearnNexus/issues/1) through [#7](https://github.com/edgiaxel/LearnNexus/issues/7)).  
> **Repository:** [edgiaxel/LearnNexus](https://github.com/edgiaxel/LearnNexus)  
> **Purpose:** Bounded implementation tasks derived from `ARCHITECTURE.md` and `MILESTONE.md`.

---

## [GH-01 (#1)](https://github.com/edgiaxel/LearnNexus/issues/1) — Scaffold the React + TypeScript application

### Goal
Create the minimum runnable LearnNexus browser application foundation.

### Context
- PRD: F-001, F-002
- Architecture: Sections 2, 3, 10
- Milestone: M1, VS-01

### Scope

#### Included
- Inspect the local repository and preserve existing work.
- Confirm Node runtime and package manager with the team.
- Scaffold React + TypeScript + Vite.
- Commit the dependency lockfile.
- Add the minimal app shell and entry placeholder.
- Add `.env.example` with variable names only if needed.
- Document verified install, dev and build commands.

#### Excluded
- Phaser environment implementation.
- Supabase integration.
- Authentication.
- Final visual design.
- Deployment.

### Acceptance Criteria
- [ ] Existing local changes are not overwritten.
- [ ] App starts using the documented command.
- [ ] App renders a LearnNexus placeholder screen.
- [ ] Type check passes.
- [ ] Production build passes.
- [ ] Lockfile is committed.
- [ ] No secrets are committed.

### Dependencies
- Team approves React + TypeScript + Vite and package manager.

### Implementation Notes
Use a supported Node runtime. Do not claim commands are verified until they pass in this repository.

### Verification
- Tests/checks: type check and production build.
- Manual verification: open local app in browser.
- Expected evidence: command output and screenshot.

---

## [GH-02 (#2)](https://github.com/edgiaxel/LearnNexus/issues/2) — Prove Phaser 3 mount/unmount and React panel bridge

### Goal
Prove the 2D environment can live inside the React application without duplicate instances or lost scene context.

### Context
- PRD: F-003, F-005
- DESIGN: UI-03, UI-04, UI-05
- Architecture: Sections 4.3, 4.4, 15.1
- Milestone: M1, VS-01

### Scope

#### Included
- Create one Phaser host component.
- Mount one Phaser 3 game instance.
- Render a placeholder environment and one workstation hotspot.
- Emit a typed interaction event from Phaser to React.
- Open/close a placeholder React panel.
- Preserve the scene while the panel is open/closed.
- Destroy the game and listeners when the host unmounts.

#### Excluded
- Multiplayer/presence.
- Supabase.
- Final assets and animations.
- Physics or complex collision systems.

### Acceptance Criteria
- [ ] Exactly one canvas is mounted for one active environment.
- [ ] Workstation interaction opens the expected React panel.
- [ ] Closing the panel preserves the scene and player position.
- [ ] Unmount/remount does not create duplicate canvases.
- [ ] No blocking runtime error occurs during the flow.

### Dependencies
- GH-01.

### Implementation Notes
Keep Phaser lifecycle in a dedicated host/adapter. Do not create a Phaser game instance during every React render.

### Verification
- Tests/checks: component/lifecycle test where practical.
- Manual verification: open panel, close panel, navigate away/back, inspect DOM and console.
- Expected evidence: short screen recording.

---

## [GH-03 (#3)](https://github.com/edgiaxel/LearnNexus/issues/3) — Implement student entry and assigned academic-space flow

### Goal
Allow a student to enter LearnNexus and select the class assigned to the current demo user.

### Context
- PRD: F-001, F-002, F-004
- DESIGN: UI-01, UI-02, UI-03
- Architecture: Sections 5.1, 8
- Milestone: M2, VS-02

### Scope

#### Included
- Implement the selected real-auth or clearly labeled demo-entry approach.
- Show available academic spaces for the current user/demo identity.
- Provide a no-assigned-class state.
- Select a class and enter its environment.
- Preserve class/team context during navigation.

#### Excluded
- Lecturer dashboard.
- University-wide account administration.
- OAuth providers unless explicitly approved.
- Multi-tenant administration.

### Acceptance Criteria
- [ ] Student can enter using the chosen entry mode.
- [ ] Assigned class is displayed.
- [ ] Selecting the class enters the correct environment.
- [ ] No-class state is clear and does not look like a loading failure.
- [ ] Unauthorized class access is blocked when access control is enabled.
- [ ] Demo mode is visibly identified as a demo and uses fictional data.

### Dependencies
- GH-01; GH-02 for environment entry.
- Auth/demo-entry decision.

### Implementation Notes
Do not build a custom authentication system. If demo-entry is chosen, do not treat it as production identity or expose private data.

### Verification
- Tests/checks: entry and class selection E2E test.
- Manual verification: test normal, empty and denied paths.
- Expected evidence: screen recording or screenshots.

---

## [GH-04 (#4)](https://github.com/edgiaxel/LearnNexus/issues/4) — Build the team environment and workstation panels

### Goal
Complete the core spatial workflow from team workspace to project overview, tasks and resources panels.

### Context
- PRD: F-003, F-004, F-005, F-006, F-007, F-008
- DESIGN: UI-03 through UI-07
- Architecture: Sections 4, 5.2, 5.3
- Milestone: M2, VS-03

### Scope

#### Included
- Implement a simple navigable team environment.
- Add discoverable project, tasks and resources workstations.
- Open the corresponding React panel for each workstation.
- Provide close/back behavior that preserves scene context.
- Provide loading/empty/error states for panel content.

#### Excluded
- Real-time multiplayer.
- Advanced avatar customization.
- Uploads.
- Deliverable submission.
- Lecturer/admin screens.

### Acceptance Criteria
- [ ] Student can move through the team environment.
- [ ] Workstations are identifiable and interactable.
- [ ] Each P0 workstation opens the correct panel.
- [ ] Panel close returns to the same environment context.
- [ ] Project, tasks and resources are readable at the target desktop viewport.
- [ ] Empty and error states are not disguised as successful data.

### Dependencies
- GH-02, GH-03.
- Seeded demo content may be used before database integration, but must be labeled as seeded/demo content.

### Implementation Notes
Keep the environment layout deliberately small. Use placeholder art if final assets are not ready.

### Verification
- Tests/checks: panel interaction tests and browser smoke test.
- Manual verification: complete the full spatial-to-panel flow.
- Expected evidence: uninterrupted recording of the student workflow.

---

## [GH-05 (#5)](https://github.com/edgiaxel/LearnNexus/issues/5) — Add persistent class/team/project/task/resource data

### Goal
Load workspace information from Supabase and prove that project/task data survives refresh and re-entry.

### Context
- PRD: F-006, F-007, F-008, F-009
- Architecture: Sections 7, 8, 9, 15.1
- Milestone: M3, VS-04, VS-05

### Scope

#### Included
- Create the minimum relational schema and migration files.
- Add fictional seed data for one class, team, project, tasks and resources.
- Configure the selected authentication/demo approach.
- Enable RLS on browser-accessible restricted tables.
- Implement typed reads for project overview, tasks and resources.
- Implement one permitted persistent update if task editing is included in the demo.
- Handle fetch/save failures.
- Verify persistence after page refresh.

#### Excluded
- File uploads.
- Real-time presence.
- Lecturer class-management UI.
- Assignment submission and grading.
- Production analytics.

### Acceptance Criteria
- [ ] Schema and seed data are reproducible from committed files.
- [ ] Browser client uses only a publishable key.
- [ ] No secret/service-role key appears in client code or repository.
- [ ] RLS is enabled and membership access is tested.
- [ ] Project/tasks/resources load from Postgres.
- [ ] A permitted update persists after refresh, if editing is in scope.
- [ ] Failed reads/writes show an error and do not claim success.
- [ ] Demo data contains no real student personal information.

### Dependencies
- GH-01, GH-03, GH-04.
- Supabase project access and environment variables.
- Auth/demo-entry decision.

### Implementation Notes
Keep migrations in version control. Do not rely on UI hiding as an access-control mechanism.

### Verification
- Tests/checks: integration tests for reads/writes and RLS membership boundaries.
- Manual verification: update a value, refresh/re-enter, verify the value remains.
- Expected evidence: migration/seed files, test output and browser recording.

---

## [GH-06 (#6)](https://github.com/edgiaxel/LearnNexus/issues/6) — Verify and stabilize the P0 student workflow

### Goal
Make the integrated semifinal demonstrator repeatable and safe to present.

### Context
- PRD: F-001 through F-009
- Architecture: Section 11
- Milestone: M4, VS-06

### Scope

#### Included
- Add Playwright smoke coverage for the primary student journey.
- Add focused unit/component tests for critical panel and state behavior.
- Verify Phaser lifecycle cleanup.
- Verify empty/loading/error states.
- Verify RLS access boundaries if restricted data is enabled.
- Check resource links and desktop layout.
- Fix blockers found during integration.

#### Excluded
- New major features.
- Realtime multiplayer.
- Lecturer dashboard.
- File uploads.
- Visual polish that risks breaking the demo.

### Acceptance Criteria
- [ ] Primary student journey passes repeatedly.
- [ ] Phaser does not create duplicate canvases/listeners.
- [ ] Persistence is verified against the actual database.
- [ ] No secrets are exposed.
- [ ] No blocking browser console errors remain.
- [ ] P0 feature checklist is reviewed against PRD.
- [ ] Known limitations are documented.

### Dependencies
- GH-03, GH-04, GH-05.

### Implementation Notes
Protect feature freeze. Fix reliability issues before adding optional features.

### Verification
- Tests/checks: Playwright, unit/component tests, type check, production build.
- Manual verification: rehearse the demo from a clean browser session.
- Expected evidence: test output and final rehearsal recording.

---

## [GH-07 (#7)](https://github.com/edgiaxel/LearnNexus/issues/7) — Deploy, rehearse and prepare semifinal evidence

### Goal
Prepare the working demonstrator and submission package before the deadline.

### Context
- Competition deadline: 30 November 2026, 23:59 WIB.
- Architecture: Section 13.
- Milestone: M5, VS-07, VS-08.

### Scope

#### Included
- Confirm hosting and project access.
- Configure environment variables in the hosting dashboard.
- Deploy the frontend.
- Smoke-test the deployed student journey.
- Prepare demo instructions and seeded demo data.
- Capture actual application screenshots.
- Update proposal to match implemented behavior.
- Record and review the under-2-minute video/Reel.
- Verify all submission links and files.

#### Excluded
- Unapproved cloud resource creation.
- Production hardening beyond what is needed for a safe demo.
- New product features after feature freeze.

### Acceptance Criteria
- [ ] Deployment is reachable from a clean browser session.
- [ ] Supabase connection works in the deployed environment.
- [ ] Primary journey passes against deployed services.
- [ ] Demo instructions are clear.
- [ ] Proposal screenshots show the actual application.
- [ ] Video is under two minutes and matches implemented functionality.
- [ ] Submission links/files are checked before the deadline.
- [ ] Remaining limitations are disclosed honestly.

### Dependencies
- GH-06; hosting and Supabase project access.

### Implementation Notes
Do not deploy until the team approves the target and environment configuration. Keep a known-good build available for the final rehearsal.

### Verification
- Tests/checks: deployed smoke test and final manual rehearsal.
- Expected evidence: deployed URL, screenshots, final video link and submission checklist.