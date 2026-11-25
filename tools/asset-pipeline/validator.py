"""Phase 7: Automated verification suite for pilot targets and full pipeline outputs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from config import GATHER_REFERENCE_FILES, PILOT_VALIDATION_TARGETS
from inventory import sha256_file


def snapshot_source_hashes(assets_dir: Path) -> dict[str, str]:
    return {
        p.relative_to(assets_dir).as_posix(): sha256_file(p)
        for p in sorted(assets_dir.rglob("*"))
        if p.is_file()
    }


def validate_segmentation(
    assets_dir: Path,
    seg_result: dict[str, Any],
    atlas_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    src_path = assets_dir / seg_result["source_file"]
    src_arr = np.array(Image.open(src_path).convert("RGBA"))
    src_mask = src_arr[:, :, 3] > 0

    reconstructed = np.zeros_like(src_arr)
    tight_bbox_failures: list[str] = []
    transparency_mismatches: list[str] = []
    pixel_mismatches: list[str] = []
    missing_files: list[str] = []

    for comp in seg_result["components"]:
        f_path = Path(comp["extracted_file"])
        if not f_path.exists():
            missing_files.append(comp["asset_id"])
            continue
        sp = Image.open(f_path)
        if sp.mode != "RGBA":
            transparency_mismatches.append(comp["asset_id"])
        sp_arr = np.array(sp.convert("RGBA"))
        b = comp["bbox"]
        if sp_arr.shape[1] != b["width"] or sp_arr.shape[0] != b["height"]:
            tight_bbox_failures.append(comp["asset_id"])
            continue
        sp_mask = sp_arr[:, :, 3] > 0
        # Check tight bbox: top, bottom, left, right edges must each have >= 1 non-transparent pixel
        if not (
            sp_mask[0, :].any()
            and sp_mask[-1, :].any()
            and sp_mask[:, 0].any()
            and sp_mask[:, -1].any()
        ):
            tight_bbox_failures.append(comp["asset_id"])

        # Compare every non-transparent pixel against exact source sheet pixel
        src_slice = src_arr[b["y"] : b["y2"], b["x"] : b["x2"]]
        if not np.array_equal(sp_arr[sp_mask], src_slice[sp_mask]):
            pixel_mismatches.append(comp["asset_id"])

        reconstructed[b["y"] : b["y2"], b["x"] : b["x2"]][sp_mask] = sp_arr[sp_mask]

    # Zero clipping check: union of extracted sprites must equal 100% of source visible pixels
    vis_diff = int(
        (
            ((reconstructed != src_arr).any(axis=2))
            & ((reconstructed[:, :, 3] > 0) | src_mask)
        ).sum()
    )

    atlas_mismatches: list[str] = []
    if atlas_info is not None:
        atlas_arr = np.array(Image.open(atlas_info["image_file"]).convert("RGBA"))
        atlas_meta = json.loads(Path(atlas_info["json_file"]).read_text(encoding="utf-8"))
        for comp in seg_result["components"]:
            aid = comp["asset_id"]
            fr = atlas_meta["frames"][aid]["frame"]
            atlas_crop = atlas_arr[fr["y"] : fr["y"] + fr["h"], fr["x"] : fr["x"] + fr["w"]]
            sp_arr = np.array(Image.open(comp["extracted_file"]).convert("RGBA"))
            if not np.array_equal(atlas_crop, sp_arr):
                atlas_mismatches.append(aid)

    passed = (
        not missing_files
        and not tight_bbox_failures
        and not transparency_mismatches
        and not pixel_mismatches
        and vis_diff == 0
        and not atlas_mismatches
    )
    return {
        "source_file": seg_result["source_file"],
        "passed": passed,
        "components_checked": len(seg_result["components"]),
        "missing_files": len(missing_files),
        "tight_bbox_failures": len(tight_bbox_failures),
        "transparency_mode_failures": len(transparency_mismatches),
        "pixel_equality_failures": len(pixel_mismatches),
        "source_reconstruction_visible_diff_pixels": vis_diff,
        "atlas_pixel_mismatches": len(atlas_mismatches),
    }


def validate_tileset(assets_dir: Path, ts: dict[str, Any]) -> dict[str, Any]:
    src_arr = np.array(Image.open(assets_dir / ts["source_file"]).convert("RGBA"))
    h, w = src_arr.shape[:2]
    tw, th = ts["tile_width"], ts["tile_height"]
    out_of_bounds = 0
    occupancy_errors = 0

    for t in ts["tiles"]:
        if t["x"] < 0 or t["y"] < 0 or t["x"] + tw > w or t["y"] + th > h:
            out_of_bounds += 1
            continue
        cell_has = bool((src_arr[t["y"] : t["y"] + th, t["x"] : t["x"] + tw, 3] > 0).any())
        if cell_has != t["non_empty"]:
            occupancy_errors += 1

    expected_cells = (w // tw) * (h // th)
    passed = (
        len(ts["tiles"]) == expected_cells
        and out_of_bounds == 0
        and occupancy_errors == 0
        and ts["usable_game_tiles"] + ts["excluded_annotation_tiles"] == ts["occupied_cells"]
    )
    return {
        "source_file": ts["source_file"],
        "passed": passed,
        "total_cells": len(ts["tiles"]),
        "occupied_cells": ts["occupied_cells"],
        "usable_game_tiles": ts["usable_game_tiles"],
        "excluded_annotation_tiles": ts["excluded_annotation_tiles"],
        "out_of_bounds_errors": out_of_bounds,
        "occupancy_mismatch_errors": occupancy_errors,
    }


def validate_characters(character_results: dict[str, Any], target_character: str | None = None) -> dict[str, Any]:
    checked_chars = []
    empty_frame_errors = 0
    master_mismatch_errors = 0
    sit_clipping_errors = 0
    sequence_order_errors = 0

    for char in character_results["primary_characters"]:
        if target_character and char["display_name"] != target_character:
            continue
        checked_chars.append(char["display_name"])
        for anim_name, anim in char["animations"].items():
            if anim["master_row_match"] and not anim["master_row_match"]["visible_pixel_exact"]:
                master_mismatch_errors += 1
            if anim["non_empty_frames"] != anim["frame_count"]:
                empty_frame_errors += 1
            if anim_name in {"idle", "idle_anim", "run"}:
                dirs = [s["direction"] for s in anim["sequences"]]
                if dirs != ["right", "up", "left", "down"]:
                    sequence_order_errors += 1
            if anim_name in {"sit", "sit2"}:
                # Verify 32x32 frame cells leave horizontal breathing room (no clipped left/right borders)
                for f in anim["frames"]:
                    if f["touches_left_edge"] or f["touches_right_edge"]:
                        sit_clipping_errors += 1

    passed = (
        len(checked_chars) > 0
        and empty_frame_errors == 0
        and master_mismatch_errors == 0
        and sit_clipping_errors == 0
        and sequence_order_errors == 0
    )
    return {
        "characters_checked": checked_chars,
        "passed": passed,
        "empty_frame_errors": empty_frame_errors,
        "master_strip_mismatch_errors": master_mismatch_errors,
        "sit_frame_clipping_errors": sit_clipping_errors,
        "sequence_order_errors": sequence_order_errors,
    }


def validate_contact_sheets(sheet_paths: list[str]) -> dict[str, Any]:
    failures: list[str] = []
    dims: dict[str, str] = {}
    for p_str in sheet_paths:
        p = Path(p_str)
        if not p.exists() or p.stat().st_size == 0:
            failures.append(p_str)
            continue
        try:
            with Image.open(p) as im:
                im.verify()
            with Image.open(p) as im2:
                dims[p.name] = f"{im2.width}x{im2.height}"
                if im2.width < 100 or im2.height < 60:
                    failures.append(p_str)
        except Exception:
            failures.append(p_str)
    return {
        "passed": len(failures) == 0 and len(sheet_paths) > 0,
        "contact_sheets_checked": len(sheet_paths),
        "failures": failures,
        "dimensions": dims,
    }


def validate_exclusions_and_immutability(
    assets_dir: Path,
    hashes_before: dict[str, str],
    catalog: dict[str, Any],
    output_dir: Path,
) -> dict[str, Any]:
    hashes_after = snapshot_source_hashes(assets_dir)
    originals_unchanged = hashes_before == hashes_after

    gather_in_catalog = [
        e["source_file"]
        for e in catalog["entries"]
        if any(e["source_file"].endswith(f"/{g}") for g in GATHER_REFERENCE_FILES)
    ]
    overview_in_catalog = [
        e["source_file"]
        for e in catalog["entries"]
        if e["source_file"].endswith("/free_overview.png")
    ]
    gather_files_copied = [
        p.as_posix()
        for p in output_dir.rglob("*")
        if p.is_file() and p.name in GATHER_REFERENCE_FILES
    ]
    return {
        "passed": (
            originals_unchanged
            and not gather_in_catalog
            and not overview_in_catalog
            and not gather_files_copied
        ),
        "source_files_verified_unchanged": len(hashes_after),
        "originals_unchanged": originals_unchanged,
        "gather_screenshots_excluded_from_catalog": len(gather_in_catalog) == 0,
        "free_overview_excluded_from_extraction": len(overview_in_catalog) == 0,
        "gather_screenshots_absent_from_output": len(gather_files_copied) == 0,
    }
