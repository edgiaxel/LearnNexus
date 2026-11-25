"""Phase 4: Semantic & provisional asset catalog builder."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def build_asset_catalog(
    segmentation_results: dict[str, dict[str, Any]],
    tileset_results: dict[str, dict[str, Any]],
    character_results: dict[str, Any],
) -> dict[str, Any]:
    """Assemble unified catalog with verified categories for known sheets and provisional IDs for unreviewed props."""
    entries: list[dict[str, Any]] = []

    # 1. Segmented objects (Interiors_free 48x48 & 16x16)
    for sheet_key, seg in segmentation_results.items():
        tile_size = seg["tile_size"]
        for comp in seg["components"]:
            b = comp["bbox"]
            tb = comp["tile_bounds"]
            entries.append(
                {
                    "asset_id": comp["asset_id"],
                    "source_file": f"assets/{comp['source_file']}",
                    "source_coordinates": {
                        "x": b["x"],
                        "y": b["y"],
                        "width": b["width"],
                        "height": b["height"],
                    },
                    "original_dimensions": {"width": b["width"], "height": b["height"]},
                    "processed_filename": comp["extracted_file"],
                    "category": "provisional_interior_object",
                    "suggested_review_categories": [
                        "furniture",
                        "desks",
                        "chairs",
                        "sofas",
                        "cabinets",
                        "shelves",
                        "plants",
                        "decorations",
                        "electronics",
                        "windows",
                        "doors",
                    ],
                    "tile_dimensions": {
                        "tile_size_px": tile_size,
                        "span_cols": tb["span_cols"],
                        "span_rows": tb["span_rows"],
                        "grid_aligned": not comp["extends_beyond_tile_alignment"],
                    },
                    "license_reference": "free_pack_non_commercial",
                    "extraction_method": "alpha_connected_components_8",
                    "review_status": comp["review_status"],
                    "is_ambiguous": comp["is_ambiguous"],
                    "ambiguity_reasons": comp["edge_cases"],
                    "neighbor_links": {
                        "overlapping_bbox": comp["overlapping_neighbors"],
                        "close_same_tile": comp["close_neighbors"],
                    },
                }
            )

    # 2. Structural tilesets (Room_Builder_free & Old/Tileset_*)
    for ts_id, ts in tileset_results.items():
        is_legacy = ts["source_file"].startswith("Old/")
        lic = "unverified_legacy_provenance" if is_legacy else "free_pack_non_commercial"
        if ts["semantic_regions"]:
            for region in ts["semantic_regions"]:
                if region["exclude_from_game"]:
                    continue
                tw, th = ts["tile_width"], ts["tile_height"]
                rx = region["col_start"] * tw
                ry = region["row_start"] * th
                rw = (region["col_end"] - region["col_start"] + 1) * tw
                rh = (region["row_end"] - region["row_start"] + 1) * th
                entries.append(
                    {
                        "asset_id": f"{ts_id}_{region['name']}",
                        "source_file": f"assets/{ts['source_file']}",
                        "source_coordinates": {"x": rx, "y": ry, "width": rw, "height": rh},
                        "original_dimensions": {"width": rw, "height": rh},
                        "processed_filename": f"processed-assets/phaser/tilesets/{Path(ts['source_file']).name}",
                        "category": region["category"],
                        "tile_dimensions": {
                            "tile_size_px": tw,
                            "span_cols": region["col_end"] - region["col_start"] + 1,
                            "span_rows": region["row_end"] - region["row_start"] + 1,
                            "grid_aligned": True,
                        },
                        "license_reference": lic,
                        "extraction_method": "grid_tileset_region_metadata",
                        "review_status": "verified_structural",
                        "is_ambiguous": False,
                        "ambiguity_reasons": [],
                        "notes": region["notes"],
                    }
                )
        else:
            entries.append(
                {
                    "asset_id": f"{ts_id}_tileset",
                    "source_file": f"assets/{ts['source_file']}",
                    "source_coordinates": {
                        "x": 0,
                        "y": 0,
                        "width": ts["dimensions"]["width"],
                        "height": ts["dimensions"]["height"],
                    },
                    "original_dimensions": ts["dimensions"],
                    "processed_filename": f"processed-assets/phaser/tilesets/{Path(ts['source_file']).name}",
                    "category": "legacy_tileset" if is_legacy else "tileset",
                    "tile_dimensions": {
                        "tile_size_px": ts["tile_width"],
                        "span_cols": ts["columns"],
                        "span_rows": ts["rows"],
                        "grid_aligned": True,
                    },
                    "license_reference": lic,
                    "extraction_method": "grid_tileset_metadata",
                    "review_status": "needs_review" if is_legacy else "verified_structural",
                    "is_ambiguous": False,
                    "ambiguity_reasons": [],
                    "usable_game_tiles": ts["usable_game_tiles"],
                }
            )

    # 3. Character animation sequences
    for char in character_results["primary_characters"]:
        for anim_name, anim in char["animations"].items():
            for seq in anim["sequences"]:
                entries.append(
                    {
                        "asset_id": f"char_{seq['animation_key']}",
                        "source_file": f"assets/{seq['source_strip']}",
                        "source_coordinates": {
                            "x": seq["frames"][0] * seq["frame_width"],
                            "y": 0,
                            "width": seq["frame_count"] * seq["frame_width"],
                            "height": seq["frame_height"],
                        },
                        "original_dimensions": {
                            "width": seq["frame_width"],
                            "height": seq["frame_height"],
                        },
                        "processed_filename": f"processed-assets/phaser/characters/{Path(seq['source_strip']).name}",
                        "category": "characters",
                        "tile_dimensions": {
                            "frame_width_px": seq["frame_width"],
                            "frame_height_px": seq["frame_height"],
                            "frame_count": seq["frame_count"],
                            "direction": seq["direction"],
                            "action": anim_name,
                            "character": char["display_name"],
                        },
                        "license_reference": "free_pack_non_commercial",
                        "extraction_method": "character_animation_metadata",
                        "review_status": "verified_animation",
                        "is_ambiguous": False,
                        "ambiguity_reasons": [],
                    }
                )

    mv = character_results.get("rpgmaker_mv_sheet")
    if mv:
        for c in mv["characters"]:
            for seq in c["sequences"]:
                entries.append(
                    {
                        "asset_id": f"char_{seq['animation_key']}",
                        "source_file": f"assets/{mv['source_file']}",
                        "source_coordinates": {
                            "x": c["block_col"] * 3 * mv["frame_width"],
                            "y": (seq["frames"][0] // 12) * mv["frame_height"],
                            "width": 3 * mv["frame_width"],
                            "height": mv["frame_height"],
                        },
                        "original_dimensions": {
                            "width": mv["frame_width"],
                            "height": mv["frame_height"],
                        },
                        "processed_filename": f"processed-assets/phaser/characters/{Path(mv['source_file']).name}",
                        "category": "characters",
                        "tile_dimensions": {
                            "frame_width_px": mv["frame_width"],
                            "frame_height_px": mv["frame_height"],
                            "frame_count": seq["frame_count"],
                            "direction": seq["direction"],
                            "action": "mv_walk",
                            "character": c["character"],
                        },
                        "license_reference": "free_pack_non_commercial",
                        "extraction_method": "character_animation_metadata",
                        "review_status": "verified_animation",
                        "is_ambiguous": False,
                        "ambiguity_reasons": [],
                    }
                )

    category_summary: dict[str, int] = {}
    status_summary: dict[str, int] = {}
    for e in entries:
        category_summary[e["category"]] = category_summary.get(e["category"], 0) + 1
        status_summary[e["review_status"]] = status_summary.get(e["review_status"], 0) + 1

    return {
        "schema_version": "1.0.0",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "total_catalog_entries": len(entries),
        "category_counts": category_summary,
        "review_status_counts": status_summary,
        "entries": entries,
    }


def write_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
