"""Phase 2B: Configurable grid-based tileset analysis and optional cell slicing."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from config import ROOM_BUILDER_REGIONS


def _lookup_room_builder_region(col: int, row: int) -> dict[str, Any] | None:
    for region in ROOM_BUILDER_REGIONS:
        if (
            region["col_start"] <= col <= region["col_end"]
            and region["row_start"] <= row <= region["row_end"]
        ):
            return region
    return None


def analyze_tileset_grid(
    image_path: Path,
    relative_source: str,
    tile_width: int,
    tile_height: int,
    tileset_id: str,
    is_room_builder: bool = False,
    extract_cells_dir: Path | None = None,
    grid_preview_path: Path | None = None,
) -> dict[str, Any]:
    """Analyze a regular tileset grid, preserving source sheet and recording exact tile coords."""
    with Image.open(image_path) as im:
        rgba = im.convert("RGBA")
        arr = np.array(rgba)

    height, width = arr.shape[:2]
    if width % tile_width != 0 or height % tile_height != 0:
        raise ValueError(
            f"Tileset {relative_source} ({width}x{height}) is not divisible by {tile_width}x{tile_height}"
        )

    cols = width // tile_width
    rows = height // tile_height
    alpha = arr[:, :, 3]

    if extract_cells_dir is not None:
        extract_cells_dir.mkdir(parents=True, exist_ok=True)

    tiles: list[dict[str, Any]] = []
    occupied_count = 0
    excluded_annotation_count = 0
    category_counts: dict[str, int] = {}

    for row in range(rows):
        for col in range(cols):
            tid = row * cols + col
            x = col * tile_width
            y = row * tile_height
            cell_alpha = alpha[y : y + tile_height, x : x + tile_width]
            opaque = int((cell_alpha == 255).sum())
            semi = int(((cell_alpha > 0) & (cell_alpha < 255)).sum())
            non_empty = (opaque + semi) > 0

            region = _lookup_room_builder_region(col, row) if is_room_builder else None
            exclude = bool(region and region["exclude_from_game"])
            category = region["category"] if region else ("empty" if not non_empty else "unclassified_tile")
            region_name = region["name"] if region else None

            if non_empty:
                occupied_count += 1
            if non_empty and exclude:
                excluded_annotation_count += 1
            if non_empty and not exclude:
                category_counts[category] = category_counts.get(category, 0) + 1

            extracted_path = None
            if extract_cells_dir is not None and non_empty and not exclude:
                out_tile = extract_cells_dir / f"{tileset_id}_r{row:02d}_c{col:02d}_t{tid:04d}.png"
                Image.fromarray(arr[y : y + tile_height, x : x + tile_width], mode="RGBA").save(out_tile)
                extracted_path = out_tile.as_posix()

            tiles.append(
                {
                    "tile_index": tid,
                    "col": col,
                    "row": row,
                    "x": x,
                    "y": y,
                    "width": tile_width,
                    "height": tile_height,
                    "non_empty": non_empty,
                    "opaque_pixels": opaque,
                    "semi_transparent_pixels": semi,
                    "category": category,
                    "region": region_name,
                    "exclude_from_game": exclude,
                    "extracted_file": extracted_path,
                }
            )

    if grid_preview_path is not None:
        _render_grid_preview(rgba, tiles, tile_width, tile_height, cols, rows, grid_preview_path)

    usable_occupied = occupied_count - excluded_annotation_count
    return {
        "tileset_id": tileset_id,
        "source_file": relative_source,
        "dimensions": {"width": width, "height": height},
        "tile_width": tile_width,
        "tile_height": tile_height,
        "columns": cols,
        "rows": rows,
        "total_cells": cols * rows,
        "occupied_cells": occupied_count,
        "usable_game_tiles": usable_occupied,
        "excluded_annotation_tiles": excluded_annotation_count,
        "empty_cells": (cols * rows) - occupied_count,
        "category_tile_counts": category_counts,
        "semantic_regions": ROOM_BUILDER_REGIONS if is_room_builder else [],
        "grid_preview_image": grid_preview_path.as_posix() if grid_preview_path else None,
        "tiles": tiles,
    }


def _render_grid_preview(
    source_rgba: Image.Image,
    tiles: list[dict[str, Any]],
    tile_w: int,
    tile_h: int,
    cols: int,
    rows: int,
    out_path: Path,
) -> None:
    """Render tileset over checkerboard with crisp integer scaling, grid lines, and tile indices."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Upscale 16x16 sheets by 3x so indices remain legible without blurring pixels
    scale = 3 if tile_w <= 16 else (2 if tile_w <= 32 else 1)
    scaled_img = (
        source_rgba.resize((source_rgba.width * scale, source_rgba.height * scale), Image.Resampling.NEAREST)
        if scale > 1
        else source_rgba
    )
    sw, sh = scaled_img.size
    header_h = 28
    canvas = Image.new("RGBA", (sw, sh + header_h), (247, 244, 236, 255))

    # Checkerboard inside image region
    c_arr = np.full((sh, sw, 4), [235, 232, 224, 255], dtype=np.uint8)
    yy, xx = np.indices((sh, sw))
    alt = ((yy // 8) + (xx // 8)) % 2 == 1
    c_arr[alt] = [215, 211, 202, 255]
    checker = Image.fromarray(c_arr, mode="RGBA")
    checker.alpha_composite(scaled_img)
    canvas.paste(checker, (0, header_h))

    draw = ImageDraw.Draw(canvas)
    draw.text(
        (8, 8),
        f"Grid {cols}x{rows} | Tile {tile_w}x{tile_h}px | Display {scale}x nearest | Red=excluded annotation",
        fill=(48, 52, 59, 255),
    )

    tw = tile_w * scale
    th = tile_h * scale
    for t in tiles:
        x0 = t["col"] * tw
        y0 = header_h + t["row"] * th
        x1 = x0 + tw - 1
        y1 = y0 + th - 1
        if t["exclude_from_game"] and t["non_empty"]:
            draw.rectangle([x0, y0, x1, y1], outline=(220, 48, 48, 255), width=2)
            draw.line([x0, y0, x1, y1], fill=(220, 48, 48, 180), width=1)
        elif t["non_empty"]:
            draw.rectangle([x0, y0, x1, y1], outline=(90, 110, 95, 160), width=1)
            label = str(t["tile_index"])
            draw.rectangle([x0 + 1, y0 + 1, x0 + len(label) * 6 + 3, y0 + 11], fill=(25, 28, 34, 170))
            draw.text((x0 + 2, y0 + 1), label, fill=(255, 255, 255, 255))
        else:
            draw.rectangle([x0, y0, x1, y1], outline=(180, 178, 172, 100), width=1)

    canvas.save(out_path)
