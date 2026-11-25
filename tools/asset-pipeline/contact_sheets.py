"""Phase 3: Visual review contact sheet generation with checkerboard backgrounds."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw


def _make_checkerboard(width: int, height: int, tile: int = 8) -> Image.Image:
    arr = np.full((height, width, 4), [236, 233, 226, 255], dtype=np.uint8)
    yy, xx = np.indices((height, width))
    alt = ((yy // tile) + (xx // tile)) % 2 == 1
    arr[alt] = [214, 210, 201, 255]
    return Image.fromarray(arr, mode="RGBA")


def _fit_integer_or_exact(sprite: Image.Image, max_w: int, max_h: int, upscale_small: bool = False) -> tuple[Image.Image, str]:
    """Preserve exact aspect ratio and crisp pixels. Only downscale if wider/taller than card slot."""
    w, h = sprite.size
    if w <= max_w and h <= max_h:
        if upscale_small and w * 2 <= max_w and h * 2 <= max_h and max(w, h) <= 48:
            scale = 2
            return sprite.resize((w * scale, h * scale), Image.Resampling.NEAREST), f"{scale}x"
        return sprite, "1x"
    # Never distort aspect ratio; fit cleanly with nearest-neighbor so pixel boundaries remain legible
    ratio = min(max_w / w, max_h / h)
    nw = max(1, int(round(w * ratio)))
    nh = max(1, int(round(h * ratio)))
    return sprite.resize((nw, nh), Image.Resampling.NEAREST), f"{ratio:.2f}x"


def generate_sprite_contact_sheets(
    components: list[dict[str, Any]],
    source_name: str,
    title_prefix: str,
    output_dir: Path,
    file_prefix: str,
    ambiguous_mode: bool = False,
    cols: int = 6,
    per_page: int = 36,
) -> list[str]:
    """Generate paginated checkerboard contact sheets for extracted sprites."""
    output_dir.mkdir(parents=True, exist_ok=True)
    if not components:
        return []

    card_w = 248 if ambiguous_mode else 224
    card_h = 286 if ambiguous_mode else 264
    preview_w = card_w - 20
    preview_h = 196
    pad = 12
    header_h = 44

    generated: list[str] = []
    total_pages = math.ceil(len(components) / per_page)

    for page_idx in range(total_pages):
        chunk = components[page_idx * per_page : (page_idx + 1) * per_page]
        rows = math.ceil(len(chunk) / cols)
        sheet_w = cols * card_w + (cols + 1) * pad
        sheet_h = header_h + rows * card_h + (rows + 1) * pad

        canvas = Image.new("RGBA", (sheet_w, sheet_h), (247, 244, 236, 255))
        draw = ImageDraw.Draw(canvas)

        # Header bar
        draw.rectangle([0, 0, sheet_w, header_h], fill=(235, 231, 220, 255))
        draw.line([0, header_h - 1, sheet_w, header_h - 1], fill=(195, 190, 178, 255), width=1)
        draw.text(
            (pad, 8),
            f"{title_prefix} - Page {page_idx + 1}/{total_pages} ({len(chunk)} items)",
            fill=(48, 52, 59, 255),
        )
        draw.text(
            (pad, 24),
            f"Source: {source_name} | Background: transparency checkerboard | Aspect ratio preserved",
            fill=(95, 100, 108, 255),
        )

        for idx, item in enumerate(chunk):
            r = idx // cols
            c = idx % cols
            x0 = pad + c * (card_w + pad)
            y0 = header_h + pad + r * (card_h + pad)
            border_color = (205, 65, 65, 255) if ambiguous_mode else (188, 198, 182, 255)

            # Card surface
            draw.rectangle([x0, y0, x0 + card_w - 1, y0 + card_h - 1], fill=(255, 255, 255, 255), outline=border_color, width=1)

            # Checkerboard preview box
            px0 = x0 + 10
            py0 = y0 + 10
            checker = _make_checkerboard(preview_w, preview_h, tile=8)
            sprite_path = Path(item["extracted_file"])
            with Image.open(sprite_path) as sp:
                sp_rgba = sp.convert("RGBA")
                fitted, scale_lbl = _fit_integer_or_exact(sp_rgba, preview_w - 4, preview_h - 4, upscale_small=False)
                ox = (preview_w - fitted.width) // 2
                oy = (preview_h - fitted.height) // 2
                checker.alpha_composite(fitted, dest=(ox, oy))
            canvas.paste(checker, (px0, py0))
            draw.rectangle([px0, py0, px0 + preview_w - 1, py0 + preview_h - 1], outline=(210, 206, 198, 255), width=1)

            # Labels
            b = item["bbox"]
            ty = py0 + preview_h + 6
            draw.text((px0, ty), f"{item['asset_id']}  [{scale_lbl}]", fill=(35, 39, 46, 255))
            draw.text(
                (px0, ty + 14),
                f"{b['width']}x{b['height']}px  @ ({b['x']},{b['y']})",
                fill=(90, 96, 104, 255),
            )
            draw.text(
                (px0, ty + 28),
                f"tiles: {item['tile_bounds']['span_cols']}x{item['tile_bounds']['span_rows']}  src: {Path(source_name).name}",
                fill=(110, 115, 122, 255),
            )
            if ambiguous_mode:
                tags = ", ".join(ec.replace("_possible_", ":").replace("_", " ") for ec in item["edge_cases"][:2])
                draw.text((px0, ty + 44), f"FLAG: {tags[:34]}", fill=(185, 42, 42, 255))
                if len(item["edge_cases"]) > 2:
                    draw.text((px0, ty + 58), f"+{len(item['edge_cases']) - 2} more flags", fill=(185, 42, 42, 255))

        suffix = f"_p{page_idx + 1:02d}" if total_pages > 1 else ""
        out_path = output_dir / f"{file_prefix}{suffix}.png"
        canvas.save(out_path)
        generated.append(out_path.as_posix())

    return generated


def generate_character_contact_sheet(
    assets_dir: Path,
    character_data: dict[str, Any],
    out_path: Path,
    scale: int = 2,
) -> str:
    """Generate a checkerboard contact sheet showing every character's animation strips with frame boundaries."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pad = 16
    row_h = 32 * scale + 36
    header_h = 44

    rows_to_draw: list[tuple[str, Path, int, int, str]] = []
    for char in character_data["primary_characters"]:
        for anim_name, anim in char["animations"].items():
            dirs = "/".join(s["direction"] for s in anim["sequences"])
            label = (
                f"{char['display_name']} | {anim_name} | {anim['frame_count']}f @ "
                f"{anim['frame_width']}x{anim['frame_height']}px | dirs: {dirs} | src: {Path(anim['strip_file']).name}"
            )
            rows_to_draw.append(
                (label, assets_dir / anim["strip_file"], anim["frame_width"], anim["frame_height"], anim_name)
            )

    max_strip_w = max(Image.open(r[1]).width * scale for r in rows_to_draw) if rows_to_draw else 768
    sheet_w = max(max_strip_w + pad * 2, 860)
    sheet_h = header_h + len(rows_to_draw) * row_h + pad

    canvas = Image.new("RGBA", (sheet_w, sheet_h), (247, 244, 236, 255))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, sheet_w, header_h], fill=(235, 231, 220, 255))
    draw.text(
        (pad, 8),
        f"Characters_free Animation Contact Sheet ({len(rows_to_draw)} strips) - Nearest {scale}x",
        fill=(48, 52, 59, 255),
    )
    draw.text(
        (pad, 24),
        "Cyan boxes mark exact frame boundaries (16x32 standard; 32x32 for sit/sit2 to prevent pixel clipping)",
        fill=(95, 100, 108, 255),
    )

    y = header_h + 8
    for label, img_path, fw, fh, _ in rows_to_draw:
        draw.text((pad, y), label, fill=(48, 52, 59, 255))
        with Image.open(img_path) as im:
            rgba = im.convert("RGBA")
            scaled = rgba.resize((rgba.width * scale, rgba.height * scale), Image.Resampling.NEAREST)
        checker = _make_checkerboard(scaled.width, scaled.height, tile=8)
        checker.alpha_composite(scaled)
        sy = y + 16
        canvas.paste(checker, (pad, sy))
        fw_s, fh_s = fw * scale, fh * scale
        cols = scaled.width // fw_s
        for c in range(cols):
            bx = pad + c * fw_s
            draw.rectangle([bx, sy, bx + fw_s - 1, sy + fh_s - 1], outline=(55, 130, 155, 180), width=1)
            draw.text((bx + 2, sy + 1), str(c), fill=(48, 52, 59, 210))
        y += row_h

    canvas.save(out_path)
    return out_path.as_posix()


def generate_mv_and_legacy_character_sheet(
    assets_dir: Path,
    character_data: dict[str, Any],
    out_path: Path,
) -> str:
    """Generate contact sheet for RPG Maker MV sheet and Old legacy character sheets."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pad = 16
    header_h = 44

    blocks: list[tuple[str, Image.Image, int, int]] = []
    mv = character_data.get("rpgmaker_mv_sheet")
    if mv:
        with Image.open(assets_dir / mv["source_file"]) as im:
            # Crop active top half (576x384) so empty bottom half does not waste contact-sheet space
            top_half = im.convert("RGBA").crop((0, 0, 576, 384))
        blocks.append(
            (
                f"Characters_MV.png (active top half 576x384 of 576x768) | 48x96 frames | Order: Bob, Amelia, Adam, Alex | Rows: down/left/right/up",
                top_half,
                48,
                96,
            )
        )

    for leg in character_data.get("legacy_characters", []):
        if leg["scale"] != "16x16":
            continue
        for key, sheet in leg["sheets"].items():
            with Image.open(assets_dir / sheet["source_file"]) as im:
                rgba = im.convert("RGBA")
                scaled = rgba.resize((rgba.width * 2, rgba.height * 2), Image.Resampling.NEAREST)
            blocks.append(
                (
                    f"Legacy Character 2 ({key}) | src: {sheet['source_file']} | 16x32 native shown 2x nearest",
                    scaled,
                    32,
                    64,
                )
            )

    sheet_w = max((b[1].width for b in blocks), default=600) + pad * 2
    sheet_h = header_h + sum(b[1].height + 36 for b in blocks) + pad

    canvas = Image.new("RGBA", (sheet_w, sheet_h), (247, 244, 236, 255))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, sheet_w, header_h], fill=(235, 231, 220, 255))
    draw.text((pad, 14), "RPG Maker MV & Legacy Character Contact Sheet", fill=(48, 52, 59, 255))

    y = header_h + 10
    for title, img, fw, fh in blocks:
        draw.text((pad, y), title, fill=(48, 52, 59, 255))
        sy = y + 18
        checker = _make_checkerboard(img.width, img.height, tile=8)
        checker.alpha_composite(img)
        canvas.paste(checker, (pad, sy))
        for r in range(img.height // fh):
            for c in range(img.width // fw):
                bx, by = pad + c * fw, sy + r * fh
                draw.rectangle([bx, by, bx + fw - 1, by + fh - 1], outline=(55, 130, 155, 160), width=1)
        y = sy + img.height + 18

    canvas.save(out_path)
    return out_path.as_posix()
