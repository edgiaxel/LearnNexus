"""Phase 2A: Alpha-channel transparency segmentation with edge-case detection."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from config import SEGMENTATION_THRESHOLDS


def segment_sprite_sheet(
    image_path: Path,
    relative_source: str,
    tile_size: int,
    prefix: str,
    extract_dir: Path | None = None,
    overlay_path: Path | None = None,
) -> dict[str, Any]:
    """Segment separated sprites by alpha connected components without blind merging/splitting."""
    with Image.open(image_path) as im:
        rgba = im.convert("RGBA")
        arr = np.array(rgba)

    height, width = arr.shape[:2]
    alpha = arr[:, :, 3]
    mask = alpha > 0

    # 8-connectivity keeps diagonal pixel-art outlines intact
    structure = np.ones((3, 3), dtype=np.int8)
    labeled, num_components = ndimage.label(mask, structure=structure)
    slices = ndimage.find_objects(labeled)

    scale = tile_size / 16.0
    tiny_side = int(round(SEGMENTATION_THRESHOLDS["tiny_min_side_16"] * scale))
    tiny_area = int(round(SEGMENTATION_THRESHOLDS["tiny_min_area_16"] * (scale**2)))
    oversized_px = SEGMENTATION_THRESHOLDS["oversized_tiles"] * tile_size
    close_gap_px = int(round(SEGMENTATION_THRESHOLDS["close_gap_16"] * scale))

    raw_items: list[dict[str, Any]] = []
    for cid, sl in enumerate(slices, start=1):
        ys, xs = sl
        x0, y0, x1, y1 = int(xs.start), int(ys.start), int(xs.stop), int(ys.stop)
        w, h = x1 - x0, y1 - y0
        comp_mask = labeled[sl] == cid
        area = int(comp_mask.sum())
        comp_alpha = alpha[sl][comp_mask]
        semi_count = int(((comp_alpha > 0) & (comp_alpha < 255)).sum())

        tile_col_start = x0 // tile_size
        tile_row_start = y0 // tile_size
        tile_col_end = (x1 - 1) // tile_size
        tile_row_end = (y1 - 1) // tile_size
        tile_w = tile_col_end - tile_col_start + 1
        tile_h = tile_row_end - tile_row_start + 1

        extends_beyond_tile_grid = (
            (x0 % tile_size != 0)
            or (y0 % tile_size != 0)
            or (x1 % tile_size != 0)
            or (y1 % tile_size != 0)
        )

        raw_items.append(
            {
                "component_index": cid,
                "asset_id": f"{prefix}_{cid:04d}",
                "source_file": relative_source,
                "bbox": {"x": x0, "y": y0, "width": w, "height": h, "x2": x1, "y2": y1},
                "pixel_area": area,
                "fill_ratio": round(area / float(w * h), 4),
                "semi_transparent_pixels": semi_count,
                "tile_bounds": {
                    "col_start": tile_col_start,
                    "row_start": tile_row_start,
                    "col_end": tile_col_end,
                    "row_end": tile_row_end,
                    "span_cols": tile_w,
                    "span_rows": tile_h,
                },
                "extends_beyond_tile_alignment": extends_beyond_tile_grid,
                "edge_cases": [],
                "overlapping_neighbors": [],
                "close_neighbors": [],
            }
        )

    # Pairwise spatial checks: overlapping bounding boxes & closely-spaced disconnected parts
    for i in range(len(raw_items)):
        a = raw_items[i]
        ab = a["bbox"]
        at = a["tile_bounds"]
        for j in range(i + 1, len(raw_items)):
            b = raw_items[j]
            bb = b["bbox"]
            bt = b["tile_bounds"]

            dx = max(0, max(ab["x"] - bb["x2"], bb["x"] - ab["x2"]))
            dy = max(0, max(ab["y"] - bb["y2"], bb["y"] - ab["y2"]))

            # Strict bounding-box overlap (dx == 0 and dy == 0 and strictly intersecting)
            inter_x = min(ab["x2"], bb["x2"]) - max(ab["x"], bb["x"])
            inter_y = min(ab["y2"], bb["y2"]) - max(ab["y"], bb["y"])
            if inter_x > 0 and inter_y > 0:
                a["overlapping_neighbors"].append(b["asset_id"])
                b["overlapping_neighbors"].append(a["asset_id"])
            elif dx <= close_gap_px and dy <= close_gap_px:
                share_tile = not (
                    at["col_end"] < bt["col_start"]
                    or bt["col_end"] < at["col_start"]
                    or at["row_end"] < bt["row_start"]
                    or bt["row_end"] < at["row_start"]
                )
                if share_tile:
                    a["close_neighbors"].append(b["asset_id"])
                    b["close_neighbors"].append(a["asset_id"])

    # Assign edge-case flags and review status; extract masked PNGs
    if extract_dir is not None:
        (extract_dir / "clean").mkdir(parents=True, exist_ok=True)
        (extract_dir / "ambiguous").mkdir(parents=True, exist_ok=True)

    clean_count = 0
    ambiguous_count = 0

    for item in raw_items:
        cid = item["component_index"]
        b = item["bbox"]
        flags: list[str] = []

        if min(b["width"], b["height"]) <= tiny_side or item["pixel_area"] <= tiny_area:
            flags.append("tiny_component_possible_fragment")
        if b["width"] > oversized_px or b["height"] > oversized_px:
            flags.append("oversized_possible_touching_objects")
        if item["overlapping_neighbors"]:
            flags.append("overlapping_bbox_with_neighbor")
        if item["close_neighbors"]:
            flags.append("close_disconnected_part_same_tile")
        if item["semi_transparent_pixels"] > 0:
            flags.append("contains_semi_transparent_pixels")

        item["edge_cases"] = flags
        is_ambiguous = bool(
            set(flags)
            & {
                "tiny_component_possible_fragment",
                "oversized_possible_touching_objects",
                "overlapping_bbox_with_neighbor",
                "close_disconnected_part_same_tile",
            }
        )
        item["review_status"] = "needs_review" if is_ambiguous else "auto_extracted_pending_naming"
        item["is_ambiguous"] = is_ambiguous
        if is_ambiguous:
            ambiguous_count += 1
        else:
            clean_count += 1

        # Extract exact masked RGBA region so overlapping neighbors never leak pixels
        if extract_dir is not None:
            sl = slices[cid - 1]
            sub = arr[sl].copy()
            comp_mask = labeled[sl] == cid
            sub[~comp_mask] = 0
            subdir = "ambiguous" if is_ambiguous else "clean"
            out_file = extract_dir / subdir / f"{item['asset_id']}.png"
            Image.fromarray(sub, mode="RGBA").save(out_file)
            item["extracted_file"] = out_file.as_posix()
        else:
            item["extracted_file"] = None

    if overlay_path is not None:
        _render_bbox_overlay(rgba, raw_items, overlay_path)

    return {
        "source_file": relative_source,
        "dimensions": {"width": width, "height": height},
        "tile_size": tile_size,
        "total_components": num_components,
        "clean_components": clean_count,
        "ambiguous_components": ambiguous_count,
        "total_non_transparent_pixels": int(mask.sum()),
        "extracted_pixel_sum": sum(it["pixel_area"] for it in raw_items),
        "overlay_image": overlay_path.as_posix() if overlay_path else None,
        "components": raw_items,
    }


def _render_bbox_overlay(source_rgba: Image.Image, items: list[dict[str, Any]], out_path: Path) -> None:
    """Render source sheet over checkerboard with numbered bounding boxes (green=clean, red=ambiguous)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    w, h = source_rgba.size
    # Checkerboard background
    checker = Image.new("RGBA", (w, h), (235, 232, 224, 255))
    c_arr = np.array(checker)
    tile = 12
    yy, xx = np.indices((h, w))
    alt = ((yy // tile) + (xx // tile)) % 2 == 1
    c_arr[alt] = [215, 211, 202, 255]
    base = Image.fromarray(c_arr, mode="RGBA")
    base.alpha_composite(source_rgba)

    draw = ImageDraw.Draw(base)
    for it in items:
        b = it["bbox"]
        color = (220, 48, 48, 255) if it["is_ambiguous"] else (36, 138, 61, 255)
        draw.rectangle([b["x"], b["y"], b["x2"] - 1, b["y2"] - 1], outline=color, width=1)
        label = str(it["component_index"])
        tx, ty = b["x"] + 1, max(0, b["y"] + 1)
        draw.rectangle([tx - 1, ty - 1, tx + len(label) * 6 + 1, ty + 10], fill=(25, 28, 34, 205))
        draw.text((tx, ty), label, fill=(255, 255, 255, 255))

    base.save(out_path)
