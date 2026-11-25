# LearnNexus — Environment & Character Prototype Spike

> **Status:** Completed & Verified (M0 Experimental Spike)  
> **Location:** [`prototype/environment-spike/`](../prototype/environment-spike/)  
> **Map Data:** [`prototype/environment-spike/src/maps/campusStudioMap.json`](../prototype/environment-spike/src/maps/campusStudioMap.json)

## 1. Zone Layout (24 × 16 Grid)

The spike models one indoor collaborative campus studio divided into four connected zones with >= 2-tile walkways:

1. **Entrance Hallway (`cols 1..6, rows 10..14`):** Stone/concrete floor (`199`/`216`), terracotta threshold mat (`114`), Studio Entrance Door (`0019`), potted plant (`0143`), desk globe (`0114`), and wall bulletin board (`0135`).
2. **Workstation Pod (`cols 1..6, rows 3..7`):** Project Overview Workstation (`0125`), secondary study desk (`0116`) + chair (`0117`), and double wooden window (`0069`).
3. **Collaborative Workspace (`cols 7..22, rows 3..8`):** Cream tile floor (`131`/`148`), sage rug (`0136`), 4-tile Collaborative Meeting Table (`0113`) with 4 chairs (`0117`, `0119`), Resource Library Bookcase (`0051`), cabinet (`0151`), green study desk (`0124`), desktop monitor (`0018`), wide glass window (`0081`), and sprint chalkboard (`0134`).
4. **Cozy Lounge Area (`cols 15..22, rows 9..14`):** Herringbone wood floor (`233`/`250`), warm tan rug (`0137`), cushioned daybed (`0050`), lounge table + chairs set (`0058`), brown bench (`0036`), potted palm (`0139`), leafy tree (`0141`), and string lights (`0149`).

## 2. Architecture & Data Separation

- **Map data (`campusStudioMap.json`):** Stores `floor`, `walls`, `borders`, and `collision` as 2D tile index arrays plus `objects[]` with tile coordinates, collider footprints, and `interaction` metadata.
- **Scene (`PrototypeScene.ts`):** Loads the JSON map dynamically via Phaser's `make.tilemap({ data })`, builds Arcade Physics static colliders, and Y-sorts player/furniture depths (`10 + y`).
- **Bridge (`spikeBridge.ts`):** Emits typed `proximity:change`, `object:interact`, `panel:closed`, `metrics:update`, and `debug:changed` events to the HTML shell without rendering productivity UI on the Phaser canvas.

## 3. Character, Movement, Collision & Interaction Verification

Verified via headless Chrome + Playwright (`npm run capture`, `0` console errors, `0` page errors):

- **4-Direction Movement & Animations:** `ArrowDown` (`adam_run_down`), `ArrowRight` (`adam_run_right`), `ArrowUp` (`adam_run_up`), and `ArrowLeft` (`adam_run_left`) all transition cleanly back to `adam_idle_anim_<dir>` on key release.
- **Collision:** Walking left into the west wall (`x=1`) stops `Adam` cleanly at `tileX = 1.31` without clipping through walls or furniture.
- **Interactable Objects (4 verified):**
  1. `workstation-overview` (Project Overview Workstation) — proximity prompt + `[E]` opens placeholder drawer and pauses movement (`workstationPanelOpened: true`).
  2. `meeting-table` (Collaborative Meeting Table) — proximity prompt verified (`meetingTableNearby: "meeting-table"`).
  3. `entrance-door` (Studio Entrance Door) — proximity prompt verified (`entranceDoorNearby: "entrance-door"`).
  4. `resource-shelf` (Resource Library Bookcase) — configured in map data with `2.0`-tile radius.

## 4. Running & Inspecting the Prototype

```bash
cd prototype/environment-spike
npm install
npm run dev
# Open http://127.0.0.1:4173/
```

Captured review screenshots in `prototype/environment-spike/screenshots/`:
- `01-full-environment-config-a-16px.png` / `02-full-environment-config-b-48px.png`
- `03-character-comparison-config-a-16px.png` / `04-character-comparison-config-b-48px.png`
- `05a-move-down.png` .. `05d-move-left.png`
- `06-interaction-workstation-panel.png` / `07-interaction-meeting-table-prompt.png`
- `08-collision-debug-overlay.png`
