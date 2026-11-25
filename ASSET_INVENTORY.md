# LearnNexus — Asset Inventory & License Audit

> Generated from `assets/` without modifying or deleting any source files.

## 1. Executive Summary

- **Total files inspected:** 72 (71 images, 1 license text file)
- **Production-eligible pixel-art files:** 63 (39 primary + 24 legacy `Old/`)
- **Reference-only files (excluded from game extraction):** 8 (7 Gather UI screenshots + 1 `free_overview.png` showcase)
- **Exact byte-for-byte duplicates:** 0
- **Verified pixel-exact resolution-variant groups (16x16 / 32x32 / 48x48):** 10 (all 10 groups have 0 visible pixel differences when upscaling 16x16 by 2x or 3x via nearest-neighbor)
- **Verified character composite-vs-strip matches:** 4/4 (`Adam`, `Alex`, `Amelia`, `Bob` composite sheets match all 7 individual animation strips with 0 visible pixel differences)

### Category Breakdown

| Category | Count | Role |
|---|---:|---|
| `asset_overview_reference` | 1 | `reference_only` |
| `characters_animation_strip` | 28 | `production_asset` |
| `characters_composite_sheet` | 4 | `production_asset` |
| `characters_rpgmaker_mv` | 1 | `production_asset` |
| `legacy_character_sheet` | 9 | `legacy_archive` |
| `legacy_tileset` | 15 | `legacy_archive` |
| `license_document` | 1 | `documentation` |
| `sprite_sheet_interiors` | 3 | `production_asset` |
| `tileset_room_builder` | 3 | `production_asset` |
| `ui_design_reference` | 7 | `reference_only` |

## 2. License & Attribution Audit

Source license file inspected: [`assets/LICENSE.txt`](assets/LICENSE.txt)

### Permitted (`CAN`)
- YOU CAN USE THE ASSET IN NON COMMERCIAL PROJECTS
- YOU CAN EDIT THE SPRITES AND USE THEM IN NON COMMERCIAL PROJECTS

### Prohibited (`CAN'T`)
- YOU CAN'T USE THE ASSET IN COMMERCIAL PROJECTS
- YOU CAN'T EDIT THE SPRITES AND USE THEM IN COMMERCIAL PROJECTS
- YOU CAN'T EDIT AND RESELL THE SPRITES

### Scope & Risk Findings
- Permits non-commercial use and editing for non-commercial projects (fits STACK 2026 academic/student prototype).
- Strictly prohibits commercial use, commercial derivative edits, and reselling.
- Does not specify an author name or attribution format; verify original pack page (appears to be LimeZu Modern Interiors Free) before public release.
- Does NOT cover Gather Town reference screenshots (1.png through 7.png), which are third-party product screenshots.

| Asset Group | License Ref | Production Use Allowed (Non-Commercial Prototype) | Commercial Use Allowed | Notes |
|---|---|---|---|---|
| `Interiors_free/` & `Characters_free/` | `free_pack_non_commercial` | Yes (non-commercial STACK 2026 prototype) | No | Covered by `assets/LICENSE.txt`; attribution wording absent from file |
| `free_overview.png` | `free_pack_non_commercial` | Reference only | No | Composite preview sheet; do not extract sprites from this image |
| `1.png`–`7.png` (`2.jpg`) | `third_party_ui_reference_unlicensed` | **No — excluded** | **No** | Gather Town UI reference screenshots; third-party proprietary UI |
| `Old/` | `unverified_legacy_provenance` | Conditional (non-commercial, verify provenance) | No | Legacy tilesets & Character 2; lacks separate folder license |

## 3. Gather UI Reference Screenshots (Separated — Not Processed)

| File | Format | Mode | Dimensions | Transparency | Notes |
|---|---|---|---|---|---|
| `1.png` | PNG | RGBA | 1024x576 | No (opaque) | gather_screenshot |
| `2.jpg` | JPEG | RGB | 662x532 | No (opaque) | gather_screenshot |
| `3.png` | PNG | RGBA | 2048x1180 | No (opaque) | gather_screenshot |
| `4.png` | PNG | RGBA | 1916x1016 | No (opaque) | gather_screenshot |
| `5.png` | PNG | RGBA | 1916x1016 | No (opaque) | gather_screenshot |
| `6.png` | PNG | RGBA | 1916x1016 | No (opaque) | gather_screenshot |
| `7.png` | PNG | RGBA | 1916x1016 | No (opaque) | gather_screenshot |
| `free_overview.png` | PNG | RGBA | 1886x1792 | Yes | composite_showcase |

## 4. Production & Legacy Pixel-Art Asset Inventory

| Path | Format | Mode | Dimensions | Alpha Used (Semi) | Est. Tile / Frame | Category | Content Type | Duplicate / Variant | License Ref |
|---|---|---|---|---|---|---|---|---|---|
| `Characters_free/Adam_16x16.png` | PNG | RGBA | 384x224 | Yes (0 semi) | `16x32 (rows 0-2,5-6) / 32x32 (rows 3-4)` | `characters_composite_sheet` | `multi_animation_sheet` | Composite master (7 rows) | `free_pack_non_commercial` |
| `Characters_free/Adam_idle_16x16.png` | PNG | RGBA | 64x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Adam_idle_anim_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Adam_phone_16x16.png` | PNG | RGBA | 144x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Adam_run_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Adam_sit2_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Adam_sit3_16x16.png` | PNG | RGBA | 192x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Adam_sit_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Adam_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_16x16.png` | PNG | RGBA | 384x224 | Yes (0 semi) | `16x32 (rows 0-2,5-6) / 32x32 (rows 3-4)` | `characters_composite_sheet` | `multi_animation_sheet` | Composite master (7 rows) | `free_pack_non_commercial` |
| `Characters_free/Alex_idle_16x16.png` | PNG | RGBA | 64x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_idle_anim_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_phone_16x16.png` | PNG | RGBA | 144x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_run_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_sit2_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_sit3_16x16.png` | PNG | RGBA | 192x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Alex_sit_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Alex_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_16x16.png` | PNG | RGBA | 384x224 | Yes (0 semi) | `16x32 (rows 0-2,5-6) / 32x32 (rows 3-4)` | `characters_composite_sheet` | `multi_animation_sheet` | Composite master (7 rows) | `free_pack_non_commercial` |
| `Characters_free/Amelia_idle_16x16.png` | PNG | RGBA | 64x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_idle_anim_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_phone_16x16.png` | PNG | RGBA | 144x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_run_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_sit2_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_sit3_16x16.png` | PNG | RGBA | 192x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Amelia_sit_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Amelia_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_16x16.png` | PNG | RGBA | 384x224 | Yes (0 semi) | `16x32 (rows 0-2,5-6) / 32x32 (rows 3-4)` | `characters_composite_sheet` | `multi_animation_sheet` | Composite master (7 rows) | `free_pack_non_commercial` |
| `Characters_free/Bob_idle_16x16.png` | PNG | RGBA | 64x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_idle_anim_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_phone_16x16.png` | PNG | RGBA | 144x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_run_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_sit2_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_sit3_16x16.png` | PNG | RGBA | 192x32 | Yes (0 semi) | `16x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/Bob_sit_16x16.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `32x32` | `characters_animation_strip` | `animation_strip` | Subset of `Bob_16x16.png` | `free_pack_non_commercial` |
| `Characters_free/RPGMAKERMV/Characters_MV.png` | PNG | RGBA | 576x768 | Yes (0 semi) | `48x96` | `characters_rpgmaker_mv` | `character_animation_grid` | Unique | `free_pack_non_commercial` |
| `Interiors_free/16x16/Interiors_free_16x16.png` | PNG | RGBA | 256x1424 | Yes (180 semi) | `16x16` | `sprite_sheet_interiors` | `mixed_tileset_and_objects` | Interiors_free (16x16 base) | `free_pack_non_commercial` |
| `Interiors_free/16x16/Room_Builder_free_16x16.png` | PNG | RGBA | 272x368 | Yes (0 semi) | `16x16` | `tileset_room_builder` | `regular_tileset` | Room_Builder_free (16x16 base) | `free_pack_non_commercial` |
| `Interiors_free/32x32/Interiors_free_32x32.png` | PNG | RGBA | 512x2848 | Yes (720 semi) | `32x32` | `sprite_sheet_interiors` | `mixed_tileset_and_objects` | Interiors_free (32x32 2x/3x scale) | `free_pack_non_commercial` |
| `Interiors_free/32x32/Room_Builder_free_32x32.png` | PNG | RGBA | 544x736 | Yes (0 semi) | `32x32` | `tileset_room_builder` | `regular_tileset` | Room_Builder_free (32x32 2x/3x scale) | `free_pack_non_commercial` |
| `Interiors_free/48x48/Interiors_free_48x48.png` | PNG | RGBA | 768x4272 | Yes (1620 semi) | `48x48` | `sprite_sheet_interiors` | `mixed_tileset_and_objects` | Interiors_free (48x48 2x/3x scale) | `free_pack_non_commercial` |
| `Interiors_free/48x48/Room_Builder_free_48x48.png` | PNG | RGBA | 816x1104 | Yes (0 semi) | `48x48` | `tileset_room_builder` | `regular_tileset` | Room_Builder_free (48x48 2x/3x scale) | `free_pack_non_commercial` |
| `Old/Tileset_16x16_1.png` | PNG | RGBA | 160x160 | Yes (0 semi) | `16x16` | `legacy_tileset` | `regular_tileset` | Old_Tileset_1 (16x16 base) | `unverified_legacy_provenance` |
| `Old/Tileset_16x16_16.png` | PNG | RGBA | 192x224 | Yes (0 semi) | `16x16` | `legacy_tileset` | `regular_tileset` | Old_Tileset_16 (16x16 base) | `unverified_legacy_provenance` |
| `Old/Tileset_16x16_2.png` | PNG | RGBA | 160x160 | Yes (0 semi) | `16x16` | `legacy_tileset` | `regular_tileset` | Old_Tileset_2 (16x16 base) | `unverified_legacy_provenance` |
| `Old/Tileset_16x16_3.png` | PNG | RGBA | 160x160 | Yes (0 semi) | `16x16` | `legacy_tileset` | `regular_tileset` | Old_Tileset_3 (16x16 base) | `unverified_legacy_provenance` |
| `Old/Tileset_16x16_9.png` | PNG | RGBA | 160x160 | Yes (0 semi) | `16x16` | `legacy_tileset` | `regular_tileset` | Old_Tileset_9 (16x16 base) | `unverified_legacy_provenance` |
| `Old/Tileset_32x32_1.png` | PNG | RGBA | 320x320 | Yes (0 semi) | `32x32` | `legacy_tileset` | `regular_tileset` | Old_Tileset_1 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_32x32_16.png` | PNG | RGBA | 384x448 | Yes (0 semi) | `32x32` | `legacy_tileset` | `regular_tileset` | Old_Tileset_16 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_32x32_2.png` | PNG | RGBA | 320x320 | Yes (0 semi) | `32x32` | `legacy_tileset` | `regular_tileset` | Old_Tileset_2 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_32x32_3.png` | PNG | RGBA | 320x320 | Yes (0 semi) | `32x32` | `legacy_tileset` | `regular_tileset` | Old_Tileset_3 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_32x32_9.png` | PNG | RGBA | 320x320 | Yes (0 semi) | `32x32` | `legacy_tileset` | `regular_tileset` | Old_Tileset_9 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_48x48_1.png` | PNG | RGBA | 480x480 | Yes (0 semi) | `48x48` | `legacy_tileset` | `regular_tileset` | Old_Tileset_1 (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_48x48_16.png` | PNG | RGBA | 576x672 | Yes (0 semi) | `48x48` | `legacy_tileset` | `regular_tileset` | Old_Tileset_16 (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_48x48_2.png` | PNG | RGBA | 480x480 | Yes (0 semi) | `48x48` | `legacy_tileset` | `regular_tileset` | Old_Tileset_2 (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_48x48_3.png` | PNG | RGBA | 480x480 | Yes (0 semi) | `48x48` | `legacy_tileset` | `regular_tileset` | Old_Tileset_3 (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/Tileset_48x48_9.png` | PNG | RGBA | 480x480 | Yes (0 semi) | `48x48` | `legacy_tileset` | `regular_tileset` | Old_Tileset_9 (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/idle_16x16_2.png` | PNG | RGBA | 64x32 | Yes (0 semi) | `16x32` | `legacy_character_sheet` | `animation_strip` | Old_idle_2 (16x16 base) | `unverified_legacy_provenance` |
| `Old/idle_32x32_2.png` | PNG | RGBA | 128x64 | Yes (0 semi) | `32x64` | `legacy_character_sheet` | `animation_strip` | Old_idle_2 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/idle_48x48_2.png` | PNG | RGBA | 192x96 | Yes (0 semi) | `48x96` | `legacy_character_sheet` | `animation_strip` | Old_idle_2 (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/mv/Character_2_16x16_RPGMAKER.png` | PNG | RGBA | 48x128 | Yes (0 semi) | `16x32` | `legacy_character_sheet` | `character_animation_grid` | Old_Character_2_RPGMAKER (16x16 base) | `unverified_legacy_provenance` |
| `Old/mv/Character_2_32x32_RPGMAKER.png` | PNG | RGBA | 96x256 | Yes (0 semi) | `32x64` | `legacy_character_sheet` | `character_animation_grid` | Old_Character_2_RPGMAKER (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/mv/Character_2_48x48_RPGMAKER.png` | PNG | RGBA | 144x384 | Yes (0 semi) | `48x96` | `legacy_character_sheet` | `character_animation_grid` | Old_Character_2_RPGMAKER (48x48 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/run_horizontal_16x16_2.png` | PNG | RGBA | 384x32 | Yes (0 semi) | `16x32` | `legacy_character_sheet` | `animation_strip` | Old_run_horizontal_2 (16x16 base) | `unverified_legacy_provenance` |
| `Old/run_horizontal_32x32_2.png` | PNG | RGBA | 768x64 | Yes (0 semi) | `32x64` | `legacy_character_sheet` | `animation_strip` | Old_run_horizontal_2 (32x32 2x/3x scale) | `unverified_legacy_provenance` |
| `Old/run_horizontal_48x48_2.png` | PNG | RGBA | 1152x96 | Yes (0 semi) | `48x96` | `legacy_character_sheet` | `animation_strip` | Old_run_horizontal_2 (48x48 2x/3x scale) | `unverified_legacy_provenance` |

## 5. Unresolved Asset Classification Questions

### Q-01: Canonical game tile resolution (16x16 vs 48x48)
- **Question:** Characters_free named sheets (Adam, Alex, Amelia, Bob) exist only at 16x16 native scale (16x32 / 32x32 frames), while Interiors_free and Room_Builder_free provide 16x16, 32x32, and 48x48 (pixel-exact 1x, 2x, 3x upscales) and Characters_MV.png is 48x96. Should LearnNexus standardize Phaser runtime assets on 16x16 with integer 3x camera zoom (matching all 7 character animations), or 48x48 with 1x zoom (requiring 3x nearest-neighbor upscale of Characters_free)?
- **Affected assets:** `Interiors_free/*`, `Characters_free/*`

### Q-02: Exact attribution and author metadata for LICENSE.txt
- **Question:** assets/LICENSE.txt allows non-commercial use and editing but omits author name, pack URL, and attribution wording. Confirm original pack provenance (appears to be LimeZu 'Modern Interiors Free') and whether attribution credits should be added to README/about screen.
- **Affected assets:** `assets/LICENSE.txt`, `Interiors_free/*`, `Characters_free/*`

### Q-03: Retention vs archival of assets/Old/
- **Question:** assets/Old/ contains 24 older tileset and character files (Tileset_*_1/2/3/9/16 and Character 2 in 16/32/48 resolutions) whose styles overlap with Room_Builder_free. Should Old/ assets remain archived or be imported into Phaser tilesets?
- **Affected assets:** `Old/*`

### Q-04: Ambiguous touching and multi-part sprites in Interiors_free
- **Question:** Interiors_free contains touching furniture groups (e.g., wide modular counter/sofa/bookshelf blocks spanning up to 15x5 tiles) and tiny disconnected decorative pieces (7 components <= 4px side in 16x16). Review the ambiguous contact sheet to decide which blobs should be split into individual furniture items and which tiny pieces belong to adjacent objects.
- **Affected assets:** `Interiors_free/16x16/Interiors_free_16x16.png`, `Interiors_free/48x48/Interiors_free_48x48.png`

### Q-05: Semantic naming of extracted Interiors_free props
- **Question:** Interiors_free contains ~269 connected components spanning desks, chairs, sofas, rugs, beds, kitchen/study props, cabinets, plants, windows, doors, and decor. Review contact sheets to assign final semantic IDs and mark which objects are interactive workstations vs static decor.
- **Affected assets:** `Interiors_free/48x48/Interiors_free_48x48.png`

### Q-06: Semi-transparent glass/shadow pixels in Interiors_free
- **Question:** Component 100 in Interiors_free (y=1584..1665 in 48x48; y=528..555 in 16x16) contains semi-transparent alpha values (161, 220, 242). Confirm whether these should be kept as translucent overlays in Phaser.
- **Affected assets:** `Interiors_free/*/Interiors_free_*.png`
