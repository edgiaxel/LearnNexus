# Product Design --- LearnNexus

> Interface, visual system, and interaction specification for the LearnNexus persistent
> 2D virtual campus.
>
> **Status:** Approved product & visual design specification\
> **Version:** 0.3\
> **Last updated:** 24 November 2026\
> **Related product requirements:** `PRD.md`\
> **Visual Identity:** Cozy Digital Campus (Cozy pastel, minimal, friendly, approachable, pixel-art-inspired)\
> **Current delivery target:** STACK 2026 Semifinal, 30 November 2026

------------------------------------------------------------------------

## 1. Design Overview

### 1.1 Product experience

LearnNexus is a persistent virtual learning environment that connects academic spaces
with collaborative project workspaces. It combines a cozy, pastel-colored productivity
application with a welcoming 2D pixel-art virtual campus.

The student should feel that they are entering a calm, friendly academic space:
navigating through campus grounds, classrooms, the library, and dedicated team studios,
and accessing practical project tools by interacting with physical workstations.

The spatial environment is not merely a decorative background. It serves as the primary
spatial navigation and social discovery layer. The productivity panels—rendered in clean,
accessible HTML—are where students read, organize, and manage course and project work.

LearnNexus is an academic productivity platform with a spatial campus experience. It is
**NOT** a traditional multiplayer game, futuristic operating system, cyberpunk interface,
or generic enterprise dashboard. Persistence does not automatically imply real-time
multiplayer simulation.

### 1.2 Design goals

1.  **Warmth and Approachability:** Make students feel welcomed, focused, and unhurried
    rather than overwhelmed by dense enterprise tables or dark sci-fi interfaces.
2.  **Clear Spatial Orientation:** Ensure the student's journey from sign-in to academic
    space selection to team workspace is intuitive, legible, and continuous.
3.  **Contextual Tool Discovery:** Make interactive workstations discoverable through
    natural visual landmarks (desks, corkboards, bookshelves) and clear interaction cues.
4.  **Readable Productivity Panels:** Keep project information, tasks, and resources
    clean, readable, and functional using modern minimalist UI standards.
5.  **Preserve Spatial Context:** Keep the student grounded in their virtual studio when
    opening, viewing, or editing productivity panels.
6.  **Honest and Calm System Feedback:** Communicate loading, empty, success, saving,
    and error states with clarity and transparency.
7.  **Coherent Semifinal Vertical Slice:** Deliver a unified visual system for the
    semifinal demonstration without introducing unnecessary visual complexity.

### 1.3 Primary user

The primary design target is a university student entering an assigned class space and
continuing collaborative work with their project team.

Lecturer and administrator interfaces belong to broader product capabilities and are
specified for future increments.

### 1.4 Main design principles

-   **Cozy & Purposeful:** The environment reflects an inviting academic campus—featuring
    libraries, courtyards, study carrels, and collaborative studio tables.
-   **Tools Are Attached to Places:** Workstations provide clear spatial entry points
    to relevant course and project functions.
-   **Keep Spatial Context:** Productivity panels open as contextual drawers or modals
    over the environment rather than displacing the user's spatial anchor.
-   **Clarity Over Decoration:** Avoid superfluous cards, heavy borders, dark sci-fi HUDs,
    and decorative badges. Let clean spacing and restrained pastel accents guide attention.
-   **Persistent by Design:** Saved data, pending changes, and synchronization states are
    communicated honestly and quietly.
-   **Asynchronous-First Usability:** The interface remains completely usable and productive
    even when teammates are offline.
-   **Accessible & Readable:** High contrast text, legible typography, visible keyboard
    focus, and screen-reader accessible HTML structures.

### 1.5 Approved visual direction: Cozy Digital Campus

The visual direction is **Cozy pastel, minimal, friendly, approachable, and pixel-art-inspired**.

#### Visual characteristics:
-   **Environment:**
    -   Top-down 2D perspective.
    -   Cozy pixel-art or simple illustrated environments.
    -   Warm and inviting spaces with natural materials (polished wood, warm stone, paper).
    -   Soft pastel colors and sunny campus courtyard atmosphere.
    -   Natural environmental details: trees, plants, furniture, bookshelves, study desks,
        windows, and decorative objects.
    -   Clear spatial organization and visually distinct areas for different academic activities.
-   **UI (Application Chrome & Productivity Panels):**
    -   Minimal interface complementing the environment rather than competing with it.
    -   Clean sans-serif typography (`Inter` and `Plus Jakarta Sans`).
    -   Rounded corners where appropriate (`8px` to `14px`).
    -   Soft backgrounds and restrained borders.
    -   Subtle shadows and soft elevation.
    -   Clear information hierarchy with simple, scannable icons.
    -   Compact navigation and friendly status indicators.
    -   Consistent spacing following a 4px/8px grid.

#### UI Design Rules

**Avoid:**
-   Futuristic sci-fi interfaces and military metaphors.
-   Excessive dark backgrounds and neon blue or green accents.
-   Glowing borders, neon HUDs, terminal grids, or scanline overlays.
-   Unnecessary technical labels, clearance levels, or fake system diagnostics.
-   Decorative status indicators that imply nonexistent functionality.
-   Overly dense sidebars and nested multi-tier navigation tables.
-   Large empty panels without clear purpose or guidance.
-   Generic AI-generated dashboard aesthetics.

**Prefer:**
-   A clear and compact application shell.
-   A spacious, high-clarity environment viewport.
-   Simple navigation between Campus, Academic Spaces, Workspace, and Documentation.
-   Contextual side drawers that open when interacting with a spatial object.
-   Consistent components, buttons, and badges across all screens.
-   Clear distinction between navigation chrome, 2D environment, and productivity tools.

---

## 2. Master Visual System & Design Tokens

### 2.1 Color direction & palette tokens

The design system uses a light, warm visual foundation. Dark mode may be considered
later, but it must not define the primary visual direction.

#### Core palette tokens

```css
:root {
  /* Warm Surface and Backgrounds */
  --color-bg-warm: #F7F4EC;         /* Warm campus cream / off-white parchment background */
  --color-surface-primary: #FFFFFF; /* Clean white primary surface (panels, cards, dialogs) */
  --color-surface-secondary: #EEF1E8; /* Soft sage-tinted secondary surface */
  --color-surface-tertiary: #E5E9DE;  /* Hover / active background tint */

  /* Pastel Accents */
  --color-accent-sage-soft: #C9D7BA;/* Soft sage (supporting tint / tag backgrounds) */
  --color-accent-sage: #A4B99C;     /* Muted green brand accent (borders, dark-text pills) */
  --color-accent-sage-strong: #4A6B46; /* Primary CTA button fill (6.03:1 with #FFFFFF) */
  --color-accent-sage-strong-hover: #3B5638; /* Primary CTA hover/active fill (8.16:1 with #FFFFFF) */
  --color-accent-lavender: #DAD2E9; /* Soft lavender / category / team tags */
  --color-accent-blue: #C9DFE8;     /* Soft sky blue / info links / library resources */
  --color-accent-peach: #F1D2BC;    /* Warm peach / milestones / warning accents */
  --color-accent-yellow: #F0DFA7;   /* Butter yellow / pending tasks / notices */

  /* Text and Content (WCAG AA >= 4.5:1 verified) */
  --color-text-charcoal: #343A40;   /* Muted charcoal for headings and high contrast */
  --color-text-primary: #30343B;    /* Dark readable text for body and inputs */
  --color-text-secondary: #5C665C;  /* Muted slate sage for secondary labels and hints */
  --color-text-muted: #636B63;      /* Accessible muted text for disabled states and metadata */
  --color-text-inverse: #FFFFFF;    /* White text for filled accent buttons */

  /* Borders and Dividers */
  --color-border-subtle: #E3E5DC;   /* Soft border for decorative cards and dividers */
  --color-border-control: #757E74;  /* Interactive input and control border (>= 3:1 WCAG 1.4.11) */
  --color-border-focus: #4A6B46;    /* High-contrast focused outline / active border */

  /* Functional Status Colors */
  --color-status-todo-bg: #FBF4DE;
  --color-status-todo-text: #785A10;
  --color-status-inprogress-bg: #F7ECE4;
  --color-status-inprogress-text: #7C4520;
  --color-status-done-bg: #EAF2EB;
  --color-status-done-text: #2D5A34;
  --color-status-error-bg: #FAECEB;
  --color-status-error-text: #8E2F29;
}
```

#### Contrast & accessibility validation

All primary color pairs satisfy WCAG 2.1 AA requirements:

| Element | Background | Text Color | Contrast Ratio | Compliance |
|---|---|---|---|---|
| Primary Body Text | `#FFFFFF` (Primary Surface) | `#30343B` | **12.50:1** | WCAG AAA (>= 7:1) |
| Primary Body Text | `#F7F4EC` (Warm Background) | `#30343B` | **11.37:1** | WCAG AAA (>= 7:1) |
| Charcoal Headings | `#FFFFFF` (Primary Surface) | `#343A40` | **11.51:1** | WCAG AAA (>= 7:1) |
| Secondary Text | `#FFFFFF` (Primary Surface) | `#5C665C` | **5.98:1** | WCAG AA (>= 4.5:1) |
| Secondary Text | `#EEF1E8` (Secondary Surface) | `#5C665C` | **5.24:1** | WCAG AA (>= 4.5:1) |
| Primary CTA Button | `#4A6B46` (Strong Sage) | `#FFFFFF` | **6.03:1** | WCAG AA (>= 4.5:1) |
| Primary CTA Hover | `#3B5638` (Strong Sage Hover) | `#FFFFFF` | **8.16:1** | WCAG AAA (>= 7:1) |
| Control Border | `#FFFFFF` / `#F7F4EC` | `#757E74` | **4.21:1** / **3.83:1** | WCAG 1.4.11 (>= 3:1) |
| To Do Badge | `#FBF4DE` (Butter Tint) | `#785A10` | **5.84:1** | WCAG AA |
| In Progress Badge | `#F7ECE4` (Peach Tint) | `#7C4520` | **6.62:1** | WCAG AA |
| Done Badge | `#EAF2EB` (Sage Tint) | `#2D5A34` | **7.01:1** | WCAG AA |
| Error Badge | `#FAECEB` (Error Tint) | `#8E2F29` | **7.05:1** | WCAG AA |

### 2.2 Typography

The typography uses a clean, friendly, readable sans-serif typeface.

-   **Primary Font Stack:** `Inter`, `Plus Jakarta Sans`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, sans-serif.
-   **Hierarchy & Scale:**

| Level | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| Display | 28px (`1.75rem`) | 36px (`2.25rem`) | 600 (Semibold) | Welcome headers, campus directory title |
| Heading 1 | 22px (`1.375rem`) | 28px (`1.75rem`) | 600 (Semibold) | Panel titles, workspace name |
| Heading 2 | 18px (`1.125rem`) | 24px (`1.5rem`) | 600 (Semibold) | Section titles, workstation headings |
| Heading 3 | 15px (`0.9375rem`) | 20px (`1.25rem`) | 500 (Medium) | Card titles, task group labels |
| Body | 14px (`0.875rem`) | 20px (`1.25rem`) | 400 (Regular) | Primary descriptions, project objectives, task text |
| Body Medium | 14px (`0.875rem`) | 20px (`1.25rem`) | 500 (Medium) | Button labels, active tabs, list items |
| Small / Meta | 12px (`0.75rem`) | 16px (`1.0rem`) | 400 / 500 | Timestamps, tags, resource types, hints |
| Micro / Pill | 11px (`0.6875rem`) | 14px (`0.875rem`) | 600 (Semibold) | Status badges, workstation category tags |

-   **Typography Rules:**
    -   Keep body line length comfortable (50–75 characters per line).
    -   Avoid uppercase tracking or militaristic all-caps tags.
    -   Minimal decorative text; prioritize immediate readability.

### 2.3 Spacing, geometry & elevation

-   **Base Spacing Grid:** 4px / 8px / 12px / 16px / 24px / 32px / 48px.
-   **Corner Geometry:**
    -   Buttons and badges: `8px` (`rounded-lg`).
    -   Cards and input fields: `10px` (`rounded-lg`).
    -   Productivity panels and dialogs: `14px` (`rounded-xl`).
    -   Pill badges: `9999px` (`rounded-full`).
-   **Borders:**
    -   Subtle `1px solid var(--color-border-subtle)` (`#E3E5DC`) for decorative dividers and cards; `1px solid var(--color-border-control)` (`#757E74`) for interactive inputs and control edges.
    -   Focus rings: `2px solid var(--color-border-focus)` (`#4A6B46`) with `2px offset`.
-   **Elevation & Shadows:**
    -   Elevation 0 (Flat): `none` (default for embedded cards).
    -   Elevation 1 (Gentle): `0 1px 3px rgba(52, 59, 54, 0.05)`.
    -   Elevation 2 (Panel/Card Hover): `0 4px 12px rgba(52, 59, 54, 0.07)`.
    -   Elevation 3 (Floating Drawer/Modal): `0 12px 28px rgba(52, 59, 54, 0.09)`.

---

## 3. Navigation and Information Architecture

### 3.1 Target Information Architecture

The complete LearnNexus product vision is structured around a three-tier spatial and functional hierarchy:

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

> **Scope Note:** This hierarchy represents the target product architecture. The semifinal prototype bounds implementation to the critical path: campus entry, academic space selection, and the team workspace studio pod with persistent project, task, and resource panels.

### 3.2 Student navigation flow

```text
LearnNexus (Cozy Digital Campus)
└── UI-01 Entry Gateway (Sign-in / Demo Profile)
    └── UI-02 Academic Spaces Directory (Enrolled Course Selection)
        └── UI-03 Campus / Classroom Environment (2D Navigable Environment)
            └── UI-04 Team Workspace Studio (Interactive Collaborative Pod)
                ├── UI-05 Project Overview Panel (Drawer)
                ├── UI-06 Tasks Sprint Board Panel (Drawer)
                └── UI-07 Resource Library Panel (Drawer)
```

### 3.3 Navigation behavior

1.  **Entry (UI-01):** The student enters via student credentials or selects a seeded demonstration profile.
2.  **Academic Directory (UI-02):** The system displays the student's assigned academic spaces. The student chooses their class.
3.  **Campus Environment (UI-03):** The student enters the 2D academic space, moving their avatar toward their assigned team workspace studio.
4.  **Team Studio (UI-04):** The student reaches their dedicated team studio, discovering interactive workstations.
5.  **Contextual Productivity Panel (UI-05 / UI-06 / UI-07):** Approaching a workstation and pressing `[E]` (or clicking) opens the corresponding productivity panel as a clean side drawer.
6.  **Preserved Context:** The 2D spatial environment remains mounted and visible in the background while the panel is open.
7.  **Return to Space:** Closing the panel restores keyboard movement focus immediately without re-rendering or resetting the scene.
8.  **Leave and Re-enter:** The student can navigate back to the academic directory at any time; persisted data is re-fetched on re-entry.

### 3.4 Application shell & global controls

The HTML application shell frames the spatial canvas with minimal, helpful chrome:

-   **Top Bar:**
    -   **Brand Mark:** LearnNexus cozy logo (friendly graduation cap / leaf icon).
    -   **Context Breadcrumbs:** `Academic Class / Team Workspace` (e.g., `Software Engineering Studio / Team SibukTA`).
    -   **Primary Nav Tabs:** Simple, quiet navigation links (`Campus`, `Academic Spaces`, `Workspace`, `Documentation`).
    -   **Leave Space Button:** Clear, calm secondary action to return to Academic Spaces (`UI-02`).
    -   **User Badge:** Student avatar initials and display name.
-   **Canvas Viewport:** Houses the mounted Phaser 3 canvas with a gentle 1px border.
-   **Floating Drawer Host:** Side drawer container anchored to the right side of the viewport, hosting the active productivity panel.

---

## 4. Spatial Environment & Interaction Design

### 4.1 Top-down 2D pixel-art approach

The spatial environment provides a welcoming virtual campus using a top-down 2D visual perspective.

-   **Asset Style:** Meticulously designed, clean 2D pixel art.
-   **Grid & Tile Proportions:** Standard `16x16` or `32x32` pixel tile resolution. Assets scale cleanly at 2x or 3x without blur.
-   **Atmosphere:** Sunny, welcoming, tranquil academic environment.
-   **Environmental Features:**
    -   Polished wooden flooring, warm stone pathways, and gentle brickwork.
    -   Bookshelves, potted indoor plants, cozy rugs, and round study tables.
    -   Windows showing sunny campus courtyard greenery.
    -   Notice boards with pinned paper notes.

### 4.2 Environmental locations & campus zones

| Location | Purpose | Key Environmental Elements |
|---|---|---|
| **Main Hall** | Campus entry, navigation, information | Welcome desk, central notice board, campus map directory, archways to academic wings. |
| **Auditorium** | Lectures, seminars, presentations | Raised presentation stage, podium, projector screen, tiered seating rows. |
| **Classroom** | Course activities and discussions | Instructor desk, chalkboard, clustered student tables, course syllabus stand. |
| **Library** | Learning materials and research | Tall book stacks, quiet study carrels, reading lamps, archival document folios. |
| **Student Commons** | Informal social interaction | Sunny open courtyard, outdoor picnic benches, potted trees, fountain, conversation lounges. |
| **Team Studio** | Project collaboration and team work | Dedicated team pods, round collaboration tables, and interactive project workstations. |

> **Semifinal Focus:** The semifinal prototype prioritizes the **Team Studio** and its connection to the **Academic Space**, proving the core journey where students enter, navigate, interact with workstations, and persist their work.

### 4.3 Expected interaction patterns

The virtual environment is an active spatial navigation and discovery surface:

1.  **Navigate the environment:** Fluid 4-directional avatar movement using `W`, `A`, `S`, `D` or Arrow keys.
2.  **Identify interactive objects:** Physical landmarks (desks, corkboards, bookshelves) stand out naturally through silhouette and subtle visual cues.
3.  **Approach an object:** Moving within 48px activates a gentle sage highlight outline and reveals a floating prompt: `[E] Open <Workstation Name>`.
4.  **Open contextual panel:** Pressing `E` or clicking opens the corresponding React productivity drawer on the right side of the screen.
5.  **Preserve spatial grounding:** The canvas stays mounted and visible behind the drawer. The player's position is preserved.
6.  **Return to the environment:** Pressing `Escape` or clicking `✕` closes the drawer and seamlessly restores avatar movement controls.
7.  **Understand current context:** Top-bar breadcrumbs always indicate the active room, course, and team workspace.

### 4.4 Interactive workstations in 2D space

Workstations represent physical project centers inside the team workspace:

1.  **Project Overview Workstation:**
    -   *Visual representation:* Wooden study desk with a computer monitor, open notebook, and desk lamp.
    -   *Silhouette cue:* Distinct computer screen icon and warm lamp glow.
2.  **Tasks Sprint Workstation:**
    -   *Visual representation:* Cork notice board / chalkboard with sticky notes next to a planning table.
    -   *Silhouette cue:* Clipboard and card layout silhouette.
3.  **Resource Library Workstation:**
    -   *Visual representation:* Tall wooden bookshelf with categorized study binders and document folios.
    -   *Silhouette cue:* Stacked books and reference bookmark icon.

### 4.5 Spatial separation from HTML productivity UI

-   **Phaser Scene Scope:** Avatar movement, camera lerping, environment rendering, collision detection, and proximity triggers.
-   **React HTML Scope:** Application shell, navigation header, all productivity panels, forms, task boards, resource lists, modal dialogs, and error notifications.
-   **Boundary Rule:** Phaser never draws productivity UI, forms, or text editors onto the game canvas.

---

## 5. Design References & Asset Management

### 5.1 Gather Town UI & environmental references

The project's `assets/` directory includes curated reference screenshots from Gather Town and Gather Town 2.0 (`1.png` through `7.png`). These serve as foundational design references:

-   **Spatial Navigation & Map Composition (`assets/1.png`, `assets/3.png`):** Demonstrates top-down 2D camera framing, room clustering, clear passageways, and how spatial scale facilitates casual movement and gathering.
-   **Room Layouts & Furniture Placement (`assets/2.jpg`):** Models effective pixel-art interior layouts—arranging study tables, presentation boards, rugs, and seating into intuitive academic clusters.
-   **Gather Town 2.0 Desktop Shell (`assets/4.png` – `assets/7.png`):**
    -   *Compact Left Sidebar:* Shows clean, icon-driven space navigation without encroaching on spatial viewing area.
    -   *Expansive Viewport:* Keeps the 2D environment spacious and uncluttered.
    -   *Proximity UI & Meeting Integration:* Illustrates discreet video/participant placement along viewport edges.
    -   *Contextual Panels:* Highlights how tool panels (chat, participants, document sidebars) slide out over the environment rather than navigating away from the space.
    -   *Object Interaction Prompts:* Demonstrates the clarity of floating key prompts (`[E] to interact`) when near interactive objects.

> **Design Reference Rule:** These screenshots are references for interaction patterns, room layouts, and spatial-to-panel relationships. They are **not** production game assets and must not be copied or repurposed as game sprites.

### 5.2 Production asset selection & licensing guidelines

When selecting and implementing 2D pixel-art assets for LearnNexus:

1.  **Cohesive Art Style:** Use consistent pixel density and proportions across all tiles and characters. Standardize on `16x16` or `32x32` grid tilesets.
2.  **Harmonious Color Palette:** Assets must align with the Cozy Digital Campus warm pastel palette (`#F7F4EC` warm cream, soft sage, muted wood, natural stone). Avoid harsh black outlines or hyper-saturated neon sprites.
3.  **Strict License Compliance:**
    -   The free assets included in `assets/Characters_free` and `assets/Interiors_free` are governed by `assets/LICENSE.txt`.
    -   *Permitted:* Non-commercial projects, educational use, sprite editing for non-commercial prototypes.
    -   *Prohibited:* Commercial exploitation, resale of raw sprites.
    -   Always verify licenses before adding external tilesets. Do not assume assets found online are free for competition or academic use.
4.  **Attribution & Documentation:** Maintain a clear record of asset sources, authors, and license terms.
5.  **Identified Placeholders:** Any temporary geometric shapes or procedural mockups must be clearly identified in code and documentation as placeholders.

---

## 6. Screen Inventory & Specifications

| Screen ID | Screen Name | Purpose | Entry Point | Primary Action | Status |
|---|---|---|---|---|---|
| **UI-01** | Entry Gateway | Establish student session / demo entry | App launch | Sign In / Continue as Demo | Planned |
| **UI-02** | Academic Spaces Directory | Display student's assigned classes | Successful entry | Select Academic Space | Planned |
| **UI-03** | Campus / Classroom Space | Navigable 2D academic environment | Space selection | Move to Team Workspace | Planned |
| **UI-04** | Team Workspace Studio | Collaborative team studio with workstations | Navigate into studio | Interact with Workstation (`E`) | Planned |
| **UI-05** | Project Overview Panel | View project vision, objectives & status | Overview Workstation | Read / Review Project Info | Planned |
| **UI-06** | Tasks Sprint Board Panel | View & update team tasks and sprints | Tasks Workstation | View / Update Task Status | Planned |
| **UI-07** | Resource Library Panel | Access reference links and project assets | Resources Workstation | Open Verified Resource Link | Planned |
| **UI-08** | Lecturer Management | Organize classes, teams, and materials | Lecturer entry | Manage Academic Spaces | Future / P1 |
| **UI-09** | Deliverables & Review | Project submission and feedback | Deliverables Station | Submit Deliverable | Future / P2 |
| **UI-10** | Campus Main Hall | Campus entry, information board, auditorium | Campus entry | View Announcements / Auditorium | Future / P1 |
| **UI-11** | Campus Library | Learning materials archive & study carrels | Library wing | Research Course Materials | Future / P1 |
| **UI-12** | Student Commons | Informal peer interaction & courtyard | Central quad | Informal Collaboration | Future / P1 |

---

### UI-01 — Entry Gateway

-   **Purpose:** Welcoming, calm entrance into LearnNexus with transparent demo profile options.
-   **Layout / Regions:**
    -   *Header:* LearnNexus wordmark with friendly leaf/cap icon and cozy tagline.
    -   *Central Card:* Clean white card (`#FFFFFF`) on warm parchment background (`#F7F4EC`).
    -   *Profile Selector:* Clear student profile switcher for demo review (e.g. Team SibukTA members).
    -   *Credentials Form:* Standard email and password fields with clear labels and show/hide toggle.
    -   *Action Section:* Primary "Enter Campus" button in sage green.
-   **States:**
    -   *Initial:* Profile selected, form populated with demo credentials.
    -   *Loading:* Submit button shows subtle spinner; inputs disabled.
    -   *Error:* Calm terracotta alert banner (`#FAECEB`) with clear corrective guidance.
-   **Accessibility:** Semantic inputs with visible `<label>`, visible focus ring, keyboard Enter key submit.

---

### UI-02 — Academic Spaces Directory

-   **Purpose:** Display the academic courses and spaces the student is currently enrolled in.
-   **Layout / Regions:**
    -   *Header:* "Academic Spaces", student profile pill, and sign-out action.
    -   *Space Grid:* Responsive grid (1–3 columns) of cozy class cards.
    -   *Class Card:* Course code badge (e.g. `IF-4031`), course title, semester, team assignment badge (`Team SibukTA`), and "Enter Studio" action.
    -   *Empty State:* Illustrated empty classroom card: "No academic spaces assigned yet. Contact your course supervisor."
-   **States:**
    -   *Initial:* Displays enrolled class cards.
    -   *Loading:* Warm pulsing card skeletons (`#EEF1E8`).
    -   *Empty:* Friendly empty state message with retry button.
    -   *Error:* Banner explaining network/authorization error with retry action.

---

### UI-03 & UI-04 — Campus Environment & Team Workspace Studio

-   **Purpose:** Provide spatial orientation, navigation, and physical presence within the campus and team workspace.
-   **Layout / Regions:**
    -   *Top Chrome:* Context bar showing current course, team pod name, leave button, and interaction hint: `Use WASD or Arrows to walk. Press E near a workstation.`
    -   *Canvas Area:* 2D pixel-art top-down campus studio with wooden desks, bookshelves, notice boards, and greenery.
    -   *Workstations:*
        -   `Project Overview Desk` (Left area).
        -   `Tasks Sprint Board` (Center area).
        -   `Resource Library` (Right area).
-   **Interactions:**
    -   *Walk:* Arrow keys or `W`, `A`, `S`, `D`.
    -   *Proximity:* Ambient highlight and floating pill `[E] Open...` appear within 48px.
    -   *Interact:* Pressing `E` or clicking the station opens the corresponding drawer.
-   **States:**
    -   *Loading:* Scene asset preload bar on warm background.
    -   *Active:* Avatar navigates smoothly; 60 FPS target.
    -   *Panel Open:* Canvas movement is paused; spatial scene remains visible behind panel.

---

### UI-05 — Project Overview Panel

-   **Purpose:** Present team objectives, project description, and milestone status in a clean reading drawer.
-   **Layout / Regions:**
    -   *Panel Header:* Title "Project Overview", team badge, and keyboard-operable close button (`✕` or `Esc`).
    -   *Project Identity:* Project title (`LearnNexus Semifinal Demonstrator`), academic case badge (`Case 1: Smarter Campus`).
    -   *Description Block:* Structured summary of goals and problem statement.
    -   *Objectives List:* Checked list of core project milestones.
    -   *Team Roster:* Horizontal avatar pill list showing team members.
-   **Visual Styling:** Clean white background (`#FFFFFF`), charcoal text (`#343B36`), subtle dividers (`#E3E5DC`), soft pastel highlight badges.

---

### UI-06 — Tasks Sprint Board Panel

-   **Purpose:** Provide an organized, clear view of project work items and allow updating task statuses.
-   **Layout / Regions:**
    -   *Header:* "Sprint Tasks", task counter, filter tabs (`All`, `To Do`, `In Progress`, `Done`).
    -   *Task Cards / List:*
        -   Task title in semibold charcoal (`#343B36`).
        -   Description / acceptance criteria snippet.
        -   Assignee pill with student initials.
        -   Status Selector: Accessible dropdown or segmented toggle (`To Do`, `In Progress`, `Done`).
    -   *Footer / Feedback:* Save status indicator (`Saving...` / `✓ All changes saved`).
-   **States:**
    -   *Loading:* Skeleton task rows in `#EEF1E8`.
    -   *Empty:* "No tasks in this sprint. Create one to get started."
    -   *Updating:* Instant optimistic status update with background Supabase write.
    -   *Save Error:* Reverts state and shows retry notification banner.

---

### UI-07 — Resource Library Panel

-   **Purpose:** Provide categorized access to shared documentation, reference links, and project assets.
-   **Layout / Regions:**
    -   *Header:* "Resource Library", category tabs (`All`, `Docs`, `Design`, `Tools`).
    -   *Resource Items:*
        -   Resource icon (book, palette, code link).
        -   Resource title and short description.
        -   URL domain pill (e.g., `github.com`, `figma.com`).
        -   "Open Link" external link button with safe `rel="noopener noreferrer"`.
-   **States:**
    -   *Loading:* Skeleton rows.
    -   *Empty:* "No resources attached to this workspace."
    -   *Invalid URL:* Broken links clearly flagged without opening insecure targets.

---

## 7. Reusable Components & UI Patterns

### 7.1 Button hierarchy

```css
/* Primary Action Button (Strong Sage, WCAG AA 6.03:1 with #FFFFFF) */
.btn-primary {
  background-color: #4A6B46;
  color: #FFFFFF;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  border: 1px solid #4A6B46;
  transition: background-color 0.15s ease;
}
.btn-primary:hover {
  background-color: #3B5638;
  border-color: #3B5638;
}

/* Secondary Action Button (Warm Surface with >= 3:1 control border) */
.btn-secondary {
  background-color: #EEF1E8;
  color: #30343B;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  border: 1px solid #757E74;
}
.btn-secondary:hover {
  background-color: #E5E9DE;
}

/* Subtle / Ghost Button */
.btn-ghost {
  background-color: transparent;
  color: #5C665C;
  border-radius: 8px;
  padding: 8px 12px;
}
.btn-ghost:hover {
  background-color: #EEF1E8;
  color: #30343B;
}
```

### 7.2 Status badges & pills

-   **To Do:** Background `#FBF4DE`, Text `#785A10`, Border `1px solid #F0DFA7`.
-   **In Progress:** Background `#F7ECE4`, Text `#7C4520`, Border `1px solid #F1D2BC`.
-   **Done:** Background `#EAF2EB`, Text `#2D5A34`, Border `1px solid #A4B99C`.
-   **General Tag:** Background `#EEF1E8`, Text `#30343B`, Border `1px solid #E3E5DC`.
-   **Lavender Accent Tag:** Background `#DAD2E9`, Text `#30343B`, Border `1px solid #C4BAD6`.

### 7.3 Productivity drawer container

-   **Width:** Fixed `440px` on desktop (viewports ≥ 1024px).
-   **Animation:** Gentle slide-in from right (`transform: translateX(0)`, duration `200ms ease-out`).
-   **Backdrop:** Transparent or subtle warm scrim (`rgba(48, 52, 59, 0.15)`) allowing the 2D environment to remain visible.
-   **Accessibility:** Focus is trapped inside the drawer; pressing `Escape` closes the drawer and restores canvas focus.

---

## 8. Interaction Patterns & Keyboard Navigation

### 8.1 Spatial controls

| Action | Primary Input | Secondary Input | Visual Cue |
|---|---|---|---|
| Move Avatar | Arrow Keys (`↑ ↓ ← →`) | `W`, `A`, `S`, `D` | 4-direction walk animation |
| Interact with Workstation | `E` Key | Left Click / Tap | Floating prompt `[E] Open...` |
| Close Active Panel | `Escape` Key | Close Button (`✕`) | Panel slides closed |
| Leave to Campus Directory | Click "Leave Studio" | Keyboard navigation | Return to Space Directory (`UI-02`) |

### 8.2 Accessibility & focus management

-   When a workstation panel opens, focus moves automatically to the panel's first interactive element or close button.
-   Keyboard `Tab` navigation is trapped within the active drawer while open.
-   When the drawer closes, focus returns to the canvas container so avatar navigation resumes immediately.

---

## 9. Responsive Behavior

| Viewport Width | Experience Mode | Panel Behavior | Canvas Viewport |
|---|---|---|---|
| **≥ 1280px (Desktop)** | Standard Full Experience | 440px right-hand slide drawer; canvas fully visible | Fixed / responsive 16:9 canvas |
| **1024px – 1279px (Laptop)** | Standard Experience | 400px right-hand slide drawer | Canvas scales to fit remaining area |
| **768px – 1023px (Tablet)** | Compact View | 380px drawer with dim backdrop overlay | Canvas paused while panel open |
| **< 768px (Mobile)** | Read-Only Fallback | Full-screen sheet modal; notice advising desktop browser | Canvas disabled or hidden |

---

## 10. Empty, Loading, and Error States

### 10.1 Honest state design rules

1.  **No Fabricated Success:** An action is never displayed as saved until confirmed by the persistence layer.
2.  **Calm Empty States:** Empty lists (e.g. no tasks, no resources) explain why data is missing and provide a helpful next step.
3.  **Visible Error Guidance:** Network or server errors display a calm alert banner in `#FAECEB` with explicit retry buttons.
4.  **Skeleton Loaders:** Content loading uses soft `#EEF1E8` pulsing rectangles rather than jarring spinners.

---

## 11. Prototype Record

| Prototype Increment | Scope Tested | Visual Style | Persistence | Status |
|---|---|---|---|---|
| **M1 Foundation** | App shell, Phaser single mount, sharp pixel-art config, event bridge | Cozy Digital Campus | None | Planned |
| **M2 Core Workflow** | Student entry, academic spaces, 2D studio scene, workstation panels | Cozy Digital Campus | Seeded / Supabase | Planned |
| **M2.5 Design Alignment** | Cozy Digital Campus: pastel tokens, pixel-art specs, HTML panels | Cozy Digital Campus approved | Supabase PostgreSQL | Planned |
| **M3 Persistence** | Real PostgreSQL reads/writes, task status mutation, refresh test | Cozy Digital Campus | Supabase PostgreSQL | Planned |

---

## 12. Approved Design Decisions

| ID | Decision | Status | Rationale |
|---|---|---|---|
| **DD-001** | The product uses a navigable 2D virtual campus as its primary spatial experience | Approved | Core spatial differentiation for project-based learning. |
| **DD-002** | Academic spaces contain dedicated team workspaces | Approved | Solves fragmentation by giving groups a shared home. |
| **DD-003** | Workstations open contextual productivity panels | Approved | Connects physical presence to practical academic tools. |
| **DD-004** | Productivity panels provide practical project tools in clean HTML | Approved | Complex productivity tasks require accessible HTML, not game canvas rendering. |
| **DD-005** | The user returns to the same spatial context after closing a panel | Approved | Maintains spatial presence and avoids unnecessary scene reloads. |
| **DD-006** | Desktop browser is the priority for the semifinal demonstrator | Approved | Focuses engineering resources on a reliable vertical slice. |
| **DD-007** | Adopt Cozy Digital Campus visual system (warm pastel palette, friendly sans-serif, pixel-art campus) | Approved | Replaces rejected dark/futuristic/cyberpunk theme with a welcoming academic atmosphere. |
| **DD-008** | Strict separation: Phaser for spatial canvas; React for productivity UI | Approved | Keeps rendering architecture clean, modular, and maintainable. |
| **DD-009** | Light visual foundation as primary direction; dark mode deferred | Approved | Warm cream (`#F7F4EC`) and soft pastels create a calm, legible academic ambiance without eye strain. |
| **DD-010** | Target Information Architecture: Virtual Campus (Main Hall, Auditorium, Classrooms, Library, Commons), Academic Spaces, Team Workspaces | Approved | Clarifies comprehensive spatial hierarchy while bounding semifinal demonstrator to the core team studio journey. |
| **DD-011** | Gather Town screenshots in `assets/` serve as interaction & spatial layout references, not production assets | Approved | Provides design patterns for room layout, furniture clusters, and drawer relationships without copying branding or assets. |
| **DD-012** | Sharp canvas rendering contract: pixelArt true, roundPixels true, nearest-neighbor filtering, integer zoom | Approved | Fixes soft/blurry canvas rendering by removing unwanted bilinear smoothing on pixel-art tiles. |

---

## 13. Design-to-PRD Mapping

| Design Screen | Related PRD Features | Implementation Status |
|---|---|---|
| **UI-01 Entry Gateway** | `F-001` (Student Entry and Session) | Planned |
| **UI-02 Academic Spaces** | `F-002` (Assigned Space Selection) | Planned |
| **UI-03 Class Environment** | `F-003` (2D Spatial Navigation), `F-004` | Planned |
| **UI-04 Team Workspace Studio** | `F-003`, `F-004`, `F-005` | Planned |
| **UI-05 Project Overview Panel** | `F-005`, `F-006`, `F-009` | Planned |
| **UI-06 Tasks Sprint Board** | `F-005`, `F-007`, `F-009` | Planned |
| **UI-07 Resource Library Panel** | `F-005`, `F-008`, `F-009` | Planned |
| **UI-08 Lecturer Management** | `F-010` (Lecturer Setup) | Future / P1 |
| **UI-09 Deliverables** | `F-012` (Submissions) | Future / P2 |
| **UI-10 Campus Main Hall** | `F-003`, `F-004` (Campus Gateway) | Future / P1 |
| **UI-11 Campus Library** | `F-008` (Course Resource Hub) | Future / P1 |
| **UI-12 Student Commons** | `F-003`, `F-011` (Informal Peer Area) | Future / P1 |

------------------------------------------------------------------------

## 14. Design Review Checklist

-   [x] Visual direction reset confirmed: Cozy Digital Campus approved.
-   [x] Color tokens defined and verified against WCAG AA contrast standards.
-   [x] Typography hierarchy, weights, and sizing documented.
-   [x] Top-down 2D pixel-art art direction established for spatial environment.
-   [x] Clean HTML productivity drawer layout specified for workstations.
-   [x] Rejected directions (sci-fi, dark, cyberpunk, military terms) explicitly banned.
-   [x] All screen specifications (UI-01 through UI-12) aligned with pastel productivity direction.
-   [x] Gather Town design references and asset licensing requirements documented.
-   [x] Canvas rendering sharpness rules documented.
-   [x] Approved design decisions recorded in Decision Log.
