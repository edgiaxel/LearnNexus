# Product Requirements --- LearnNexus

> A persistent, spatial academic workspace that connects academic spaces
> with collaborative project workspaces.
>
> **Status:** Approved product requirements & direction update\
> **Version:** 0.3\
> **Last updated:** 24 November 2026\
> **Project:** STACK 2026 --- Case 1: Smarter Campus and Learning\
> **Team:** SibukTA\
> **Product direction:** Cozy Digital Campus --- Persistent 2D Virtual Campus & Pastel Productivity Workspace\
> **Current delivery target:** STACK 2026 Semifinal submission, 30
> November 2026, 23:59 WIB

------------------------------------------------------------------------

## 1. Read This First

-   **What it is:** LearnNexus is a persistent virtual learning environment
    that connects academic spaces with collaborative project workspaces.
    It combines a navigable 2D virtual campus, academic spaces for courses
    and learning activities, collaborative spaces for student teams, persistent
    project-management and learning tools, and synchronous as well as
    asynchronous collaboration.
-   **Who it serves:** Primarily university students working on
    lecturer-assigned group projects; secondarily lecturers who organize
    and supervise those projects.
-   **Core problem:** Group-project information, course context, and activities
    are often fragmented across disconnected communication tools, cloud storage,
    task trackers, and LMS platforms. This fragmentation disrupts academic continuity
    and makes coordination difficult across different student schedules.
-   **MVP outcome:** A student can enter the application, reach the virtual
    campus, navigate to an assigned academic space, enter their team workspace,
    interact with workstations, access and update project information, tasks,
    or resources, and return later to find all changes preserved.
-   **Current project status:** Updated product direction approved following
    product research and hands-on Gather Town 2.0 exploration; M0, M1, and M2
    completed; M2.5 design alignment documented; M3 persistence in progress.
-   **Next action:** Execute M3 persistence and canvas rendering quality
    alignment without unapproved engine swaps or scope creep.

### Important scope distinction

LearnNexus has a comprehensive target product architecture, but the immediate
competition deliverable is a **semifinal demonstrator**, not a full university
platform.

The semifinal demonstrator proves one coherent, persistent student workflow
connecting an academic space to a functional team workspace. It prioritizes
demonstrable, high-trust single-user persistence over complex multiplayer
synchronization, video streaming, or broad administrative infrastructure.

## 2. Product Overview

### 2.1 Updated Product Definition

LearnNexus is a persistent virtual learning environment that connects academic
spaces with collaborative project workspaces.

It combines:

1.  **A navigable 2D virtual campus:** A spatial navigation and social layer
    providing visual presence, architectural orientation, and contextual discovery.
2.  **Academic spaces:** Dedicated areas for courses, announcements, learning
    materials, assignments, and class discussions.
3.  **Collaborative team workspaces:** Dedicated studios where student groups
    coordinate their project deliverables.
4.  **Persistent project-management and learning tools:** Contextual tools for
    project overviews, task sprint boards, resource libraries, and progress tracking.
5.  **Synchronous and asynchronous collaboration:** Shared spatial presence
    when online together, paired with robust persistence for independent work.

The virtual campus is the spatial navigation and social layer. The academic and
project workspaces are the functional core. LearnNexus should not simply become
another virtual meeting application or a Gather Town clone.

### 2.2 Product Differentiation Hypothesis

Existing spatial collaboration platforms (such as Gather Town, WorkAdventure,
Topia, and Kumospace) primarily emphasize virtual presence, proximity communication,
and integrations with external productivity tools (e.g. embedding external docs
or whiteboards).

LearnNexus differentiates by providing a **cohesive academic experience** in which
course information, assignments, team projects, resources, tasks, and project
progress are deeply connected to the virtual environment itself.

We do not claim that competitors lack these features entirely—platforms like
Gather, WorkAdventure, Topia, and Kumospace already offer overlapping spatial and
meeting features. Rather, our differentiation is demonstrated through the tight
structural integration between academic courses, physical campus locations, and
persistent project-based learning workflows.

### 2.3 Target Information Architecture

The complete product vision is structured around a three-tier spatial and functional
hierarchy:

```text
LEARNNEXUS
│
├── VIRTUAL CAMPUS
│   ├── Main Hall
│   │   ├── Reception / Gateway
│   │   ├── Information Board
│   │   └── Auditorium
│   │
│   ├── Academic Building
│   │   ├── Classrooms
│   │   └── Course Spaces
│   │
│   ├── Library
│   │   ├── Learning Resources
│   │   └── Study Areas
│   │
│   └── Student Commons
│       ├── Social Area
│       └── Informal Meeting Areas
│
├── ACADEMIC SPACES
│   ├── Course Information
│   ├── Announcements
│   ├── Learning Materials
│   ├── Assignments
│   └── Class Discussions
│
└── TEAM WORKSPACES
    ├── Project Overview
    ├── Task Board
    ├── Project Timeline
    ├── Collaborative Canvas
    ├── Resource Library
    ├── Deliverables
    └── Team Activity History
```

> **Scope Note:** This hierarchy represents the **target product architecture**,
> not a requirement to implement every room and sub-feature in the semifinal prototype.
> The semifinal demonstrator prioritizes the spaces and interactions that demonstrate
> the core student journey: connecting an assigned academic space to a persistent
> team workspace studio.

### 2.4 Problem and Academic Evidence

University group projects commonly involve multiple activities: communication,
sharing materials, coordinating tasks, understanding lecturer instructions, and
preparing deliverables. When these activities are spread across disconnected tools,
students suffer from context switching, missing context, and uneven contribution.

The preliminary submission cites Donelan and Kear (2024), whose systematic literature
review identifies recurring challenges in online group projects: uneven participation,
unclear project guidance, scheduling difficulties, and group relationship challenges.

Preliminary judge feedback for STACK 2026 noted:
- Strong problem fit for Case 1: Smarter Campus and Learning.
- Clear conceptual differentiation from generic meeting tools and LMSs.
- Need for primary validation from students.
- Feasibility concerns regarding real-time multiplayer implementation within the competition timeline.

In response, LearnNexus establishes an asynchronous-first persistence foundation,
ensuring high technical feasibility while delivering real academic utility.

### 2.5 Primary Value

The defining value of LearnNexus is:
- **Spatial Discovery:** Navigating meaningful 2D spaces rather than relying solely
  on abstract dashboard menus.
- **Dedicated Team Home:** Every project group has an assigned, persistent virtual studio.
- **Contextual Workstations:** Practical project tools attached to tangible spatial objects.
- **Durable Persistence:** Workspace status, tasks, and resources remain intact across visits.
- **Academic Context:** Direct linkage between course syllabus requirements and team execution.

### 2.6 Core Product Principles

1.  **Spatial navigation:** Students navigate meaningful virtual environments
    rather than navigating only through conventional dashboard menus.
2.  **Persistent work:** Project data remains available when users leave and return.
3.  **Asynchronous-first usability:** Users must be able to accomplish meaningful
    work even when teammates are offline.
4.  **Collaboration:** Synchronous interactions enhance the experience but are
    never a hard requirement for basic productivity.
5.  **Academic context:** Classrooms, courses, assignments, and project workspaces
    have meaningful structural relationships.
6.  **Small-team focus:** Optimize the initial experience for student teams, typically
    fewer than 10 members.
7.  **Simplicity:** Avoid unnecessary mechanics, excessive gamification, and features
    that do not improve learning or collaboration.

### 2.7 Platform

-   **Primary surface:** Web application accessed through a modern desktop browser.
-   **Interaction model:** Welcoming top-down 2D pixel-art spatial academic
    environment combined with clean, accessible pastel-colored HTML application panels.
-   **Initial device priority:** Desktop and laptop browsers for the semifinal demonstrator.
-   **Mobile behavior:** Responsive layout preserves access to essential productivity
    panels in compact viewports; full mobile avatar touch controls are deferred to future milestones.
    semifinal demonstrator.
-   **Mobile behavior:** Not a semifinal requirement; responsive
    behavior should preserve access to essential information in productivity
    panels, but full mobile spatial controls are not currently committed.

## 3. Users and Actors

  -------------------------------------------------------------------------------
  ID                Actor             Goal              Needs / permissions
  ----------------- ----------------- ----------------- -------------------------
  U-01              Student           Access assigned   View assigned classes and
                                      classes and       team spaces; access
                                      collaborate on    project information,
                                      group projects    tasks, and resources;
                                                        make permitted team
                                                        updates

  U-02              Lecturer          Organize and      Manage class information,
                                      supervise class   assign students to teams,
                                      projects          publish
                                                        instructions/materials,
                                                        define deliverables, and
                                                        review submissions

  U-03              Platform          Maintain the      Manage accounts, roles,
                    administrator     platform's        classes, and access
                                      academic          configuration; detailed
                                      structure         permissions remain to be
                                                        defined
  -------------------------------------------------------------------------------

Students are the primary user for the first demonstrable workflow.
Lecturer and administrator capabilities belong to the broader product
direction, but are not required to be fully implemented in the semifinal
demonstrator.

No separate persona profiles are assumed at this stage.

## 4. Core User Journey

### 4.1 Primary student journey

1.  **Student enters LearnNexus:** Opens the application and enters via authenticated session or verified demo profile.
2.  **Student reaches the virtual campus:** Arrives at the campus entry point with clear spatial orientation.
3.  **Student navigates to an assigned academic space:** Traverses the campus or selects their enrolled course space.
4.  **Student accesses course information, announcements, and learning materials:** Views syllabus requirements and updates.
5.  **Student enters their team workspace:** Moves avatar into the dedicated project studio pod.
6.  **Student interacts with workstations or workspace objects:** Approaches physical workstations and triggers interaction (`[E]`).
7.  **Student accesses project information, tasks, resources, and collaborative tools:** Opens contextual React productivity panels.
8.  **Student makes changes to project data:** Updates task status or project records.
9.  **Changes persist:** Data is durably written to Supabase Postgres.
10. **Student leaves and returns later to continue working:** Reloading or re-entering preserves all changes.

The experience should feel continuous. The user should always understand where they are, what they can interact with, and how to access their work.

### 4.2 Two Collaboration Modes

**Synchronous collaboration:**
- Multiple students occupy the same virtual space simultaneously.
- Students can see other participants and their avatars.
- Proximity-based communication can be introduced in later increments.
- Students can collaborate during scheduled lectures, team meetings, and working sprint sessions.

**Asynchronous collaboration:**
- Students can access course information independently at any hour.
- Students can review and update tasks on the task board.
- Students can access and review project resources in the resource library.
- Students can update project information and review previous work and team progress.
- Changes remain available and synchronized when teammates return later.

> **Key Principle:** Asynchronous functionality is essential. LearnNexus must remain useful and productive when nobody else is online. 24/7 simultaneous presence is not a product requirement.

### 4.3 Important alternate and error paths

-   **No assigned class:** Show a clear empty state explaining that no
    academic space is currently available.
-   **Unauthorized class/workspace:** Prevent entry and show an
    access-denied state.
-   **Workspace data unavailable:** Show an error and a retry action; do
    not silently replace saved data with empty content.
-   **Save failure:** Preserve the user's current input where practical,
    communicate that the change was not saved, and provide a retry path.
-   **Workstation unavailable or not interactive:** Keep the user in the
    environment and provide clear feedback.
-   **Session expired:** Ask the user to re-enter through the sign-in
    flow without implying that unsaved changes were stored.

### 4.4 Lecturer journey (broader product)

1.  Lecturer enters through an authorized lecturer account.
2.  Lecturer opens a class management area.
3.  Lecturer creates or updates class information.
4.  Lecturer assigns students to teams.
5.  Lecturer publishes project instructions, materials, deadlines, and
    required deliverables.
6.  Students access the assigned class and team workspace.
7.  Lecturer reviews project progress and submissions when those
    capabilities are available.

This journey describes intended product behavior. It is not part of the
required semifinal student demonstrator.

## 5. Scope

### 5.1 P0 --- Must Have for the semifinal demonstrator

P0 defines the essential single-user, demonstrable vertical slice with real persistence:

-   **S-001 --- Application entry:** Provide a clear way to enter the student experience (supporting real Supabase Auth or verified demo profiles).
-   **S-002 --- Virtual campus or academic-space navigation:** Show at least one assigned academic space with real or explicitly seeded demonstration data.
-   **S-003 --- Navigable 2D environment:** At least one convincing navigable top-down 2D pixel-art environment rendered crisply with smooth avatar movement and collision boundaries.
-   **S-004 --- Interactive academic or team workspace:** Provide an identifiable team studio associated with the selected academic space.
-   **S-005 --- Contextual workstation interaction:** Interactive workstations that open practical productivity panels (`[E]` key or click).
-   **S-006 --- Project overview:** Display project title, description, objectives, and milestone status.
-   **S-007 --- Task board:** View and update team tasks and sprint statuses (`To Do`, `In Progress`, `Done`).
-   **S-008 --- Resource access:** View project resource links and reference documentation safely.
-   **S-009 --- Persistent project data:** Persist project information, task updates, and resource links durably in Supabase Postgres across page reloads and re-entries.
-   **S-010 --- Clear navigation between environment and productivity panels:** Coherent return path from open drawers back to spatial canvas without losing scene context.

A feature is not P0 merely because it appears in the broader vision. It
must contribute directly to this end-to-end demonstrator.

### 5.2 P1 --- Valuable extensions

-   Additional campus environments (e.g. Auditorium, Library, Student Commons).
-   Classroom and auditorium experiences for scheduled lectures and presentations.
-   More complete academic information (announcements, syllabus documents).
-   Team activity history and audit logs.
-   Improved interaction feedback (audio cues, subtle particle highlights).
-   Collaborative whiteboard / canvas integration.
-   Multiple team workspaces within a single academic space.
-   Real-time presence indicators and avatar synchronization.

P1 items may be promoted into the semifinal build only after the P0 flow
is stable and the team has verified the time required.

### 5.3 P2 --- Future development

-   Full multiplayer spatial interaction and networking.
-   Proximity voice and video communication.
-   Advanced avatar customization and accessory selection.
-   Larger connected campus world map.
-   Complex social mechanics (clubs, informal hangouts).
-   Advanced institutional administration and lecturer grading rubrics.
-   Full LMS functionality and enterprise SIS integration.
-   AI-powered academic features and summarization.

### 5.4 Out of Scope for the semifinal demonstrator

-   A complete university administration system.
-   Full replacement of an LMS.
-   A complete video-conferencing or voice-chat platform.
-   Real-time collaborative document editing.
-   Complex multiplayer simulation or game physics.
-   A large, fully populated virtual university.
-   Advanced AI academic assistance.
-   External university-system integrations.
-   Production-grade dynamic infrastructure provisioning.
-   Mobile-native applications.
-   Gamification systems unrelated to the academic collaboration
    workflow.
-   Sci-fi control rooms, holographic interfaces, cyberpunk visuals, and
    military terminology.
-   Clearance levels and artificial technical identifiers.

### 5.5 Future considerations

These may be reconsidered after the semifinal and based on user
feedback: - Full lecturer dashboard and submission review workflow. -
More extensive team collaboration and presence. - Rich document
collaboration. - External LMS or university integrations. - Additional
academic spaces and configurable campus layouts. - Improved mobile
experience. - More advanced activity and progress reporting.

## 6. Feature Requirements

### F-001 --- Student entry and session

-   **Priority:** P0 for a demonstrator entry flow; production
    authentication is P1.
-   **User value:** Gives the student a clear entry point into
    LearnNexus.
-   **Description:** The student enters the application using an
    individual account or a controlled demonstration entry.
-   **Trigger:** Student opens the application.
-   **Expected behavior:** The application presents the appropriate
    entry flow and then opens the student's available academic spaces.
-   **Related design:** UI-01, UI-02.
-   **Dependencies:** Session/identity approach; class membership data.
-   **Acceptance criteria:**
    -   [ ] The entry screen clearly identifies LearnNexus.
    -   [ ] The user can enter the student experience through the
        implemented flow.
    -   [ ] If demo access is used, the interface and proposal identify
        it as a demonstration mode, not production authentication.
    -   [ ] Invalid or unavailable entry attempts produce understandable
        feedback.
-   **Failure/edge cases:** Invalid credentials, expired session,
    unavailable identity service.
-   **Verification method:** Execute the entry flow with valid and
    invalid test conditions.

### F-002 --- Assigned academic space selection

-   **Priority:** P0.
-   **User value:** Directs the student to the correct class.
-   **Description:** Present the academic spaces assigned to the current
    student.
-   **Trigger:** Successful entry.
-   **Expected behavior:** The student sees available class cards or an
    equivalent selection interface and can enter an assigned class.
-   **Related design:** UI-02.
-   **Dependencies:** Student identity/demo profile and class assignment
    data.
-   **Acceptance criteria:**
    -   [ ] At least one assigned class can be selected in the
        demonstrator.
    -   [ ] Each class item communicates its name and relevant context.
    -   [ ] Selecting a class opens its associated environment.
    -   [ ] An empty state is shown when no class is assigned.
-   **Failure/edge cases:** Empty class list; class data unavailable;
    class access denied.
-   **Verification method:** Test with a student profile containing an
    assigned class and one with no assigned class.

### F-003 --- 2D spatial navigation

-   **Priority:** P0.
-   **User value:** Makes the virtual campus a meaningful navigation
    surface rather than a decorative background.
-   **Description:** Allow the student to navigate a 2D environment
    using an avatar.
-   **Trigger:** Student enters a class/team environment.
-   **Expected behavior:** The environment renders a navigable space,
    the avatar responds to supported movement input, and the user can
    identify interactive areas.
-   **Related design:** UI-03, UI-04.
-   **Dependencies:** Environment/map assets and interaction rules.
-   **Acceptance criteria:**
    -   [ ] The environment loads into a usable initial position.
    -   [ ] The avatar moves using the documented input method.
    -   [ ] Movement is constrained to the intended navigable area.
    -   [ ] Interactive workstations are visually distinguishable.
    -   [ ] The user can identify how to interact with a workstation.
-   **Failure/edge cases:** Environment loading failure; unsupported
    input; movement blocked by map boundaries.
-   **Verification method:** Manually test movement, boundaries, and
    workstation discoverability in the target desktop browser.

### F-004 --- Team workspace access

-   **Priority:** P0.
-   **User value:** Gives each group a dedicated place for its project
    work.
-   **Description:** Provide a team workspace associated with the
    selected academic class.
-   **Trigger:** Student selects or navigates to the assigned team area.
-   **Expected behavior:** The environment presents the student's
    assigned workspace and its associated workstations.
-   **Related design:** UI-03, UI-04.
-   **Dependencies:** Class/team relationship and access rules.
-   **Acceptance criteria:**
    -   [ ] The demonstrator contains at least one identifiable team
        workspace.
    -   [ ] The workspace is associated with the selected class.
    -   [ ] The student can enter the workspace through the documented
        flow.
    -   [ ] The workspace identity remains clear when panels are opened.
-   **Failure/edge cases:** Missing team assignment; unavailable
    workspace; unauthorized access.
-   **Verification method:** Follow the student journey from class
    selection to team workspace.

### F-005 --- Workstation interaction and contextual panel

-   **Priority:** P0.
-   **User value:** Connects spatial navigation to practical academic
    tools.
-   **Description:** A user interacts with a workstation to open its
    associated productivity panel.
-   **Trigger:** User selects or approaches an interactive workstation
    and activates the interaction.
-   **Expected behavior:** The correct panel opens without losing the
    user's environment context.
-   **Related design:** UI-04, UI-05, UI-06, UI-07.
-   **Dependencies:** Workstation definitions and panel state.
-   **Acceptance criteria:**
    -   [ ] At least one workstation is interactive.
    -   [ ] The interaction produces a visible response.
    -   [ ] The correct contextual panel opens.
    -   [ ] The user can close the panel and return to the environment.
    -   [ ] Opening and closing the panel does not reset the user's
        environment position unnecessarily.
-   **Failure/edge cases:** Unknown workstation; panel content
    unavailable; repeated interaction.
-   **Verification method:** Interact with every workstation included in
    the demonstrator and verify its mapped panel.

### F-006 --- Project overview

-   **Priority:** P0.
-   **User value:** Gives team members a shared understanding of the
    project.
-   **Description:** Display core project information in a contextual
    panel.
-   **Trigger:** Student opens the project overview workstation.
-   **Expected behavior:** Show the project title,
    description/objectives, and available status or announcement
    information.
-   **Related design:** UI-05.
-   **Dependencies:** Project data.
-   **Acceptance criteria:**
    -   [ ] Project title and description are visible.
    -   [ ] The content belongs to the selected team workspace.
    -   [ ] Missing optional content does not break the panel.
    -   [ ] Demonstration data is distinguishable from real
        user-generated data.
-   **Failure/edge cases:** Missing project description; project data
    load failure.
-   **Verification method:** Compare the displayed panel with the
    configured project fixture/data.

### F-007 --- Task and milestone view

-   **Priority:** P0 for viewing; task editing is conditional on
    implementation capacity.
-   **User value:** Makes project responsibilities and progress visible.
-   **Description:** Display tasks associated with the selected team
    project.
-   **Trigger:** Student opens the task workstation.
-   **Expected behavior:** Show task title, status, and any available
    assignee or due date.
-   **Related design:** UI-06.
-   **Dependencies:** Task data and workspace association.
-   **Acceptance criteria:**
    -   [ ] The task panel displays the available project tasks.
    -   [ ] Each task has a readable title and status.
    -   [ ] Missing assignee or due-date information is handled
        gracefully.
    -   [ ] If task status editing is implemented, the changed status is
        visibly confirmed.
    -   [ ] If task editing is not implemented, the panel is presented
        as a read-only demonstrator.
-   **Failure/edge cases:** Empty task list; task data unavailable;
    update rejected.
-   **Verification method:** Check populated and empty task states; test
    update behavior only if implemented.

### F-008 --- Resource view

-   **Priority:** P0 for viewing sample/reference resources.
-   **User value:** Gives students a common place to find project
    materials.
-   **Description:** Display project resources such as reference links
    or lecturer-provided materials.
-   **Trigger:** Student opens the resources workstation.
-   **Expected behavior:** Show available resources with a clear title
    and resource type or destination.
-   **Related design:** UI-07.
-   **Dependencies:** Resource records or demonstration fixtures.
-   **Acceptance criteria:**
    -   [ ] The panel lists available resources.
    -   [ ] A resource link, when present, opens its intended
        destination safely.
    -   [ ] Empty and unavailable resource states are communicated.
    -   [ ] Sample resources are identified as demonstration content.
-   **Failure/edge cases:** Broken link; empty resource list;
    unavailable resource record.
-   **Verification method:** Test each displayed resource link and the
    empty state.

### F-009 --- Workspace persistence

-   **Priority:** P0 for at least one demonstrable persistent data path.
-   **User value:** Allows students to leave and return without losing
    shared project information.
-   **Description:** Persist supported project/workspace data
    independently of the active spatial session.
-   **Trigger:** Data is loaded, changed, or the user returns to a
    workspace.
-   **Expected behavior:** The application retrieves the latest saved
    data for the workspace. A supported update remains available after
    leaving and re-entering.
-   **Related design:** UI-05, UI-06, UI-07.
-   **Dependencies:** Persistence mechanism and workspace identity.
-   **Acceptance criteria:**
    -   [ ] The application loads project/workspace information for the
        selected workspace.
    -   [ ] At least one supported data item or update survives a
        refresh or leave-and-return test.
    -   [ ] The UI communicates save success or failure when editing is
        supported.
    -   [ ] The team can identify whether the demonstrator uses backend
        storage, browser-local storage, or mock data.
    -   [ ] The proposal does not describe local-only persistence as
        shared server persistence.
-   **Failure/edge cases:** Network interruption; save failure; stale
    data; unavailable workspace.
-   **Verification method:** Save or seed a known value,
    refresh/re-enter, and verify the value remains. Record the actual
    storage mechanism.

### F-010 --- Basic lecturer class and team setup

-   **Priority:** P1.
-   **User value:** Allows lecturers to organize academic activities.
-   **Description:** Provide a lecturer-facing way to manage class and
    team assignments.
-   **Trigger:** Lecturer opens the management interface.
-   **Expected behavior:** Lecturer can view or update the class/team
    information supported by the release.
-   **Related design:** Future lecturer screens; not part of the
    required semifinal screen set.
-   **Dependencies:** Lecturer identity, authorization, class/team data
    model.
-   **Acceptance criteria:**
    -   [ ] Lecturer-only actions are not exposed as student actions.
    -   [ ] A lecturer can manage the supported class/team data.
    -   [ ] Changes are reflected in the student experience after reload
        or refresh.
-   **Failure/edge cases:** Unauthorized user; invalid assignment;
    conflicting membership.
-   **Verification method:** Role-based functional tests when
    implemented.

### F-011 --- Team presence and real-time synchronization

-   **Priority:** P1.
-   **User value:** Helps team members understand who is currently in
    the shared workspace and see relevant live updates.
-   **Description:** Represent connected team members and synchronize
    selected shared changes.
-   **Trigger:** A team member enters, leaves, or updates a supported
    shared item.
-   **Expected behavior:** Other connected authorized members receive
    the supported presence/update information.
-   **Related design:** UI-04 and UI-08 if implemented.
-   **Dependencies:** Realtime transport, identity, authorization,
    conflict behavior.
-   **Acceptance criteria:**
    -   [ ] Connected members are represented accurately enough for the
        declared scope.
    -   [ ] Presence is cleared or expires when a member disconnects.
    -   [ ] Supported shared updates appear for other authorized
        members.
    -   [ ] Temporary realtime presence is not treated as the source of
        persistent project records.
-   **Failure/edge cases:** Unexpected disconnect; delayed update;
    duplicate presence; simultaneous edits.
-   **Verification method:** Test with at least two independent browser
    sessions if this feature is included.

### F-012 --- Deliverables and submissions

-   **Priority:** P2 for the initial demonstrator; broader product
    capability.
-   **User value:** Gives students and lecturers a shared submission
    workflow.
-   **Description:** Present required deliverables, instructions, and
    submission status; later support actual submission and review.
-   **Trigger:** Student opens the deliverables area.
-   **Expected behavior:** The interface displays the relevant
    requirements and, when implemented, supports submission.
-   **Related design:** Future UI screen.
-   **Dependencies:** Assignment model, file storage, permissions,
    deadline rules.
-   **Acceptance criteria:**
    -   [ ] Requirements and status are displayed accurately.
    -   [ ] Submission is not shown as complete unless the system
        confirms it.
    -   [ ] Lecturer review is restricted to authorized lecturer users.
-   **Failure/edge cases:** Unsupported file type, upload failure, late
    submission, missing assignment.
-   **Verification method:** Functional submission tests when
    implemented.

## 7. Functional Requirements

  -----------------------------------------------------------------------
  ID                                  Requirement
  ----------------------------------- -----------------------------------
  FR-001                              The system shall provide an entry
                                      flow that establishes or simulates
                                      a student session, with demo mode
                                      clearly distinguished from
                                      production authentication.

  FR-002                              The system shall show the academic
                                      spaces available to the current
                                      student.

  FR-003                              The system shall prevent users from
                                      entering academic spaces for which
                                      they are not authorized.

  FR-004                              The system shall provide a
                                      navigable 2D environment for the
                                      selected academic/team space.

  FR-005                              The system shall provide a
                                      dedicated workspace associated with
                                      a team and its academic class.

  FR-006                              The system shall expose interactive
                                      workstations within the spatial
                                      environment.

  FR-007                              The system shall open the
                                      productivity panel associated with
                                      the selected workstation.

  FR-008                              The system shall display project
                                      information associated with the
                                      selected workspace.

  FR-009                              The system shall display tasks
                                      associated with the selected
                                      workspace.

  FR-010                              The system shall display resources
                                      associated with the selected
                                      workspace.

  FR-011                              The system shall retain supported
                                      workspace/project data across the
                                      declared persistence boundary.

  FR-012                              The system shall communicate
                                      loading, empty, success, and error
                                      states for important data
                                      operations.

  FR-013                              The system shall separate student,
                                      lecturer, and administrator
                                      permissions when those roles are
                                      implemented.

  FR-014                              The system should support real-time
                                      presence and selected shared
                                      updates as a later capability.

  FR-015                              The system should support
                                      lecturer-managed class/team setup
                                      and assignment workflows.

  FR-016                              The system may support deliverable
                                      submission and review in a later
                                      release.
  -----------------------------------------------------------------------

## 8. Quality Requirements

These are product quality expectations. Numeric targets should be added
only after the team has measured the prototype or selected a justified
service-level target.

### Q-001 --- Usability

-   First-time users should be able to identify how to move and how to
    interact with a workstation.
-   Workstation purpose should be communicated through labels, icons, or
    other clear visual cues.
-   Productivity panels should prioritize readable project information
    over decorative content.

### Q-002 --- Performance

-   The 2D environment should remain responsive during normal navigation
    on the supported desktop browser/device range.
-   Rendering, assets, and networking should be kept proportionate to
    the demonstrator's needs.
-   The team should record the browser and device used for
    demonstration/testing.

### Q-003 --- Persistence and data integrity

-   Persistent project records must not depend solely on a temporary
    multiplayer connection.
-   A failed save must not be presented as a successful save.
-   The application should distinguish saved data from unsaved local
    edits.

### Q-004 --- Security and access

-   Restricted academic data must only be accessible to authorized
    users.
-   Student, lecturer, and administrator capabilities must be separated
    when those roles are enabled.
-   Secrets and privileged service credentials must not be exposed in
    client-side code.
-   Any demonstration account or seeded data must avoid exposing real
    student information.

### Q-005 --- Reliability

-   Failure to load a panel or workspace should not unnecessarily crash
    or reset the entire application.
-   Important errors should be visible and actionable.
-   The primary student flow should be tested from entry through return
    to the workspace.

### Q-006 --- Compatibility and accessibility

-   The semifinal demonstrator prioritizes modern desktop browsers.
-   Essential controls should have visible labels or instructions.
-   Text and controls should remain legible at the target presentation
    resolution.
-   Keyboard navigation and focus behavior should be considered for
    non-canvas UI controls.

## 9. AI and Integrations

### AI

AI is **not a requirement** for the initial LearnNexus product or
semifinal demonstrator. Do not add AI functionality unless the product
scope is explicitly revised and approved.

### External integrations

No external university, LMS, calendar, or identity-provider integration
is committed for the semifinal demonstrator.

Reference links may be displayed in the resource panel. Actual
integrations require a separate product and technical decision.

## 10. Constraints and Dependencies

### Confirmed project constraints

-   STACK 2026, Case 1: Smarter Campus and Learning.
-   Team: SibukTA, four members.
-   Semifinal submission deadline: 30 November 2026, 23:59 WIB.
-   Required submission includes a proposal PDF and an Instagram
    Reel/video link, according to the team's current understanding of
    the semifinal instructions. The latest official instructions remain
    authoritative.
-   The explanatory video must be under two minutes and demonstrate a
    user flow or early prototype.
-   The preliminary judge feedback identified technical feasibility and
    the missing development timeline as weaknesses.
-   The current team repository already exists.
-   The immediate delivery is a demonstrable prototype, not a complete
    production application.

### Dependencies to resolve in Part 3

-   Exact authentication/demo-entry approach.
-   Persistence mechanism for the demonstrator.
-   Whether the team can support real backend data within the deadline.
-   Realtime implementation boundary.
-   Hosting/deployment approach.
-   Asset availability and licensing.
-   Browser/device target for the live demonstration.

### Delivery constraint

The team has approximately seven days from 23 November to the 30
November deadline. The product scope must therefore prioritize a small
end-to-end student workflow. If time becomes constrained, remove
optional features before compromising the core flow, verification,
proposal, or video.

## 11. Success and Definition of Done

### Semifinal demonstrator success

The demonstrator is ready when the team can reliably show the following
sequence:

1.  Enter the student experience.
2.  Select an assigned class.
3.  Enter a navigable 2D environment.
4.  Reach a team workspace.
5.  Interact with a workstation.
6.  Open and understand a project panel.
7.  View tasks and resources.
8.  Demonstrate at least one truthful persistence path.
9.  Close the panel and return to the environment.

### Evidence required

-   A recorded end-to-end demonstration.
-   Screenshots of the primary screens.
-   A test checklist showing which requirements were actually verified.
-   A clear list of simulated, seeded, read-only, and implemented
    functionality.
-   A list of known limitations.

### Release/demo definition of done

-   [ ] P0 acceptance criteria have been reviewed.
-   [ ] The primary student flow works from beginning to end.
-   [ ] The persistence behavior has been tested and its mechanism
    documented.
-   [ ] No critical error blocks the planned demonstration.
-   [ ] Demonstration data is identified as such.
-   [ ] The proposal and video describe actual implementation status
    accurately.
-   [ ] Known limitations are disclosed.
-   [ ] A fallback recording or screenshots are available in case the
    live demo fails.

## 12. Assumptions, Risks, and Open Questions

### Confirmed facts

-   The team selected the Hybrid Studio direction.
-   LearnNexus is intended as a browser-based 2D virtual campus for
    academic collaboration.
-   Students, lecturers, and administrators are the intended actor
    groups in the broader product.
-   The preliminary abstract proposed React, TypeScript, Phaser 3, and
    backend persistence/authentication/realtime capabilities.
-   AI is not required for the initial version.
-   The preliminary judge gave the project 81.0/100.
-   Judge feedback praised case fit and literature relevance, while
    identifying the lack of primary user data and an insufficiently
    justified technical timeline.

### Assumptions for this draft

-   The semifinal demonstrator will prioritize a student journey rather
    than a complete lecturer workflow.
-   The first demonstrator may use seeded sample class/project data.
-   A controlled demo-entry flow may be acceptable for the demonstrator
    if clearly disclosed; whether to implement real authentication is a
    Part 3 decision.
-   The first demonstrator can prove persistence for a limited data set
    rather than implementing every persistent product entity.
-   Desktop browser is the primary target for the competition
    demonstration.

### Recommendations

-   Treat multiplayer presence as optional until the single-user
    workflow and persistence are stable.
-   Avoid building a complete lecturer dashboard before the student
    workflow is demonstrable.
-   Collect a small amount of direct student feedback if feasible and
    accurately report the sample and method.
-   Keep the final demo scenario fixed so the team can test and record
    it repeatedly.

### Risks

  ----------------------------------------------------------------------------
  ID                Risk                   Impact            Mitigation
  ----------------- ---------------------- ----------------- -----------------
  R-001             Scope exceeds the      Core flow or      Protect P0 scope;
                    seven-day delivery     submission        defer P1/P2
                    window                 quality suffers   features

  R-002             Multiplayer/realtime   Prototype becomes Build spatial
                    complexity consumes    unstable or       interaction and
                    implementation time    incomplete        persistence
                                                             first; realtime
                                                             later

  R-003             Persistence is only    Misleading        Document actual
                    simulated but          proposal/video    storage mechanism
                    presented as backend   and weak          and test
                    persistence            technical         leave/re-enter
                                           credibility       behavior

  R-004             No direct user         Repeats           Conduct a small,
                    validation is          preliminary judge clearly described
                    collected              criticism         usability check
                                                             if feasible

  R-005             Team availability is   Work becomes      Assign bounded
                    limited                concentrated on   independent tasks
                                           one member        and asynchronous
                                                             PR reviews

  R-006             Prototype visuals      Judges            Label mock,
                    imply features that do misunderstand     seeded,
                    not work               completion status read-only, and
                                                             planned behavior
                                                             explicitly
  ----------------------------------------------------------------------------

### Open questions

-   Will the semifinal demonstrator use real authentication or a
    controlled demo-entry flow?
-   Which persistence mechanism will be used for the first demonstrable
    data path?
-   Which workstation panels will be fully interactive versus read-only?
-   Will real-time presence be feasible after the P0 flow is complete?
-   What exact Instagram posting, caption, tagging, and link-submission
    rules are specified by the latest committee instructions?
-   Can the team obtain direct feedback from representative students
    before submission?

## 13. Decision Log

  ------------------------------------------------------------------------------------
  ID             Decision               Status         Rationale        Date
  -------------- ---------------------- -------------- ---------------- --------------
  D-001          Use Cozy Digital       Approved       Selected concept 24 Nov 2026
                 Campus: persistent 2D  direction      reset: pastel    
                 pixel-art virtual                     productivity +   
                 campus + pastel                       welcoming campus;
                 productivity workspace                replaces dark/   
                                                       futuristic theme 

  D-002          Position LearnNexus as Approved       Core value is    19 Nov 2026
                 an academic            direction      persistent       
                 collaboration                         academic         
                 platform, not a game                  workspace and    
                 clone                                 project workflow 

  D-003          Use a student-first    Proposed for   Most direct way  23 Nov 2026
                 vertical slice for the team approval  to prove the     
                 semifinal demonstrator                core user        
                                                       journey within   
                                                       the deadline     

  D-004          Defer full             Recommended    Addresses        23 Nov 2026
                 multiplayer/realtime                  feasibility      
                 until the core                        concern and      
                 workflow is stable                    reduces delivery 
                                                       risk             

  D-005          Treat real             Open           Must balance     23 Nov 2026
                 authentication versus                 product          
                 demo entry as an                      credibility,     
                 architecture decision                 implementation   
                                                       time, and demo   
                                                       requirements     

  D-006          Treat the Mini PRD as  Proposed for   Separates        23 Nov 2026
                 the broader product    team approval  product vision   
                 direction, not a                      from competition 
                 requirement to                        demonstrator     
                 implement every                       scope            
                 feature for the                                        
                 semifinal                                              

  D-007          Adopt Cozy Digital     Approved       Previous dark,   24 Nov 2026
                 Campus visual system                  sci-fi, and      
                 (warm pastel palette,                 overly technical 
                 accessible sans-serif,                interface        
                 pixel-art top-down                    rejected in      
                 campus)                               favor of calm,   
                                                       welcoming        
                                                       productivity     

  D-008          Synchronous &          Approved       Asynchronous     24 Nov 2026
                 asynchronous                          usability is     
                 collaboration with                    essential so     
                 asynchronous-first                    students can work
                 usability                             meaningfully even
                                                       when teammates   
                                                       are offline      

  D-009          Target Information     Approved       Clarifies full   24 Nov 2026
                 Architecture:                         campus hierarchy 
                 Virtual Campus,                       while bounding   
                 Academic Spaces,                      semifinal scope  
                 Team Workspaces                       to essential     
                                                       student journey  

  D-010          Retain Phaser 3 for    Approved       Phaser provides  24 Nov 2026
                 2D spatial canvas;                    tilemaps, camera,
                 defer PixiJS                          movement, and    
                                                       collisions out   
                                                       of the box; fix  
                                                       canvas rendering 
                                                       quality issues   

  D-011          Retain Supabase        Approved       Relational data, 24 Nov 2026
                 Postgres with RLS                     RLS security, and
                 for workspace                         asynchronous     
                 persistence                           persistence      
                                                       without complex  
                                                       backend rewrite  
  ------------------------------------------------------------------------------------

## 14. Related Documents

-   `DESIGN.md` --- screen structure, interactions, visual direction,
    and UI states.
-   `ARCHITECTURE.md` --- technical architecture and implementation
    decisions (Part 3).
-   `MILESTONE.md` --- delivery outcomes and progress map (Part 3).
-   `Mini_PRD.md` --- earlier Hybrid Studio product brief; superseded by
    this PRD where scope or requirements differ after team approval.
-   `LearnNexus_Abstract.md` --- preliminary submission.
-   `docs/workflow/README.md` --- nine-part development workflow.
-   `docs/workflow/2_product-definition-and-design.md` --- Part 2
    procedure.
