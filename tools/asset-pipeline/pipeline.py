#!/usr/bin/env python3
"""LearnNexus Reusable Asset Processing Pipeline CLI."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from catalog_builder import build_asset_catalog, write_json
from character_analyzer import analyze_character_strips
from config import (
    CHARACTER_NAMES,
    DEFAULT_ASSETS_DIR,
    DEFAULT_INVENTORY_JSON,
    DEFAULT_INVENTORY_MD,
    DEFAULT_OUTPUT_DIR,
)
from contact_sheets import (
    generate_character_contact_sheet,
    generate_mv_and_legacy_character_sheet,
    generate_sprite_contact_sheets,
)
from grid_slicer import analyze_tileset_grid
from inventory import build_inventory, write_inventory_outputs
from phaser_exporter import (
    export_interactive_objects_template,
    export_phaser_characters,
    export_phaser_tilesets,
    pack_phaser_atlas,
)
from segmenter import segment_sprite_sheet
from validator import (
    snapshot_source_hashes,
    validate_characters,
    validate_contact_sheets,
    validate_exclusions_and_immutability,
    validate_segmentation,
    validate_tileset,
)


def run_pilot(assets_dir: Path, output_dir: Path) -> dict[str, Any]:
    """Phase 7 Pilot: validate pipeline on the 5 mandatory target files first."""
    hashes_before = snapshot_source_hashes(assets_dir)
    pilot_dir = output_dir / "pilot-validation"
    pilot_dir.mkdir(parents=True, exist_ok=True)

    # 1. free_overview.png confirmed reference-only (never segmented)
    overview_exists = (assets_dir / "free_overview.png").exists()

    # 2. Interiors_free/48x48/Interiors_free_48x48.png
    seg_48 = segment_sprite_sheet(
        image_path=assets_dir / "Interiors_free/48x48/Interiors_free_48x48.png",
        relative_source="Interiors_free/48x48/Interiors_free_48x48.png",
        tile_size=48,
        prefix="int48_obj",
        extract_dir=pilot_dir / "extracted/interiors_48x48",
        overlay_path=pilot_dir / "contact-sheets/interiors_48x48_bbox_overlay.png",
    )

    # 3. Interiors_free/48x48/Room_Builder_free_48x48.png
    rb_48 = analyze_tileset_grid(
        image_path=assets_dir / "Interiors_free/48x48/Room_Builder_free_48x48.png",
        relative_source="Interiors_free/48x48/Room_Builder_free_48x48.png",
        tile_width=48,
        tile_height=48,
        tileset_id="room_builder_48x48",
        is_room_builder=True,
        grid_preview_path=pilot_dir / "contact-sheets/room_builder_48x48_grid.png",
    )

    # 4 & 5. Adam_16x16.png + Adam_run_16x16.png (and Adam strips)
    adam_chars = analyze_character_strips(assets_dir, characters=["Adam"])

    # Pilot contact sheets
    clean_48 = [c for c in seg_48["components"] if not c["is_ambiguous"]]
    ambig_48 = [c for c in seg_48["components"] if c["is_ambiguous"]]
    sheets: list[str] = [seg_48["overlay_image"], rb_48["grid_preview_image"]]
    sheets.extend(
        generate_sprite_contact_sheets(
            clean_48[:36],
            "Interiors_free/48x48/Interiors_free_48x48.png",
            "Pilot: Interiors 48x48 Clean Sample",
            pilot_dir / "contact-sheets",
            "pilot_interiors_48x48_clean_sample",
            ambiguous_mode=False,
        )
    )
    sheets.extend(
        generate_sprite_contact_sheets(
            ambig_48,
            "Interiors_free/48x48/Interiors_free_48x48.png",
            "Pilot: Interiors 48x48 Ambiguous Detections",
            pilot_dir / "contact-sheets",
            "pilot_interiors_48x48_ambiguous",
            ambiguous_mode=True,
        )
    )
    sheets.append(
        generate_character_contact_sheet(
            assets_dir,
            adam_chars,
            pilot_dir / "contact-sheets/pilot_adam_16x16_animations.png",
            scale=2,
        )
    )

    # Validate pilot targets
    v_seg = validate_segmentation(assets_dir, seg_48)
    v_rb = validate_tileset(assets_dir, rb_48)
    v_adam = validate_characters(adam_chars, target_character="Adam")
    v_sheets = validate_contact_sheets(sheets)
    hashes_after = snapshot_source_hashes(assets_dir)

    pilot_report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "pilot_passed": (
            overview_exists
            and v_seg["passed"]
            and v_rb["passed"]
            and v_adam["passed"]
            and v_sheets["passed"]
            and hashes_before == hashes_after
        ),
        "free_overview_reference_only": overview_exists,
        "interiors_48x48_validation": v_seg,
        "room_builder_48x48_validation": v_rb,
        "adam_character_validation": v_adam,
        "contact_sheets_validation": v_sheets,
        "originals_unchanged": hashes_before == hashes_after,
    }
    write_json(pilot_report, pilot_dir / "pilot-validation-report.json")
    return pilot_report


def run_full_pipeline(
    assets_dir: Path,
    output_dir: Path,
    inventory_md: Path,
    inventory_json: Path,
    extract_tiles: bool = False,
) -> dict[str, Any]:
    """Run all phases (1 through 7) end-to-end without modifying assets/."""
    hashes_before = snapshot_source_hashes(assets_dir)

    # Phase 1: Inventory & License Audit
    inventory = build_inventory(assets_dir)
    write_inventory_outputs(inventory, inventory_json, inventory_md)

    # Phase 7 Pilot first (gate before full expansion)
    pilot_report = run_pilot(assets_dir, output_dir)
    if not pilot_report["pilot_passed"]:
        raise RuntimeError(f"Pilot validation failed: {json.dumps(pilot_report, indent=2)}")

    # Phase 2A: Alpha-channel segmentation for Interiors_free (48x48 primary + 16x16 canonical native)
    seg_results: dict[str, dict[str, Any]] = {}
    for scale, prefix in [(48, "int48_obj"), (16, "int16_obj")]:
        rel = f"Interiors_free/{scale}x{scale}/Interiors_free_{scale}x{scale}.png"
        seg_results[f"interiors_{scale}x{scale}"] = segment_sprite_sheet(
            image_path=assets_dir / rel,
            relative_source=rel,
            tile_size=scale,
            prefix=prefix,
            extract_dir=output_dir / f"extracted/interiors_{scale}x{scale}",
            overlay_path=output_dir / f"contact-sheets/interiors_{scale}x{scale}_bbox_overlay.png",
        )

    # Phase 2B: Grid-based tileset analysis for Room_Builder_free (16/32/48), Interiors_free (32x32 ref), and Old/Tileset_* (16/32/48)
    tileset_specs = [
        ("room_builder_48x48", "Interiors_free/48x48/Room_Builder_free_48x48.png", 48, True),
        ("room_builder_32x32", "Interiors_free/32x32/Room_Builder_free_32x32.png", 32, True),
        ("room_builder_16x16", "Interiors_free/16x16/Room_Builder_free_16x16.png", 16, True),
        ("interiors_32x32_grid", "Interiors_free/32x32/Interiors_free_32x32.png", 32, False),
    ]
    for tid_num in (1, 2, 3, 9, 16):
        for scale in (16, 32, 48):
            tileset_specs.append(
                (
                    f"old_tileset_{tid_num}_{scale}x{scale}",
                    f"Old/Tileset_{scale}x{scale}_{tid_num}.png",
                    scale,
                    False,
                )
            )

    tileset_results: dict[str, dict[str, Any]] = {}
    grid_sheets: list[str] = []
    for ts_id, rel, tile_sz, is_rb in tileset_specs:
        # Render visual grid contact sheets for primary sheets + 48x48 legacy tilesets
        render_preview = is_rb or ts_id.endswith("_48x48")
        preview_path = (
            output_dir / f"contact-sheets/tileset_{ts_id}_grid.png" if render_preview else None
        )
        cells_dir = (output_dir / f"extracted/tiles/{ts_id}") if extract_tiles else None
        res = analyze_tileset_grid(
            image_path=assets_dir / rel,
            relative_source=rel,
            tile_width=tile_sz,
            tile_height=tile_sz,
            tileset_id=ts_id,
            is_room_builder=is_rb,
            extract_cells_dir=cells_dir,
            grid_preview_path=preview_path,
        )
        tileset_results[ts_id] = res
        if preview_path is not None:
            grid_sheets.append(preview_path.as_posix())

    # Phase 2C: Character animation analysis (all 4 primary characters + RPG Maker MV + Old legacy)
    char_results = analyze_character_strips(assets_dir, characters=CHARACTER_NAMES)

    # Phase 3: Visual Review Contact Sheets (organized by category)
    contact_sheets_dir = output_dir / "contact-sheets"
    all_contact_sheets: list[str] = list(grid_sheets)

    seg48 = seg_results["interiors_48x48"]
    seg16 = seg_results["interiors_16x16"]
    all_contact_sheets.append(seg48["overlay_image"])
    all_contact_sheets.append(seg16["overlay_image"])

    clean_48 = [c for c in seg48["components"] if not c["is_ambiguous"]]
    ambig_48 = [c for c in seg48["components"] if c["is_ambiguous"]]
    all_contact_sheets.extend(
        generate_sprite_contact_sheets(
            clean_48,
            seg48["source_file"],
            "Interiors 48x48 - Clean Extracted Sprites",
            contact_sheets_dir,
            "interiors_48x48_clean",
            ambiguous_mode=False,
            cols=6,
            per_page=36,
        )
    )
    all_contact_sheets.extend(
        generate_sprite_contact_sheets(
            ambig_48,
            seg48["source_file"],
            "Interiors 48x48 - Ambiguous Detections (Human Review Required)",
            contact_sheets_dir,
            "interiors_48x48_ambiguous",
            ambiguous_mode=True,
            cols=5,
            per_page=25,
        )
    )

    all_contact_sheets.append(
        generate_character_contact_sheet(
            assets_dir,
            char_results,
            contact_sheets_dir / "characters_16x16_animations.png",
            scale=2,
        )
    )
    all_contact_sheets.append(
        generate_mv_and_legacy_character_sheet(
            assets_dir,
            char_results,
            contact_sheets_dir / "characters_mv_and_legacy.png",
        )
    )

    # Phase 4: Asset Catalog & Metadata JSONs
    catalog_dir = output_dir / "catalog"
    catalog = build_asset_catalog(seg_results, tileset_results, char_results)
    write_json(catalog, catalog_dir / "asset-catalog.json")
    write_json(
        {
            k: {fk: fv for fk, fv in v.items() if fk != "tiles"}
            for k, v in tileset_results.items()
        },
        catalog_dir / "tilesets-summary.json",
    )
    write_json(tileset_results, catalog_dir / "tilesets-metadata.json")
    write_json(char_results, catalog_dir / "animations-metadata.json")
    write_json(
        {
            "interiors_48x48_ambiguous": ambig_48,
            "interiors_16x16_ambiguous": [c for c in seg16["components"] if c["is_ambiguous"]],
        },
        catalog_dir / "ambiguous-review-queue.json",
    )

    # Phase 5: Phaser 3 Compatibility Exports
    phaser_dir = output_dir / "phaser"
    atlas_48 = pack_phaser_atlas(seg48["components"], "interiors_48x48", phaser_dir / "atlases")
    atlas_16 = pack_phaser_atlas(seg16["components"], "interiors_16x16", phaser_dir / "atlases")
    phaser_tilesets = export_phaser_tilesets(assets_dir, tileset_results, phaser_dir / "tilesets")
    phaser_chars = export_phaser_characters(assets_dir, char_results, phaser_dir / "characters")
    interactive_tpl = export_interactive_objects_template(atlas_48, atlas_16, phaser_dir / "objects")

    # Phase 7: Full Validation
    v_seg48 = validate_segmentation(assets_dir, seg48, atlas_48)
    v_seg16 = validate_segmentation(assets_dir, seg16, atlas_16)
    v_tilesets = {tid: validate_tileset(assets_dir, ts) for tid, ts in tileset_results.items()}
    v_chars = validate_characters(char_results)
    v_sheets = validate_contact_sheets(all_contact_sheets)
    v_excl = validate_exclusions_and_immutability(assets_dir, hashes_before, catalog, output_dir)

    all_passed = (
        pilot_report["pilot_passed"]
        and v_seg48["passed"]
        and v_seg16["passed"]
        and all(v["passed"] for v in v_tilesets.values())
        and v_chars["passed"]
        and v_sheets["passed"]
        and v_excl["passed"]
    )

    full_validation = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "all_checks_passed": all_passed,
        "pilot_validation": pilot_report,
        "segmentation_validation": {
            "interiors_48x48": v_seg48,
            "interiors_16x16": v_seg16,
        },
        "tileset_validation": v_tilesets,
        "character_validation": v_chars,
        "contact_sheet_validation": v_sheets,
        "exclusion_and_immutability_validation": v_excl,
        "summary_metrics": {
            "source_files_inspected": inventory["total_files"],
            "interiors_48x48_sprites_extracted": seg48["total_components"],
            "interiors_16x16_sprites_extracted": seg16["total_components"],
            "interiors_48x48_clean": seg48["clean_components"],
            "interiors_48x48_ambiguous": seg48["ambiguous_components"],
            "room_builder_48x48_usable_tiles": tileset_results["room_builder_48x48"]["usable_game_tiles"],
            "room_builder_48x48_excluded_annotation_tiles": tileset_results["room_builder_48x48"]["excluded_annotation_tiles"],
            "total_usable_tiles_all_tilesets": sum(ts["usable_game_tiles"] for ts in tileset_results.values()),
            "character_sequences_primary": char_results["total_primary_sequences"],
            "character_sequences_mv": char_results["total_mv_sequences"],
            "character_sequences_total": char_results["total_sequences_cataloged"],
            "contact_sheets_generated": len(all_contact_sheets),
            "phaser_atlases": [atlas_48, atlas_16],
            "phaser_tilesets": phaser_tilesets,
            "phaser_characters": phaser_chars,
            "interactive_objects_template": interactive_tpl,
        },
    }
    write_json(full_validation, output_dir / "reports/validation-report.json")
    return full_validation


def main() -> None:
    parser = argparse.ArgumentParser(description="LearnNexus Asset Pipeline & Sprite Extractor")
    parser.add_argument(
        "--phase",
        choices=["inventory", "pilot", "all"],
        default="all",
        help="Pipeline phase to run (default: all)",
    )
    parser.add_argument("--assets", type=Path, default=DEFAULT_ASSETS_DIR, help="Source assets directory")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR, help="Processed output directory")
    parser.add_argument("--inventory-md", type=Path, default=DEFAULT_INVENTORY_MD)
    parser.add_argument("--inventory-json", type=Path, default=DEFAULT_INVENTORY_JSON)
    parser.add_argument(
        "--extract-tiles",
        action="store_true",
        help="Optionally extract individual tile PNGs (default keeps preserved tileset sheets).",
    )
    args = parser.parse_args()

    if args.phase == "inventory":
        inv = build_inventory(args.assets)
        write_inventory_outputs(inv, args.inventory_json, args.inventory_md)
        print(json.dumps({"total_files": inv["total_files"], "status": "inventory_complete"}, indent=2))
    elif args.phase == "pilot":
        rep = run_pilot(args.assets, args.output)
        print(json.dumps(rep, indent=2))
        if not rep["pilot_passed"]:
            raise SystemExit(1)
    else:
        rep = run_full_pipeline(
            assets_dir=args.assets,
            output_dir=args.output,
            inventory_md=args.inventory_md,
            inventory_json=args.inventory_json,
            extract_tiles=args.extract_tiles,
        )
        print(json.dumps(rep["summary_metrics"], indent=2))
        print(f"ALL_CHECKS_PASSED={rep['all_checks_passed']}")
        if not rep["all_checks_passed"]:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
