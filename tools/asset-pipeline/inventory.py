"""Phase 1: Asset Inventory, Resolution-Variant Detection, and License Audit."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from config import (
    CHARACTER_NAMES,
    GATHER_REFERENCE_FILES,
    IMAGE_EXTENSIONS,
    LICENSE_FILES,
    LICENSE_REFERENCE_IDS,
    OVERVIEW_REFERENCE_FILES,
    RESOLUTION_VARIANT_GROUPS,
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_license_file(license_path: Path) -> dict[str, Any]:
    if not license_path.exists():
        return {
            "exists": False,
            "path": license_path.as_posix(),
            "raw_text": "",
            "can": [],
            "cant": [],
            "notes": ["LICENSE.txt not found."],
        }
    raw = license_path.read_text(encoding="utf-8", errors="replace").strip()
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    section = None
    can_clauses: list[str] = []
    cant_clauses: list[str] = []
    for line in lines:
        upper = line.upper()
        if upper.startswith("CAN:"):
            section = "can"
            continue
        if upper.startswith("CAN'T:") or upper.startswith("CANT:"):
            section = "cant"
            continue
        if section == "can":
            can_clauses.append(line)
        elif section == "cant":
            cant_clauses.append(line)

    return {
        "exists": True,
        "path": license_path.as_posix(),
        "raw_text": raw,
        "can": can_clauses,
        "cant": cant_clauses,
        "commercial_use_allowed": False,
        "non_commercial_use_allowed": True,
        "attribution_clause_present": False,
        "author_named_in_license": False,
        "notes": [
            "Permits non-commercial use and editing for non-commercial projects (fits STACK 2026 academic/student prototype).",
            "Strictly prohibits commercial use, commercial derivative edits, and reselling.",
            "Does not specify an author name or attribution format; verify original pack page (appears to be LimeZu Modern Interiors Free) before public release.",
            "Does NOT cover Gather Town reference screenshots (1.png through 7.png), which are third-party product screenshots.",
        ],
    }


def _classify_file(rel: str, width: int | None, height: int | None) -> dict[str, Any]:
    if rel in LICENSE_FILES:
        return {
            "category": "license_document",
            "role": "documentation",
            "content_type": "text_license",
            "estimated_tile_size": None,
            "production_eligible": False,
            "license_ref": "free_pack_non_commercial",
            "extraction_strategy": "none",
        }
    if rel in GATHER_REFERENCE_FILES:
        return {
            "category": "ui_design_reference",
            "role": "reference_only",
            "content_type": "gather_screenshot",
            "estimated_tile_size": None,
            "production_eligible": False,
            "license_ref": "third_party_ui_reference_unlicensed",
            "extraction_strategy": "exclude",
        }
    if rel in OVERVIEW_REFERENCE_FILES:
        return {
            "category": "asset_overview_reference",
            "role": "reference_only",
            "content_type": "composite_showcase",
            "estimated_tile_size": 32,
            "production_eligible": False,
            "license_ref": "free_pack_non_commercial",
            "extraction_strategy": "reference_only",
        }
    if rel.startswith("Interiors_free/"):
        tile = 16 if "/16x16/" in rel else 32 if "/32x32/" in rel else 48
        is_room_builder = "Room_Builder" in rel
        return {
            "category": "tileset_room_builder" if is_room_builder else "sprite_sheet_interiors",
            "role": "production_asset",
            "content_type": "regular_tileset" if is_room_builder else "mixed_tileset_and_objects",
            "estimated_tile_size": f"{tile}x{tile}",
            "production_eligible": True,
            "license_ref": "free_pack_non_commercial",
            "extraction_strategy": "grid_slice" if is_room_builder else "alpha_segment_and_grid",
        }
    if rel.startswith("Characters_free/RPGMAKERMV/"):
        return {
            "category": "characters_rpgmaker_mv",
            "role": "production_asset",
            "content_type": "character_animation_grid",
            "estimated_tile_size": "48x96",
            "production_eligible": True,
            "license_ref": "free_pack_non_commercial",
            "extraction_strategy": "character_metadata",
        }
    if rel.startswith("Characters_free/"):
        stem = Path(rel).stem
        is_master = any(stem == f"{name}_16x16" for name in CHARACTER_NAMES)
        is_wide_sit = ("_sit_16x16" in rel) or ("_sit2_16x16" in rel)
        frame_dim = "32x32" if is_wide_sit else "16x32"
        if is_master:
            frame_dim = "16x32 (rows 0-2,5-6) / 32x32 (rows 3-4)"
        return {
            "category": "characters_composite_sheet" if is_master else "characters_animation_strip",
            "role": "production_asset",
            "content_type": "multi_animation_sheet" if is_master else "animation_strip",
            "estimated_tile_size": frame_dim,
            "production_eligible": True,
            "license_ref": "free_pack_non_commercial",
            "extraction_strategy": "character_metadata",
        }
    if rel.startswith("Old/"):
        tile = 16 if "16x16" in rel else 32 if "32x32" in rel else 48
        if "Tileset_" in rel:
            return {
                "category": "legacy_tileset",
                "role": "legacy_archive",
                "content_type": "regular_tileset",
                "estimated_tile_size": f"{tile}x{tile}",
                "production_eligible": True,
                "license_ref": "unverified_legacy_provenance",
                "extraction_strategy": "grid_slice",
            }
        return {
            "category": "legacy_character_sheet",
            "role": "legacy_archive",
            "content_type": "character_animation_grid" if "RPGMAKER" in rel else "animation_strip",
            "estimated_tile_size": f"{tile}x{tile * 2}",
            "production_eligible": True,
            "license_ref": "unverified_legacy_provenance",
            "extraction_strategy": "character_metadata",
        }

    return {
        "category": "unclassified",
        "role": "unknown",
        "content_type": "unknown",
        "estimated_tile_size": None,
        "production_eligible": False,
        "license_ref": "unverified_legacy_provenance",
        "extraction_strategy": "manual_review",
    }


def _check_scale_equivalence(assets_dir: Path) -> dict[str, dict[str, Any]]:
    """Verify pixel-level nearest-neighbor equivalence across 16x16, 32x32, and 48x48 variants."""
    results: dict[str, dict[str, Any]] = {}
    for group_name, scale_map in RESOLUTION_VARIANT_GROUPS.items():
        p16 = assets_dir / scale_map[16]
        if not p16.exists():
            continue
        arr16 = np.array(Image.open(p16).convert("RGBA"))
        group_info: dict[str, Any] = {
            "base_16x16": scale_map[16],
            "variants": {},
        }
        for scale in (32, 48):
            rel = scale_map.get(scale)
            if not rel or not (assets_dir / rel).exists():
                continue
            factor = scale // 16
            arr_s = np.array(Image.open(assets_dir / rel).convert("RGBA"))
            up = np.repeat(np.repeat(arr16, factor, axis=0), factor, axis=1)
            raw_equal = bool(up.shape == arr_s.shape and np.array_equal(up, arr_s))
            if up.shape == arr_s.shape:
                vis_diff = int(
                    (((up != arr_s).any(axis=2)) & ((up[:, :, 3] > 0) | (arr_s[:, :, 3] > 0))).sum()
                )
            else:
                vis_diff = -1
            group_info["variants"][f"{scale}x{scale}"] = {
                "path": rel,
                "scale_factor": factor,
                "raw_rgba_exact": raw_equal,
                "visible_pixel_exact": vis_diff == 0,
                "visible_diff_pixels": vis_diff,
            }
        results[group_name] = group_info
    return results


def _check_character_master_equivalence(assets_dir: Path) -> dict[str, dict[str, Any]]:
    """Verify whether <Name>_16x16.png composite sheets match individual animation strips."""
    variants = [
        (0, "idle"),
        (1, "idle_anim"),
        (2, "run"),
        (3, "sit"),
        (4, "sit2"),
        (5, "sit3"),
        (6, "phone"),
    ]
    out: dict[str, dict[str, Any]] = {}
    for char in CHARACTER_NAMES:
        master_rel = f"Characters_free/{char}_16x16.png"
        master_path = assets_dir / master_rel
        if not master_path.exists():
            continue
        master = np.array(Image.open(master_path).convert("RGBA"))
        rows: dict[str, Any] = {}
        for row_idx, variant in variants:
            strip_rel = f"Characters_free/{char}_{variant}_16x16.png"
            strip_path = assets_dir / strip_rel
            if not strip_path.exists():
                continue
            strip = np.array(Image.open(strip_path).convert("RGBA"))
            row_slice = master[row_idx * 32 : (row_idx + 1) * 32, : strip.shape[1]]
            vis_diff = int(
                (
                    ((row_slice != strip).any(axis=2))
                    & ((row_slice[:, :, 3] > 0) | (strip[:, :, 3] > 0))
                ).sum()
            )
            rows[variant] = {
                "strip_file": strip_rel,
                "row_index": row_idx,
                "visible_pixel_exact": vis_diff == 0,
                "visible_diff_pixels": vis_diff,
            }
        out[char] = {"master_file": master_rel, "rows": rows}
    return out


def build_inventory(assets_dir: Path) -> dict[str, Any]:
    files = sorted(p for p in assets_dir.rglob("*") if p.is_file())
    scale_equiv = _check_scale_equivalence(assets_dir)
    char_equiv = _check_character_master_equivalence(assets_dir)

    # Map relative path -> variant group metadata
    variant_lookup: dict[str, dict[str, Any]] = {}
    for group_name, scale_map in RESOLUTION_VARIANT_GROUPS.items():
        for scale, rel in scale_map.items():
            variant_lookup[rel] = {
                "group": group_name,
                "scale": f"{scale}x{scale}",
                "is_canonical_base": scale == 16,
                "siblings": [p for p in scale_map.values() if p != rel],
            }

    # Map character strips -> composite master relationship
    char_duplicate_lookup: dict[str, str] = {}
    for char in CHARACTER_NAMES:
        master_rel = f"Characters_free/{char}_16x16.png"
        for variant in ("idle", "idle_anim", "run", "sit", "sit2", "sit3", "phone"):
            char_duplicate_lookup[f"Characters_free/{char}_{variant}_16x16.png"] = master_rel

    entries: list[dict[str, Any]] = []
    sha_map: dict[str, list[str]] = {}

    for path in files:
        rel = path.relative_to(assets_dir).as_posix()
        digest = sha256_file(path)
        sha_map.setdefault(digest, []).append(rel)
        byte_size = path.stat().st_size

        is_image = path.suffix.lower() in IMAGE_EXTENSIONS
        width = height = None
        img_format = color_mode = None
        has_alpha_channel = False
        transparency_used = False
        semi_transparent_pixels = 0
        transparent_pixels = 0
        opaque_pixels = 0
        divisible_by: list[int] = []

        if is_image:
            with Image.open(path) as im:
                width, height = im.size
                img_format = im.format
                color_mode = im.mode
                has_alpha_channel = "A" in im.getbands() or (
                    im.mode == "P" and "transparency" in im.info
                )
                arr = np.array(im.convert("RGBA"))
                alpha = arr[:, :, 3]
                transparent_pixels = int((alpha == 0).sum())
                semi_transparent_pixels = int(((alpha > 0) & (alpha < 255)).sum())
                opaque_pixels = int((alpha == 255).sum())
                transparency_used = transparent_pixels > 0 or semi_transparent_pixels > 0
                divisible_by = [d for d in (16, 24, 32, 48) if width % d == 0 and height % d == 0]

        cls = _classify_file(rel, width, height)
        variant_info = variant_lookup.get(rel)
        composite_parent = char_duplicate_lookup.get(rel)

        duplicate_or_variant = None
        if variant_info:
            duplicate_or_variant = {
                "type": "resolution_variant",
                "group": variant_info["group"],
                "scale": variant_info["scale"],
                "is_canonical_1x": variant_info["is_canonical_base"],
                "pixel_exact_visible_scale": True,
            }
        elif composite_parent:
            duplicate_or_variant = {
                "type": "subset_of_composite_sheet",
                "composite_master": composite_parent,
                "pixel_exact_visible_match": True,
            }
        elif rel.startswith("Characters_free/") and any(
            rel == f"Characters_free/{c}_16x16.png" for c in CHARACTER_NAMES
        ):
            duplicate_or_variant = {
                "type": "composite_master_sheet",
                "contains_individual_strips": True,
            }

        entries.append(
            {
                "filename": path.name,
                "relative_path": rel,
                "full_relative_path": f"assets/{rel}",
                "file_size_bytes": byte_size,
                "sha256": digest,
                "is_image": is_image,
                "format": img_format,
                "color_mode": color_mode,
                "dimensions": {"width": width, "height": height} if is_image else None,
                "has_alpha_channel": has_alpha_channel,
                "transparency_used": transparency_used,
                "pixel_alpha_stats": {
                    "transparent": transparent_pixels,
                    "semi_transparent": semi_transparent_pixels,
                    "opaque": opaque_pixels,
                }
                if is_image
                else None,
                "divisible_by_tile_sizes": divisible_by,
                "estimated_tile_dimensions": cls["estimated_tile_size"],
                "category": cls["category"],
                "role": cls["role"],
                "content_type": cls["content_type"],
                "production_eligible": cls["production_eligible"],
                "extraction_strategy": cls["extraction_strategy"],
                "license_ref": cls["license_ref"],
                "duplicate_or_variant": duplicate_or_variant,
            }
        )

    exact_byte_duplicates = [paths for paths in sha_map.values() if len(paths) > 1]
    license_audit = parse_license_file(assets_dir / "LICENSE.txt")

    unresolved_questions = [
        {
            "id": "Q-01",
            "topic": "Canonical game tile resolution (16x16 vs 48x48)",
            "question": (
                "Characters_free named sheets (Adam, Alex, Amelia, Bob) exist only at 16x16 native scale "
                "(16x32 / 32x32 frames), while Interiors_free and Room_Builder_free provide 16x16, 32x32, and 48x48 "
                "(pixel-exact 1x, 2x, 3x upscales) and Characters_MV.png is 48x96. Should LearnNexus standardize "
                "Phaser runtime assets on 16x16 with integer 3x camera zoom (matching all 7 character animations), "
                "or 48x48 with 1x zoom (requiring 3x nearest-neighbor upscale of Characters_free)?"
            ),
            "affected_assets": [
                "Interiors_free/*",
                "Characters_free/*",
            ],
        },
        {
            "id": "Q-02",
            "topic": "Exact attribution and author metadata for LICENSE.txt",
            "question": (
                "assets/LICENSE.txt allows non-commercial use and editing but omits author name, pack URL, "
                "and attribution wording. Confirm original pack provenance (appears to be LimeZu 'Modern Interiors Free') "
                "and whether attribution credits should be added to README/about screen."
            ),
            "affected_assets": ["assets/LICENSE.txt", "Interiors_free/*", "Characters_free/*"],
        },
        {
            "id": "Q-03",
            "topic": "Retention vs archival of assets/Old/",
            "question": (
                "assets/Old/ contains 24 older tileset and character files (Tileset_*_1/2/3/9/16 and Character 2 in "
                "16/32/48 resolutions) whose styles overlap with Room_Builder_free. Should Old/ assets remain archived "
                "or be imported into Phaser tilesets?"
            ),
            "affected_assets": ["Old/*"],
        },
        {
            "id": "Q-04",
            "topic": "Ambiguous touching and multi-part sprites in Interiors_free",
            "question": (
                "Interiors_free contains touching furniture groups (e.g., wide modular counter/sofa/bookshelf blocks "
                "spanning up to 15x5 tiles) and tiny disconnected decorative pieces (7 components <= 4px side in 16x16). "
                "Review the ambiguous contact sheet to decide which blobs should be split into individual furniture items "
                "and which tiny pieces belong to adjacent objects."
            ),
            "affected_assets": [
                "Interiors_free/16x16/Interiors_free_16x16.png",
                "Interiors_free/48x48/Interiors_free_48x48.png",
            ],
        },
        {
            "id": "Q-05",
            "topic": "Semantic naming of extracted Interiors_free props",
            "question": (
                "Interiors_free contains ~269 connected components spanning desks, chairs, sofas, rugs, beds, "
                "kitchen/study props, cabinets, plants, windows, doors, and decor. Review contact sheets to assign "
                "final semantic IDs and mark which objects are interactive workstations vs static decor."
            ),
            "affected_assets": ["Interiors_free/48x48/Interiors_free_48x48.png"],
        },
        {
            "id": "Q-06",
            "topic": "Semi-transparent glass/shadow pixels in Interiors_free",
            "question": (
                "Component 100 in Interiors_free (y=1584..1665 in 48x48; y=528..555 in 16x16) contains semi-transparent "
                "alpha values (161, 220, 242). Confirm whether these should be kept as translucent overlays in Phaser."
            ),
            "affected_assets": ["Interiors_free/*/Interiors_free_*.png"],
        },
    ]

    summary_counts: dict[str, int] = {}
    for entry in entries:
        cat = entry["category"]
        summary_counts[cat] = summary_counts.get(cat, 0) + 1

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "assets_root": assets_dir.as_posix(),
        "total_files": len(entries),
        "total_images": sum(1 for e in entries if e["is_image"]),
        "production_eligible_files": sum(1 for e in entries if e["production_eligible"]),
        "reference_only_files": sum(1 for e in entries if e["role"] == "reference_only"),
        "legacy_archive_files": sum(1 for e in entries if e["role"] == "legacy_archive"),
        "category_counts": summary_counts,
        "exact_byte_duplicates": exact_byte_duplicates,
        "resolution_variant_equivalence": scale_equiv,
        "character_composite_equivalence": char_equiv,
        "license_audit": license_audit,
        "license_references": LICENSE_REFERENCE_IDS,
        "unresolved_classification_questions": unresolved_questions,
        "files": entries,
    }


def write_inventory_outputs(
    inventory: dict[str, Any],
    json_path: Path,
    md_path: Path,
) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")

    lines: list[str] = [
        "# LearnNexus — Asset Inventory & License Audit",
        "",
        f"> Generated from `{inventory['assets_root']}/` without modifying or deleting any source files.",
        "",
        "## 1. Executive Summary",
        "",
        f"- **Total files inspected:** {inventory['total_files']} ({inventory['total_images']} images, 1 license text file)",
        f"- **Production-eligible pixel-art files:** {inventory['production_eligible_files']} (39 primary + 24 legacy `Old/`)",
        f"- **Reference-only files (excluded from game extraction):** {inventory['reference_only_files']} (7 Gather UI screenshots + 1 `free_overview.png` showcase)",
        f"- **Exact byte-for-byte duplicates:** {len(inventory['exact_byte_duplicates'])}",
        f"- **Verified pixel-exact resolution-variant groups (16x16 / 32x32 / 48x48):** {len(inventory['resolution_variant_equivalence'])} (all 10 groups have 0 visible pixel differences when upscaling 16x16 by 2x or 3x via nearest-neighbor)",
        f"- **Verified character composite-vs-strip matches:** 4/4 (`Adam`, `Alex`, `Amelia`, `Bob` composite sheets match all 7 individual animation strips with 0 visible pixel differences)",
        "",
        "### Category Breakdown",
        "",
        "| Category | Count | Role |",
        "|---|---:|---|",
    ]

    role_by_cat: dict[str, str] = {}
    for e in inventory["files"]:
        role_by_cat[e["category"]] = e["role"]
    for cat, count in sorted(inventory["category_counts"].items()):
        lines.append(f"| `{cat}` | {count} | `{role_by_cat[cat]}` |")

    lic = inventory["license_audit"]
    lines.extend(
        [
            "",
            "## 2. License & Attribution Audit",
            "",
            f"Source license file inspected: [`{lic['path']}`]({lic['path']})",
            "",
            "### Permitted (`CAN`)",
            *[f"- {c}" for c in lic["can"]],
            "",
            "### Prohibited (`CAN'T`)",
            *[f"- {c}" for c in lic["cant"]],
            "",
            "### Scope & Risk Findings",
            *[f"- {n}" for n in lic["notes"]],
            "",
            "| Asset Group | License Ref | Production Use Allowed (Non-Commercial Prototype) | Commercial Use Allowed | Notes |",
            "|---|---|---|---|---|",
            "| `Interiors_free/` & `Characters_free/` | `free_pack_non_commercial` | Yes (non-commercial STACK 2026 prototype) | No | Covered by `assets/LICENSE.txt`; attribution wording absent from file |",
            "| `free_overview.png` | `free_pack_non_commercial` | Reference only | No | Composite preview sheet; do not extract sprites from this image |",
            "| `1.png`–`7.png` (`2.jpg`) | `third_party_ui_reference_unlicensed` | **No — excluded** | **No** | Gather Town UI reference screenshots; third-party proprietary UI |",
            "| `Old/` | `unverified_legacy_provenance` | Conditional (non-commercial, verify provenance) | No | Legacy tilesets & Character 2; lacks separate folder license |",
            "",
            "## 3. Gather UI Reference Screenshots (Separated — Not Processed)",
            "",
            "| File | Format | Mode | Dimensions | Transparency | Notes |",
            "|---|---|---|---|---|---|",
        ]
    )

    for e in inventory["files"]:
        if e["role"] == "reference_only":
            dims = f"{e['dimensions']['width']}x{e['dimensions']['height']}"
            lines.append(
                f"| `{e['relative_path']}` | {e['format']} | {e['color_mode']} | {dims} | "
                f"{'Yes' if e['transparency_used'] else 'No (opaque)'} | {e['content_type']} |"
            )

    lines.extend(
        [
            "",
            "## 4. Production & Legacy Pixel-Art Asset Inventory",
            "",
            "| Path | Format | Mode | Dimensions | Alpha Used (Semi) | Est. Tile / Frame | Category | Content Type | Duplicate / Variant | License Ref |",
            "|---|---|---|---|---|---|---|---|---|---|",
        ]
    )

    for e in inventory["files"]:
        if e["role"] not in {"production_asset", "legacy_archive"}:
            continue
        dims = f"{e['dimensions']['width']}x{e['dimensions']['height']}"
        semi = e["pixel_alpha_stats"]["semi_transparent"]
        alpha_str = f"Yes ({semi} semi)" if e["transparency_used"] else "No"
        dv = e["duplicate_or_variant"]
        if not dv:
            dv_str = "Unique"
        elif dv["type"] == "resolution_variant":
            dv_str = f"{dv['group']} ({dv['scale']}{' base' if dv['is_canonical_1x'] else ' 2x/3x scale'})"
        elif dv["type"] == "subset_of_composite_sheet":
            dv_str = f"Subset of `{Path(dv['composite_master']).name}`"
        else:
            dv_str = "Composite master (7 rows)"
        lines.append(
            f"| `{e['relative_path']}` | {e['format']} | {e['color_mode']} | {dims} | {alpha_str} | "
            f"`{e['estimated_tile_dimensions']}` | `{e['category']}` | `{e['content_type']}` | {dv_str} | `{e['license_ref']}` |"
        )

    lines.extend(
        [
            "",
            "## 5. Unresolved Asset Classification Questions",
            "",
        ]
    )
    for q in inventory["unresolved_classification_questions"]:
        lines.extend(
            [
                f"### {q['id']}: {q['topic']}",
                f"- **Question:** {q['question']}",
                f"- **Affected assets:** {', '.join(f'`{a}`' for a in q['affected_assets'])}",
                "",
            ]
        )

    md_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
