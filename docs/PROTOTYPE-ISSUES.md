# LearnNexus — Prototype Issues & Open Questions

> **Scope:** Findings observed while building and visually inspecting `prototype/environment-spike/`.

## 1. Visual & Asset Issues Observed

1. **Non-grid-aligned sprite dimensions in `Interiors_free`:**
   - Several clean sprites have pixel dimensions that are not exact multiples of `16px` (e.g., `0019` door is `14x21`, `0125` workstation is `47x54`, `0136` rug is `43x28`, `0139` palm is `23x31`).
   - **Impact:** Minor fractional tile offsets (`tileX: 1.3`) are needed to visually center doors/desks against `16px` wall tiles.
2. **Touching multi-object clusters left unreviewed (`Interiors_free`):**
   - `int*_obj_0237` (modular sofa + bookcase, `15x5` tiles) and `int*_obj_0230` (triple bookcase, `6x3` tiles) are merged in the source sheet. Excluded from the spike; require manual split decisions before M2 if those specific sofa/bookcase variants are needed.
3. **Embedded annotation text in `Room_Builder_free`:**
   - Top-left tiles `0..4`, `17..21`, `34..38`, `51..55` contain literal `"room border / ceiling ->"` text. Excluded via manifest/map rules, but any future Tiled editor import must mask those indices.
4. **Initial sprite overlap caught during visual review (Fixed in spike):**
   - `workstation_overview` (`0125`, `47x54` at `16px` scale) initially overlapped the bottom edge of `win_pod` (`0069`) when placed at `tileY: 2.4`; adjusted to `tileY: 2.9` to clear the window.
5. **Wall corner caps & outer border polish:**
   - The interior divider wall (`rows 8..9, cols 1..4`) uses open wall segments without dedicated end-cap trim tiles (`22`–`27` in `Room_Builder_free`). Acceptable for the M0 spike, but M2 production maps should use full wall-cap autotiling.

## 2. Technical & Input Observations

1. **Phaser `JustDown(KeyE)` timing with synthetic fast key presses:**
   - A `0ms` synthetic `keyboard.press('KeyE')` can occur between `requestAnimationFrame` ticks and be missed by `Phaser.Input.Keyboard.JustDown`. Real user key presses (held `>= 1` frame) work normally, and clicking the interactive object also triggers interaction.
2. **Vite child process cleanup in `capture-screenshots.mjs`:**
   - `npx vite` spawns a child process that may hold stdout open briefly after `SIGTERM` in scripted runs; M1 Playwright config should use `webServer` in `playwright.config.ts` for clean lifecycle teardown.

## 3. Unresolved Questions for M1/M2

- **Q-01 (Interactive sit animations):** `Adam_sit` and `Adam_sit2` use `32x32` frames (`Adam_sit3` uses `16x32`). Decide in M2 whether workstations support sitting on nearby chairs or remain standing proximity interactions.
- **Q-02 (License attribution):** `assets/LICENSE.txt` permits non-commercial use/editing without an author string; confirm attribution text for the M5 demo/about screen.
