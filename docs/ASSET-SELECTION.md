# LearnNexus — Prototype Asset Selection

> **Scope:** M0 Environment & Character Prototype Spike  
> **Manifest:** [`prototype/environment-spike/src/manifest/prototypeAssets.json`](../prototype/environment-spike/src/manifest/prototypeAssets.json)  
> **Rule:** Original `assets/` and `processed-assets/` were not modified, renamed, or regenerated.

## 1. Tileset Selection (`Room_Builder_free`)

Both `16x16` and `48x48` variants of `Room_Builder_free` (`17x23` grid) are used for Config A vs Config B evaluation. The 16 annotation tiles (`room border / ceiling ->`, indices `0..4`, `17..21`, `34..38`, `51..55`) are excluded.

| Category | Region Name | Tile Indices (0-based) | Source File (16px / 48px) | Intended Usage |
|---|---|---|---|---|
| Room Borders | `room_borders_and_ceiling` | `12` | `Room_Builder_free_{16x16,48x48}.png` | Outer room boundary cap |
| Walls | `walls_mint_cream` | `154`, `171` | `Room_Builder_free_{16x16,48x48}.png` | Entrance hallway & workstation pod walls |
| Walls | `walls_warm_wood_light` | `188`, `205` | `Room_Builder_free_{16x16,48x48}.png` | Collaborative workspace north wall |
| Walls | `walls_warm_beige` | `324`, `341` | `Room_Builder_free_{16x16,48x48}.png` | Resource & lounge north wall |
| Floors | `floors_stone_concrete` | `199`, `216` | `Room_Builder_free_{16x16,48x48}.png` | Entrance hallway floor |
| Floors | `floors_terracotta_tile` | `114` | `Room_Builder_free_{16x16,48x48}.png` | Entrance door mat accent |
| Floors | `floors_cream_tile` | `131`, `148` | `Room_Builder_free_{16x16,48x48}.png` | Collaborative workspace & pod floor |
| Floors | `floors_herringbone_wood` | `233`, `250` | `Room_Builder_free_{16x16,48x48}.png` | Cozy lounge floor |

## 2. Extracted Object Sprites (`Interiors_free`)

All 29 selected object sprites are verified `isAmbiguous: false` from `processed-assets/phaser/atlases/interiors_{16x16,48x48}.json`.

| Sprite Num | 16px Dims | 48px Dims | Category | Intended Usage |
|---|---|---|---|---|
| `0018` | `16x22` | `48x66` | electronics | Desktop monitor on desk stand |
| `0019` | `14x21` | `42x63` | doors | Interactive Studio Entrance Door |
| `0036` | `38x21` | `114x63` | sofas | Warm brown lounge bench |
| `0044` | `60x40` | `180x120` | decorations | Red/gold accent rug |
| `0050` | `48x26` | `144x78` | sofas | Cushioned lounge daybed |
| `0051` | `64x32` | `192x96` | shelves | Interactive Resource Library Bookcase |
| `0058` | `48x26` | `144x78` | furniture | Lounge chairs + coffee table set |
| `0069` | `25x20` | `75x60` | windows | Double wooden window |
| `0081` | `64x25` | `192x75` | windows | Wide modern glass window |
| `0113` | `64x23` | `192x69` | desks | Interactive Collaborative Meeting Table |
| `0114` | `13x21` | `39x63` | decorations | Academic desk globe |
| `0116` | `28x25` | `84x75` | desks | Study desk with open book |
| `0117` / `0119` | `13x22` | `39x66` | chairs | Desk chairs facing up / down |
| `0124` | `28x22` | `84x66` | desks | Green study desk with open book |
| `0125` | `47x54` | `141x162` | desks | Interactive Project Overview Workstation |
| `0134` | `28x23` | `84x69` | decorations | Wall chalkboard / sprint display |
| `0135` | `26x13` | `78x39` | decorations | Wall bulletin board |
| `0136` / `0137` | `43x28` / `48x28` | `129x84` / `144x84` | decorations | Sage-green & warm tan zone rugs |
| `0139` / `0141` / `0143` | `23x31` / `18x31` / `14x23` | `69x93` / `54x93` / `42x69` | plants | Potted palm, leafy tree, small plant |
| `0149` | `27x10` | `81x30` | decorations | Cozy wall string lights |
| `0151` | `27x32` | `81x96` | cabinets | Wooden storage cabinet |

## 3. Character Selection (`Characters_free`)

- **Selected character:** `Adam` (`processed-assets/phaser/characters/Adam_idle_16x16.png`, `Adam_idle_anim_16x16.png`, `Adam_run_16x16.png`)
- **Native frame size:** `16x32` pixels (`6` frames per direction)
- **Direction order:** `right` (`0..5`), `up` (`6..11`), `left` (`12..17`), `down` (`18..23`)

## 4. Unreviewed Ambiguous Assets Left Untouched

- `int48_obj_0237` / `int16_obj_0237` (touching modular sofa + bookcase cluster, `15x5` tiles) — excluded; not renamed or manually split.
- `int48_obj_0230` / `int16_obj_0230` (touching 3-section bookcase cluster, `6x3` tiles) — excluded; left for post-M0 review.
