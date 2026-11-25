"""Phase 2C: Character spritesheet and animation sequence analyzer."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from config import (
    CHARACTER_NAMES,
    CHARACTER_STRIP_SCHEMAS,
    RPGMAKER_MV_CHARACTERS,
    RPGMAKER_MV_DIRECTIONS,
)


def _inspect_frame(arr: np.ndarray, x: int, y: int, fw: int, fh: int) -> dict[str, Any]:
    cell = arr[y : y + fh, x : x + fw]
    alpha = cell[:, :, 3]
    mask = alpha > 0
    non_empty = bool(mask.any())
    if not non_empty:
        return {
            "x": x,
            "y": y,
            "width": fw,
            "height": fh,
            "non_empty": False,
            "opaque_pixels": 0,
            "content_bbox": None,
            "touches_left_edge": False,
            "touches_right_edge": False,
            "touches_top_edge": False,
            "touches_bottom_edge": False,
        }
    ys, xs = np.where(mask)
    min_x, max_x = int(xs.min()), int(xs.max())
    min_y, max_y = int(ys.min()), int(ys.max())
    return {
        "x": x,
        "y": y,
        "width": fw,
        "height": fh,
        "non_empty": True,
        "opaque_pixels": int(mask.sum()),
        "content_bbox": {
            "x": min_x,
            "y": min_y,
            "width": max_x - min_x + 1,
            "height": max_y - min_y + 1,
        },
        "touches_left_edge": min_x == 0,
        "touches_right_edge": max_x == fw - 1,
        "touches_top_edge": min_y == 0,
        "touches_bottom_edge": max_y == fh - 1,
    }


def analyze_character_strips(assets_dir: Path, characters: list[str] | None = None) -> dict[str, Any]:
    """Analyze Characters_free composite masters, individual strips, RPG Maker MV, and Old characters."""
    chars = characters if characters is not None else CHARACTER_NAMES
    character_entries: list[dict[str, Any]] = []
    all_sequences: list[dict[str, Any]] = []

    for char in chars:
        master_rel = f"Characters_free/{char}_16x16.png"
        master_path = assets_dir / master_rel
        master_arr = np.array(Image.open(master_path).convert("RGBA")) if master_path.exists() else None
        master_dims = (
            {"width": int(master_arr.shape[1]), "height": int(master_arr.shape[0])}
            if master_arr is not None
            else None
        )

        animations: dict[str, Any] = {}
        for anim_name, schema in CHARACTER_STRIP_SCHEMAS.items():
            strip_rel = f"Characters_free/{char}_{anim_name}_16x16.png"
            strip_path = assets_dir / strip_rel
            if not strip_path.exists():
                continue
            arr = np.array(Image.open(strip_path).convert("RGBA"))
            sh, sw = arr.shape[:2]
            fw, fh = schema["frame_width"], schema["frame_height"]
            expected_frames = schema["total_frames"]
            actual_cols = sw // fw
            if sw % fw != 0 or sh != fh or actual_cols != expected_frames:
                raise ValueError(
                    f"Unexpected dimensions for {strip_rel}: {sw}x{sh} vs {expected_frames}x({fw}x{fh})"
                )

            frames_meta = [_inspect_frame(arr, i * fw, 0, fw, fh) for i in range(actual_cols)]
            non_empty_count = sum(1 for f in frames_meta if f["non_empty"])

            # Verify visible pixel match against composite master row
            master_match = None
            if master_arr is not None:
                row_y = schema["row_in_master"] * 32
                row_slice = master_arr[row_y : row_y + fh, :sw]
                vis_diff = int(
                    (
                        ((row_slice != arr).any(axis=2))
                        & ((row_slice[:, :, 3] > 0) | (arr[:, :, 3] > 0))
                    ).sum()
                )
                master_match = {
                    "master_file": master_rel,
                    "row_index": schema["row_in_master"],
                    "y_offset": row_y,
                    "visible_pixel_exact": vis_diff == 0,
                    "visible_diff_pixels": vis_diff,
                }

            seq_list = []
            for seq in schema["sequences"]:
                seq_key = f"{char.lower()}_{anim_name}_{seq['direction']}"
                seq_obj = {
                    "animation_key": seq_key,
                    "character": char,
                    "action": anim_name,
                    "direction": seq["direction"],
                    "source_strip": strip_rel,
                    "source_master": master_rel if master_arr is not None else None,
                    "master_row_index": schema["row_in_master"],
                    "frame_width": fw,
                    "frame_height": fh,
                    "frames": seq["frames"],
                    "frame_count": len(seq["frames"]),
                    "frame_rate": schema["frame_rate"],
                    "repeat": schema["repeat"],
                    "all_frames_non_empty": all(frames_meta[idx]["non_empty"] for idx in seq["frames"]),
                }
                seq_list.append(seq_obj)
                all_sequences.append(seq_obj)

            animations[anim_name] = {
                "strip_file": strip_rel,
                "dimensions": {"width": sw, "height": sh},
                "frame_width": fw,
                "frame_height": fh,
                "frame_count": actual_cols,
                "non_empty_frames": non_empty_count,
                "master_row_match": master_match,
                "notes": schema.get("notes"),
                "sequences": seq_list,
                "frames": frames_meta,
            }

        character_entries.append(
            {
                "character_id": char.lower(),
                "display_name": char,
                "asset_group": "Characters_free",
                "license_ref": "free_pack_non_commercial",
                "master_sheet": {
                    "source_file": master_rel,
                    "dimensions": master_dims,
                    "rows": 7,
                    "row_layout": [
                        {"row": 0, "action": "idle", "frame_size": "16x32", "frames": 4},
                        {"row": 1, "action": "idle_anim", "frame_size": "16x32", "frames": 24},
                        {"row": 2, "action": "run", "frame_size": "16x32", "frames": 24},
                        {"row": 3, "action": "sit", "frame_size": "32x32", "frames": 12},
                        {"row": 4, "action": "sit2", "frame_size": "32x32", "frames": 12},
                        {"row": 5, "action": "sit3", "frame_size": "16x32", "frames": 12},
                        {"row": 6, "action": "phone", "frame_size": "16x32", "frames": 9},
                    ],
                },
                "animations": animations,
            }
        )

    # Analyze Characters_free/RPGMAKERMV/Characters_MV.png
    mv_rel = "Characters_free/RPGMAKERMV/Characters_MV.png"
    mv_path = assets_dir / mv_rel
    mv_info = None
    if mv_path.exists():
        mv_arr = np.array(Image.open(mv_path).convert("RGBA"))
        mh, mw = mv_arr.shape[:2]
        fw, fh = 48, 96
        mv_chars = []
        for idx, cname in enumerate(RPGMAKER_MV_CHARACTERS):
            col_offset = idx * 3
            char_seqs = []
            for d_idx, direction in enumerate(RPGMAKER_MV_DIRECTIONS):
                frame_indices = [d_idx * 12 + col_offset + step for step in range(3)]
                non_empty = all(
                    _inspect_frame(mv_arr, (col_offset + step) * fw, d_idx * fh, fw, fh)["non_empty"]
                    for step in range(3)
                )
                seq_obj = {
                    "animation_key": f"{cname.lower()}_mv_walk_{direction}",
                    "character": cname,
                    "action": "mv_walk",
                    "direction": direction,
                    "source_strip": mv_rel,
                    "frame_width": fw,
                    "frame_height": fh,
                    "frames": frame_indices,
                    "frame_count": 3,
                    "frame_rate": 8,
                    "repeat": -1,
                    "all_frames_non_empty": non_empty,
                }
                char_seqs.append(seq_obj)
                all_sequences.append(seq_obj)
            mv_chars.append({"character": cname, "block_col": idx, "sequences": char_seqs})
        bottom_half_empty = not bool((mv_arr[384:, :, 3] > 0).any())
        mv_info = {
            "source_file": mv_rel,
            "dimensions": {"width": mw, "height": mh},
            "frame_width": fw,
            "frame_height": fh,
            "columns": mw // fw,
            "rows": mh // fh,
            "active_rows": 4,
            "bottom_half_empty": bottom_half_empty,
            "license_ref": "free_pack_non_commercial",
            "characters": mv_chars,
        }

    # Analyze Old/ legacy character sheets (Character 2 across 16/32/48)
    legacy_characters: list[dict[str, Any]] = []
    for scale in (16, 32, 48):
        fw, fh = scale, scale * 2
        idle_rel = f"Old/idle_{scale}x{scale}_2.png"
        run_rel = f"Old/run_horizontal_{scale}x{scale}_2.png"
        mv_old_rel = f"Old/mv/Character_2_{scale}x{scale}_RPGMAKER.png"
        entry: dict[str, Any] = {
            "character_id": f"legacy_char2_{scale}x{scale}",
            "scale": f"{scale}x{scale}",
            "frame_width": fw,
            "frame_height": fh,
            "license_ref": "unverified_legacy_provenance",
            "sheets": {},
        }
        if (assets_dir / idle_rel).exists():
            arr = np.array(Image.open(assets_dir / idle_rel).convert("RGBA"))
            seqs = []
            for idx, d in enumerate(("right", "up", "left", "down")):
                s = {
                    "animation_key": f"legacy_char2_{scale}_idle_{d}",
                    "character": "LegacyCharacter2",
                    "action": "idle",
                    "direction": d,
                    "source_strip": idle_rel,
                    "frame_width": fw,
                    "frame_height": fh,
                    "frames": [idx],
                    "frame_count": 1,
                    "frame_rate": 4,
                    "repeat": -1,
                    "all_frames_non_empty": _inspect_frame(arr, idx * fw, 0, fw, fh)["non_empty"],
                }
                seqs.append(s)
                if scale == 16:
                    all_sequences.append(s)
            entry["sheets"]["idle"] = {"source_file": idle_rel, "sequences": seqs}
        if (assets_dir / run_rel).exists():
            arr = np.array(Image.open(assets_dir / run_rel).convert("RGBA"))
            seqs = []
            for idx, d in enumerate(("right", "up", "left", "down")):
                f_idx = list(range(idx * 6, (idx + 1) * 6))
                s = {
                    "animation_key": f"legacy_char2_{scale}_run_{d}",
                    "character": "LegacyCharacter2",
                    "action": "run",
                    "direction": d,
                    "source_strip": run_rel,
                    "frame_width": fw,
                    "frame_height": fh,
                    "frames": f_idx,
                    "frame_count": 6,
                    "frame_rate": 10,
                    "repeat": -1,
                    "all_frames_non_empty": all(
                        _inspect_frame(arr, k * fw, 0, fw, fh)["non_empty"] for k in f_idx
                    ),
                }
                seqs.append(s)
                if scale == 16:
                    all_sequences.append(s)
            entry["sheets"]["run"] = {"source_file": run_rel, "sequences": seqs}
        if (assets_dir / mv_old_rel).exists():
            arr = np.array(Image.open(assets_dir / mv_old_rel).convert("RGBA"))
            seqs = []
            for d_idx, d in enumerate(RPGMAKER_MV_DIRECTIONS):
                f_idx = [d_idx * 3 + step for step in range(3)]
                s = {
                    "animation_key": f"legacy_char2_{scale}_mv_walk_{d}",
                    "character": "LegacyCharacter2",
                    "action": "mv_walk",
                    "direction": d,
                    "source_strip": mv_old_rel,
                    "frame_width": fw,
                    "frame_height": fh,
                    "frames": f_idx,
                    "frame_count": 3,
                    "frame_rate": 8,
                    "repeat": -1,
                    "all_frames_non_empty": all(
                        _inspect_frame(arr, step * fw, d_idx * fh, fw, fh)["non_empty"] for step in range(3)
                    ),
                }
                seqs.append(s)
                if scale == 16:
                    all_sequences.append(s)
            entry["sheets"]["rpgmaker_mv"] = {"source_file": mv_old_rel, "sequences": seqs}
        legacy_characters.append(entry)

    return {
        "primary_characters": character_entries,
        "rpgmaker_mv_sheet": mv_info,
        "legacy_characters": legacy_characters,
        "total_primary_sequences": sum(
            len(seq_group["sequences"])
            for c in character_entries
            for seq_group in c["animations"].values()
        ),
        "total_mv_sequences": sum(len(c["sequences"]) for c in mv_info["characters"]) if mv_info else 0,
        "total_sequences_cataloged": len(all_sequences),
        "all_sequences": all_sequences,
    }
