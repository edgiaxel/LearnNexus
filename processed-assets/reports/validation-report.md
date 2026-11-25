# LearnNexus — Asset Pipeline Validation Report

> Machine-readable source: `processed-assets/reports/validation-report.json`  
> Pilot validation gate: `processed-assets/pilot-validation/pilot-validation-report.json`

## 1. Overall Status

- **Pilot Gate (5 mandatory files):** PASSED
- **Full Pipeline Validation:** PASSED (`all_checks_passed: true`)
- **Source Asset Immutability (`assets/`):** PASSED (72/72 SHA-256 hashes identical before and after run)
- **Exclusion Enforcement:** PASSED (Gather screenshots `1.png`–`7.png` / `2.jpg` and `free_overview.png` completely absent from extracted sprites, atlases, tilesets, and production catalog)

## 2. Phase 7 Pilot Target Verification

| Target | Role | Check | Result | Key Metrics |
|---|---|---|---|---|
| `assets/free_overview.png` | Reference only | Excluded from sprite extraction | PASS | Kept reference-only; 0 extracted frames |
| `assets/Interiors_free/48x48/Interiors_free_48x48.png` | Sprite segmentation | Transparency, tight bbox, pixel equality, 0 clipping | PASS | 269 components (225 clean, 44 ambiguous); 0 pixel reconstruction diff; 0 bbox/transparency failures |
| `assets/Interiors_free/48x48/Room_Builder_free_48x48.png` | Regular tileset | Grid bounds, occupancy, annotation exclusion | PASS | 17×23 grid (391 cells); 243 occupied = 227 usable game tiles + 16 excluded annotation tiles (`room border / ceiling ->`); 0 errors |
| `assets/Characters_free/Adam_16x16.png` | Composite character sheet | Row-to-strip visible pixel equivalence & layout | PASS | 7/7 rows match individual strips with 0 visible pixel diff; 0 empty active frames |
| `assets/Characters_free/Adam_run_16x16.png` | Animation strip | Direction sequence order & frame boundaries | PASS | 24 frames (`16x32`), exact `right/up/left/down` × 6 sequence; `sit`/`sit2` verified `32x32` with 0 horizontal clipping |

## 3. Full Pipeline Verification Summary

- **Segmentation & Phaser Atlases:**
  - `Interiors_free_48x48.png`: 269 extracted PNGs + `interiors_48x48.png` (`2036x1063`) / `.json` — 0 pixel mismatches vs source or atlas.
  - `Interiors_free_16x16.png`: 269 extracted PNGs + `interiors_16x16.png` (`2044x170`) / `.json` — 0 pixel mismatches vs source or atlas.
  - Semi-transparent component `int48_obj_0100` / `int16_obj_0100` preserves partial alpha values (`161, 220, 242`) verbatim.
- **Tilesets (19 sheets validated across 16x16, 32x32, 48x48):**
  - `Room_Builder_free` (16/32/48): 227 usable tiles + 16 excluded annotation tiles per scale; 0 coordinate or occupancy errors.
  - `Interiors_free_32x32.png` (grid reference): 1,117 occupied tiles of 1,424; 0 errors.
  - `Old/Tileset_*_{1,2,3,9,16}` (15 sheets across 16/32/48): 458 usable tiles per scale (1,374 across 3 scales); 0 errors.
- **Characters:**
  - 4 primary characters (`Adam`, `Alex`, `Amelia`, `Bob`): 76 primary sequences across 28 strips + 16 RPG Maker MV walk sequences (`Characters_MV.png`) = 92 Phaser animation definitions; 0 empty frames, 0 sequence order errors, 0 `sit`/`sit2` clipping errors.
  - Legacy Character 2 (`Old/`): 12 base 16x16 sequences cataloged (`idle`, `run`, `mv_walk`), totaling 104 cataloged character sequences.
- **Contact Sheets:** 21 PNG contact sheets validated (readable RGBA PNGs, checkerboard transparency, preserved aspect ratio, clean ASCII typography, 1x native display for clean 48x48 items up to 196px).

## 4. Remaining Limitations & Human Review Queue

1. **Ambiguous segmented components (44 per scale in `Interiors_free`):** Flagged in `processed-assets/catalog/ambiguous-review-queue.json` and `processed-assets/contact-sheets/interiors_48x48_ambiguous_p01.png` / `p02.png` (touching furniture clusters, tiny decorative specks, overlapping bounding boxes, close same-tile parts). Require human split/merge approval before semantic naming.
2. **Provisional prop naming:** All 269 `Interiors_free` objects use provisional IDs (`int48_obj_0001`..`0269`, `int16_obj_0001`..`0269`) until human visual review assigns final semantic names and workstation slots in `processed-assets/phaser/objects/interactive-objects.json`.
3. **Canonical scale choice (16x16 vs 48x48):** `Characters_free` 7-action strips exist only at 16x16 native scale (`16x32`/`32x32`), while `Interiors_free` and `Room_Builder_free` are pixel-exact 1x/2x/3x variants. Choose canonical tile scale before M2 map assembly.
4. **License constraints:** `assets/LICENSE.txt` restricts usage to **non-commercial** projects only and omits an explicit author/attribution string; Gather screenshots (`1.png`–`7.png`) remain unlicensed third-party UI references.
