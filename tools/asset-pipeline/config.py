"""Configuration, classification rules, and sheet schemas for the LearnNexus asset pipeline."""

from __future__ import annotations

from pathlib import Path
from typing import Any

DEFAULT_ASSETS_DIR = Path("assets")
DEFAULT_OUTPUT_DIR = Path("processed-assets")
DEFAULT_INVENTORY_MD = Path("ASSET_INVENTORY.md")
DEFAULT_INVENTORY_JSON = Path("asset-inventory.json")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}

# Gather Town UI reference screenshots — NEVER process as game assets
GATHER_REFERENCE_FILES = {
    "1.png",
    "2.jpg",
    "3.png",
    "4.png",
    "5.png",
    "6.png",
    "7.png",
}

OVERVIEW_REFERENCE_FILES = {
    "free_overview.png",
}

LICENSE_FILES = {
    "LICENSE.txt",
}

# Phase 7 mandatory pilot validation targets
PILOT_VALIDATION_TARGETS = [
    "free_overview.png",
    "Interiors_free/48x48/Interiors_free_48x48.png",
    "Interiors_free/48x48/Room_Builder_free_48x48.png",
    "Characters_free/Adam_16x16.png",
    "Characters_free/Adam_run_16x16.png",
]

# Known resolution-variant families (base 16x16 -> 2x 32x32 -> 3x 48x48)
RESOLUTION_VARIANT_GROUPS: dict[str, dict[int, str]] = {
    "Interiors_free": {
        16: "Interiors_free/16x16/Interiors_free_16x16.png",
        32: "Interiors_free/32x32/Interiors_free_32x32.png",
        48: "Interiors_free/48x48/Interiors_free_48x48.png",
    },
    "Room_Builder_free": {
        16: "Interiors_free/16x16/Room_Builder_free_16x16.png",
        32: "Interiors_free/32x32/Room_Builder_free_32x32.png",
        48: "Interiors_free/48x48/Room_Builder_free_48x48.png",
    },
    "Old_Tileset_1": {
        16: "Old/Tileset_16x16_1.png",
        32: "Old/Tileset_32x32_1.png",
        48: "Old/Tileset_48x48_1.png",
    },
    "Old_Tileset_2": {
        16: "Old/Tileset_16x16_2.png",
        32: "Old/Tileset_32x32_2.png",
        48: "Old/Tileset_48x48_2.png",
    },
    "Old_Tileset_3": {
        16: "Old/Tileset_16x16_3.png",
        32: "Old/Tileset_32x32_3.png",
        48: "Old/Tileset_48x48_3.png",
    },
    "Old_Tileset_9": {
        16: "Old/Tileset_16x16_9.png",
        32: "Old/Tileset_32x32_9.png",
        48: "Old/Tileset_48x48_9.png",
    },
    "Old_Tileset_16": {
        16: "Old/Tileset_16x16_16.png",
        32: "Old/Tileset_32x32_16.png",
        48: "Old/Tileset_48x48_16.png",
    },
    "Old_idle_2": {
        16: "Old/idle_16x16_2.png",
        32: "Old/idle_32x32_2.png",
        48: "Old/idle_48x48_2.png",
    },
    "Old_run_horizontal_2": {
        16: "Old/run_horizontal_16x16_2.png",
        32: "Old/run_horizontal_32x32_2.png",
        48: "Old/run_horizontal_48x48_2.png",
    },
    "Old_Character_2_RPGMAKER": {
        16: "Old/mv/Character_2_16x16_RPGMAKER.png",
        32: "Old/mv/Character_2_32x32_RPGMAKER.png",
        48: "Old/mv/Character_2_48x48_RPGMAKER.png",
    },
}

# Verified semantic regions for Room_Builder_free (17 cols x 23 rows at all 3 scales)
ROOM_BUILDER_REGIONS: list[dict[str, Any]] = [
    {
        "name": "sheet_text_annotation",
        "category": "annotation_non_game",
        "col_start": 0,
        "col_end": 4,
        "row_start": 0,
        "row_end": 3,
        "exclude_from_game": True,
        "notes": "Contains literal text 'room border / ceiling ->' baked into the source sheet.",
    },
    {
        "name": "room_borders_and_ceiling",
        "category": "room_borders",
        "col_start": 5,
        "col_end": 16,
        "row_start": 0,
        "row_end": 3,
        "exclude_from_game": False,
        "notes": "Architectural ceiling trim and wall-cap outline segments.",
    },
    {
        "name": "walls_coral_stripe",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 5,
        "row_end": 6,
        "exclude_from_game": False,
        "notes": "Warm coral/terracotta striped wall variants.",
    },
    {
        "name": "walls_butter_yellow",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 7,
        "row_end": 8,
        "exclude_from_game": False,
        "notes": "Soft butter-yellow striped wall variants.",
    },
    {
        "name": "walls_mint_cream",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 9,
        "row_end": 10,
        "exclude_from_game": False,
        "notes": "Mint/aqua pastel wall variants.",
    },
    {
        "name": "walls_warm_wood_light",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 11,
        "row_end": 12,
        "exclude_from_game": False,
        "notes": "Warm light oak vertical wood paneling.",
    },
    {
        "name": "walls_walnut_wood",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 13,
        "row_end": 14,
        "exclude_from_game": False,
        "notes": "Medium walnut vertical wood paneling.",
    },
    {
        "name": "walls_cedar_wood",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 15,
        "row_end": 16,
        "exclude_from_game": False,
        "notes": "Reddish cedar vertical wood paneling.",
    },
    {
        "name": "walls_cool_slate",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 17,
        "row_end": 18,
        "exclude_from_game": False,
        "notes": "Cool slate gray slatted wall variants.",
    },
    {
        "name": "walls_warm_beige",
        "category": "walls",
        "col_start": 0,
        "col_end": 9,
        "row_start": 19,
        "row_end": 20,
        "exclude_from_game": False,
        "notes": "Warm beige slatted wall variants.",
    },
    {
        "name": "floors_terracotta_tile",
        "category": "floors",
        "col_start": 11,
        "col_end": 13,
        "row_start": 5,
        "row_end": 6,
        "exclude_from_game": False,
        "notes": "Terracotta brick/tile floor patch (3x2).",
    },
    {
        "name": "floors_cream_tile",
        "category": "floors",
        "col_start": 11,
        "col_end": 13,
        "row_start": 7,
        "row_end": 8,
        "exclude_from_game": False,
        "notes": "Warm cream geometric tile floor patch (3x2).",
    },
    {
        "name": "floors_aqua_tile",
        "category": "floors",
        "col_start": 11,
        "col_end": 13,
        "row_start": 9,
        "row_end": 10,
        "exclude_from_game": False,
        "notes": "Aqua/mint circular tile floor patch (3x2).",
    },
    {
        "name": "floors_stone_concrete",
        "category": "floors",
        "col_start": 11,
        "col_end": 13,
        "row_start": 11,
        "row_end": 12,
        "exclude_from_game": False,
        "notes": "Neutral stone/concrete floor patch (3x2).",
    },
    {
        "name": "floors_herringbone_wood",
        "category": "floors",
        "col_start": 11,
        "col_end": 13,
        "row_start": 13,
        "row_end": 14,
        "exclude_from_game": False,
        "notes": "Herringbone wood parquet floor patch (3x2).",
    },
    {
        "name": "floors_gray_carpet_variants",
        "category": "floors",
        "col_start": 14,
        "col_end": 16,
        "row_start": 5,
        "row_end": 12,
        "exclude_from_game": False,
        "notes": "Four textured neutral gray carpet/stone floor patches (3x2 each).",
    },
]

# Character animation schemas for Characters_free (<Name>_*_16x16.png)
CHARACTER_NAMES = ["Adam", "Alex", "Amelia", "Bob"]

CHARACTER_STRIP_SCHEMAS: dict[str, dict[str, Any]] = {
    "idle": {
        "row_in_master": 0,
        "frame_width": 16,
        "frame_height": 32,
        "total_frames": 4,
        "frame_rate": 4,
        "repeat": -1,
        "sequences": [
            {"direction": "right", "frames": [0]},
            {"direction": "up", "frames": [1]},
            {"direction": "left", "frames": [2]},
            {"direction": "down", "frames": [3]},
        ],
    },
    "idle_anim": {
        "row_in_master": 1,
        "frame_width": 16,
        "frame_height": 32,
        "total_frames": 24,
        "frame_rate": 8,
        "repeat": -1,
        "sequences": [
            {"direction": "right", "frames": list(range(0, 6))},
            {"direction": "up", "frames": list(range(6, 12))},
            {"direction": "left", "frames": list(range(12, 18))},
            {"direction": "down", "frames": list(range(18, 24))},
        ],
    },
    "run": {
        "row_in_master": 2,
        "frame_width": 16,
        "frame_height": 32,
        "total_frames": 24,
        "frame_rate": 10,
        "repeat": -1,
        "sequences": [
            {"direction": "right", "frames": list(range(0, 6))},
            {"direction": "up", "frames": list(range(6, 12))},
            {"direction": "left", "frames": list(range(12, 18))},
            {"direction": "down", "frames": list(range(18, 24))},
        ],
    },
    "sit": {
        "row_in_master": 3,
        "frame_width": 32,
        "frame_height": 32,
        "total_frames": 12,
        "frame_rate": 6,
        "repeat": -1,
        "notes": "Sprites are centered inside 32x32 cells (16px wide at x=6..21); slicing at 16px splits frames.",
        "sequences": [
            {"direction": "right", "frames": list(range(0, 6))},
            {"direction": "left", "frames": list(range(6, 12))},
        ],
    },
    "sit2": {
        "row_in_master": 4,
        "frame_width": 32,
        "frame_height": 32,
        "total_frames": 12,
        "frame_rate": 6,
        "repeat": -1,
        "notes": "Sprites span 17px horizontally inside 32x32 cells (x=5..21); 16px slicing would clip pixels.",
        "sequences": [
            {"direction": "right", "frames": list(range(0, 6))},
            {"direction": "left", "frames": list(range(6, 12))},
        ],
    },
    "sit3": {
        "row_in_master": 5,
        "frame_width": 16,
        "frame_height": 32,
        "total_frames": 12,
        "frame_rate": 6,
        "repeat": -1,
        "sequences": [
            {"direction": "right", "frames": list(range(0, 6))},
            {"direction": "left", "frames": list(range(6, 12))},
        ],
    },
    "phone": {
        "row_in_master": 6,
        "frame_width": 16,
        "frame_height": 32,
        "total_frames": 9,
        "frame_rate": 8,
        "repeat": 0,
        "sequences": [
            {"direction": "down", "frames": list(range(0, 9))},
        ],
    },
}

# RPG Maker MV top-row character order visually verified in Characters_MV.png
RPGMAKER_MV_CHARACTERS = ["Bob", "Amelia", "Adam", "Alex"]
RPGMAKER_MV_DIRECTIONS = ["down", "left", "right", "up"]

# Segmentation edge-case thresholds (expressed in native 16px units, scaled by tile_size / 16)
SEGMENTATION_THRESHOLDS = {
    "tiny_min_side_16": 4,
    "tiny_min_area_16": 25,
    "oversized_tiles": 4,
    "close_gap_16": 2,
}

LICENSE_REFERENCE_IDS = {
    "free_pack_non_commercial": {
        "id": "free_pack_non_commercial",
        "source_file": "assets/LICENSE.txt",
        "commercial_use": False,
        "non_commercial_use": True,
        "editable_non_commercial": True,
        "resell_allowed": False,
        "attribution_specified_in_file": False,
        "summary": (
            "Non-commercial use and non-commercial sprite editing permitted; "
            "commercial use, commercial editing, and reselling prohibited. "
            "No explicit attribution string or author name is included in LICENSE.txt."
        ),
    },
    "third_party_ui_reference_unlicensed": {
        "id": "third_party_ui_reference_unlicensed",
        "source_file": None,
        "commercial_use": False,
        "non_commercial_use": False,
        "editable_non_commercial": False,
        "resell_allowed": False,
        "attribution_specified_in_file": False,
        "summary": (
            "Third-party Gather Town UI screenshots retained strictly as design reference. "
            "Not covered by assets/LICENSE.txt; must never be redistributed or used as game assets."
        ),
    },
    "unverified_legacy_provenance": {
        "id": "unverified_legacy_provenance",
        "source_file": "assets/LICENSE.txt (assumed parent pack, unverified)",
        "commercial_use": False,
        "non_commercial_use": True,
        "editable_non_commercial": True,
        "resell_allowed": False,
        "attribution_specified_in_file": False,
        "summary": (
            "Stored alongside LICENSE.txt under assets/Old/ and likely an earlier version of the "
            "same free pack, but lacks a folder-level license confirmation."
        ),
    },
}
