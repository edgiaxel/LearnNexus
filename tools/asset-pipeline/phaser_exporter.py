"""Phase 5: Phaser 3 compatible texture atlases, tileset manifests, animation configs, and object metadata."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from PIL import Image


def pack_phaser_atlas(
    components: list[dict[str, Any]],
    atlas_name: str,
    out_dir: Path,
    padding: int = 2,
    max_width: int = 2048,
) -> dict[str, Any]:
    """Shelf-pack extracted sprites into a pixel-exact Phaser 3 JSON Hash texture atlas."""
    out_dir.mkdir(parents=True, exist_ok=True)

    # Sort tallest-first for compact shelf packing
    items = sorted(components, key=lambda c: (-c["bbox"]["height"], -c["bbox"]["width"], c["asset_id"]))

    placements: list[tuple[dict[str, Any], int, int]] = []
    cur_x = padding
    cur_y = padding
    shelf_h = 0
    used_w = 0

    for comp in items:
        w = comp["bbox"]["width"]
        h = comp["bbox"]["height"]
        if cur_x + w + padding > max_width and cur_x > padding:
            cur_x = padding
            cur_y += shelf_h + padding
            shelf_h = 0
        placements.append((comp, cur_x, cur_y))
        cur_x += w + padding
        used_w = max(used_w, cur_x)
        shelf_h = max(shelf_h, h)

    atlas_w = max(used_w, 16)
    atlas_h = max(cur_y + shelf_h + padding, 16)

    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    frames_hash: dict[str, Any] = {}

    for comp, px, py in placements:
        with Image.open(comp["extracted_file"]) as sp:
            sp_rgba = sp.convert("RGBA")
            atlas_img.paste(sp_rgba, (px, py))
        w, h = comp["bbox"]["width"], comp["bbox"]["height"]
        frames_hash[comp["asset_id"]] = {
            "frame": {"x": px, "y": py, "w": w, "h": h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h},
            "pivot": {"x": 0.5, "y": 1.0},
            "custom": {
                "sourceFile": comp["source_file"],
                "sourceBBox": comp["bbox"],
                "tileSpan": {
                    "cols": comp["tile_bounds"]["span_cols"],
                    "rows": comp["tile_bounds"]["span_rows"],
                },
                "reviewStatus": comp["review_status"],
                "isAmbiguous": comp["is_ambiguous"],
            },
        }

    png_path = out_dir / f"{atlas_name}.png"
    json_path = out_dir / f"{atlas_name}.json"
    atlas_img.save(png_path)

    atlas_json = {
        "frames": frames_hash,
        "meta": {
            "app": "LearnNexus Asset Pipeline",
            "version": "1.0",
            "image": png_path.name,
            "format": "RGBA8888",
            "size": {"w": atlas_w, "h": atlas_h},
            "scale": "1",
            "pixelArt": True,
            "filterMode": "NEAREST",
        },
    }
    json_path.write_text(json.dumps(atlas_json, indent=2) + "\n", encoding="utf-8")

    return {
        "atlas_key": atlas_name,
        "image_file": png_path.as_posix(),
        "json_file": json_path.as_posix(),
        "dimensions": {"width": atlas_w, "height": atlas_h},
        "frame_count": len(frames_hash),
    }


def export_phaser_tilesets(
    assets_dir: Path,
    tileset_results: dict[str, dict[str, Any]],
    out_dir: Path,
) -> dict[str, Any]:
    """Copy preserved tilesets (no individual tile PNG bloat) and emit Phaser 3 tileset manifest."""
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {
        "rendering_requirements": {
            "pixelArt": True,
            "antialias": False,
            "roundPixels": True,
            "textureFilter": "Phaser.Textures.FilterMode.NEAREST",
        },
        "tilesets": {},
    }

    for ts_id, ts in tileset_results.items():
        src = assets_dir / ts["source_file"]
        dst_name = Path(ts["source_file"]).name
        dst = out_dir / dst_name
        shutil.copy2(src, dst)

        usable_indices = [t["tile_index"] for t in ts["tiles"] if t["non_empty"] and not t["exclude_from_game"]]
        excluded_indices = [t["tile_index"] for t in ts["tiles"] if t["non_empty"] and t["exclude_from_game"]]

        manifest["tilesets"][ts_id] = {
            "key": ts_id,
            "image": dst.as_posix(),
            "source_original": f"assets/{ts['source_file']}",
            "tileWidth": ts["tile_width"],
            "tileHeight": ts["tile_height"],
            "columns": ts["columns"],
            "rows": ts["rows"],
            "imageWidth": ts["dimensions"]["width"],
            "imageHeight": ts["dimensions"]["height"],
            "margin": 0,
            "spacing": 0,
            "usableTileCount": len(usable_indices),
            "excludedAnnotationTileIndices": excluded_indices,
            "regions": ts["semantic_regions"],
        }

    manifest_path = out_dir / "tilesets-phaser.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {"manifest_file": manifest_path.as_posix(), "tileset_count": len(manifest["tilesets"])}


def export_phaser_characters(
    assets_dir: Path,
    character_results: dict[str, Any],
    out_dir: Path,
) -> dict[str, Any]:
    """Copy preserved character sheets and emit Phaser 3 spritesheet + anims.create definitions."""
    out_dir.mkdir(parents=True, exist_ok=True)
    spritesheets: list[dict[str, Any]] = []
    animations: list[dict[str, Any]] = []

    for char in character_results["primary_characters"]:
        # Copy master sheet for reference
        master_rel = char["master_sheet"]["source_file"]
        if (assets_dir / master_rel).exists():
            shutil.copy2(assets_dir / master_rel, out_dir / Path(master_rel).name)

        for anim_name, anim in char["animations"].items():
            strip_rel = anim["strip_file"]
            dst = out_dir / Path(strip_rel).name
            shutil.copy2(assets_dir / strip_rel, dst)
            sprite_key = f"{char['character_id']}_{anim_name}"
            spritesheets.append(
                {
                    "key": sprite_key,
                    "file": dst.as_posix(),
                    "source_original": f"assets/{strip_rel}",
                    "frameConfig": {
                        "frameWidth": anim["frame_width"],
                        "frameHeight": anim["frame_height"],
                    },
                    "totalFrames": anim["frame_count"],
                }
            )
            for seq in anim["sequences"]:
                animations.append(
                    {
                        "key": seq["animation_key"],
                        "spriteKey": sprite_key,
                        "character": char["display_name"],
                        "action": anim_name,
                        "direction": seq["direction"],
                        "frames": {
                            "start": seq["frames"][0],
                            "end": seq["frames"][-1],
                            "indices": seq["frames"],
                        },
                        "frameRate": seq["frame_rate"],
                        "repeat": seq["repeat"],
                    }
                )

    mv = character_results.get("rpgmaker_mv_sheet")
    if mv:
        mv_dst = out_dir / Path(mv["source_file"]).name
        shutil.copy2(assets_dir / mv["source_file"], mv_dst)
        spritesheets.append(
            {
                "key": "characters_mv_48x96",
                "file": mv_dst.as_posix(),
                "source_original": f"assets/{mv['source_file']}",
                "frameConfig": {
                    "frameWidth": mv["frame_width"],
                    "frameHeight": mv["frame_height"],
                },
                "totalFrames": mv["columns"] * mv["active_rows"],
            }
        )
        for c in mv["characters"]:
            for seq in c["sequences"]:
                animations.append(
                    {
                        "key": seq["animation_key"],
                        "spriteKey": "characters_mv_48x96",
                        "character": c["character"],
                        "action": "mv_walk",
                        "direction": seq["direction"],
                        "frames": {"indices": seq["frames"]},
                        "frameRate": seq["frame_rate"],
                        "repeat": seq["repeat"],
                    }
                )

    payload = {
        "schema_version": "1.0.0",
        "rendering_requirements": {
            "pixelArt": True,
            "textureFilter": "Phaser.Textures.FilterMode.NEAREST",
            "recommendedCameraZoomFor16x16": 3,
        },
        "spritesheets": spritesheets,
        "animations": animations,
    }
    out_json = out_dir / "characters-phaser-anims.json"
    out_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return {
        "manifest_file": out_json.as_posix(),
        "spritesheet_count": len(spritesheets),
        "animation_count": len(animations),
    }


def export_interactive_objects_template(
    atlas_manifest_48: dict[str, Any],
    atlas_manifest_16: dict[str, Any],
    out_dir: Path,
) -> str:
    """Emit structured Phaser object metadata contract awaiting semantic human review."""
    out_dir.mkdir(parents=True, exist_ok=True)
    template = {
        "schema_version": "1.0.0",
        "status": "provisional_awaiting_visual_review",
        "notes": (
            "Assign reviewed atlas frame IDs from contact sheets before M2 CampusScene wiring. "
            "Do not guess frame bindings without visual confirmation."
        ),
        "available_atlases": {
            "48x48": atlas_manifest_48["atlas_key"],
            "16x16": atlas_manifest_16["atlas_key"],
        },
        "workstation_slots": [
            {
                "workstationId": "project-overview",
                "displayLabel": "Project Overview Desk",
                "preferredCategories": ["desks", "electronics"],
                "atlasKey": None,
                "frameId": None,
                "collidable": True,
                "interactable": True,
                "interactionRadiusTiles": 1.5,
                "reviewStatus": "pending_frame_selection",
            },
            {
                "workstationId": "tasks-sprint",
                "displayLabel": "Tasks Sprint Board",
                "preferredCategories": ["decorations", "cabinets", "desks"],
                "atlasKey": None,
                "frameId": None,
                "collidable": True,
                "interactable": True,
                "interactionRadiusTiles": 1.5,
                "reviewStatus": "pending_frame_selection",
            },
            {
                "workstationId": "resource-library",
                "displayLabel": "Resource Library Shelves",
                "preferredCategories": ["shelves", "cabinets"],
                "atlasKey": None,
                "frameId": None,
                "collidable": True,
                "interactable": True,
                "interactionRadiusTiles": 1.5,
                "reviewStatus": "pending_frame_selection",
            },
        ],
    }
    out_path = out_dir / "interactive-objects.json"
    out_path.write_text(json.dumps(template, indent=2) + "\n", encoding="utf-8")
    return out_path.as_posix()
