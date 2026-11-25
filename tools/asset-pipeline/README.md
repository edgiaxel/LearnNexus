# LearnNexus Asset Processing Pipeline

Reusable Python utility that inventories, audits, segments, slices, previews, catalogs, exports to Phaser 3, and validates pixel-art assets from `assets/` without modifying or deleting any source files.

## Requirements

- Python 3.10+ (verified on Python 3.13.5)
- `Pillow`, `numpy`, `scipy` (no external build tools or extra frameworks required)

## Quick Start

Run the full pipeline (Phase 1 inventory -> Phase 7 pilot gate -> full extraction, contact sheets, catalog, Phaser 3 exports, and validation):

```bash
python3 tools/asset-pipeline/pipeline.py --phase all
```

Run individual phases:

```bash
# Phase 1: Inventory and license audit only
python3 tools/asset-pipeline/pipeline.py --phase inventory

# Phase 7 Pilot: Validate on the 5 reference/target files before full expansion
python3 tools/asset-pipeline/pipeline.py --phase pilot

# Optional: Also export individual tile PNGs for regular tilesets (off by default to keep tilesets compact)
python3 tools/asset-pipeline/pipeline.py --phase all --extract-tiles
```

## Module Structure

| Module | Responsibility |
|---|---|
| `config.py` | Exclusions (Gather UI screenshots), resolution-variant groups, `Room_Builder_free` regions, character frame schemas, license references, edge-case thresholds |
| `inventory.py` | Phase 1 scanner: dimensions, color mode, alpha stats, SHA-256, nearest-neighbor scale equivalence, character composite match, `LICENSE.txt` audit -> `ASSET_INVENTORY.md` + `asset-inventory.json` |
| `segmenter.py` | Phase 2A: 8-connected alpha segmentation with masked extraction (prevents neighbor pixel bleed), edge-case flagging (tiny, oversized/touching, overlapping bbox, close same-tile parts, semi-alpha), and source bbox overlay generation |
| `grid_slicer.py` | Phase 2B: configurable grid slicing and tile occupancy/annotation analysis while preserving source tilesets |
| `character_analyzer.py` | Phase 2C: character animation metadata for `Characters_free` (`16x32` standard strips, `32x32` wide sit strips), `RPGMAKERMV/Characters_MV.png` (`48x96`), and `Old/` legacy characters |
| `contact_sheets.py` | Phase 3: transparency-checkerboard visual review sheets with unique IDs, dimensions, source coordinates, crisp aspect ratios, and dedicated ambiguous review pages |
| `catalog_builder.py` | Phase 4: semantic + provisional JSON catalog (`processed-assets/catalog/asset-catalog.json`) |
| `phaser_exporter.py` | Phase 5: Phaser 3 JSON Hash texture atlases (`pixelArt: true`, `NEAREST`, 2px padding), preserved tilesets + manifest, character spritesheet/animation definitions, and interactive workstation metadata template |
| `validator.py` | Phase 7: automated pixel-equality, tight-bbox, zero-clipping, animation-order, tileset-bounds, exclusion, and SHA-256 source-immutability verification |

## Safety & Reproducibility Guarantees

- `assets/` is strictly read-only; SHA-256 hashes of all 72 source files are verified before and after every run.
- Gather UI screenshots (`1.png`–`7.png`, including `2.jpg`) and `free_overview.png` are never extracted into game sprites, atlases, or production catalog entries.
- Ambiguous detections are flagged in `processed-assets/catalog/ambiguous-review-queue.json` and rendered on dedicated review contact sheets rather than silently merged or split.
- Re-running the pipeline deterministically regenerates `processed-assets/` without altering source files.
