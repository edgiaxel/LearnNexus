# LearnNexus — Rendering & Resolution Decision

> **Status:** Evaluated & Recommended for M1  
> **Evidence:** Headless Chrome screenshots & telemetry (`prototype/environment-spike/screenshots/capture-metrics.json`)

## 1. Configurations Evaluated

Both configurations enforced ADR-012 (`pixelArt: true`, `antialias: false`, `roundPixels: true`, `Phaser.Textures.FilterMode.NEAREST`, CSS `image-rendering: pixelated`, integer scaling only) and rendered identical viewport geometry (`960x576` follow view, `1152x768` full-room view).

| Criterion | Config A: 16px Native + 3x Camera Zoom | Config B: 48px Upscaled + 3x Scaled Character (1x Zoom) |
|---|---|---|
| **Tile & Atlas Source** | `Room_Builder_free_16x16.png` (`272x368`) + `interiors_16x16.png` (`2044x170`) | `Room_Builder_free_48x48.png` (`816x1104`) + `interiors_48x48.png` (`2036x1063`) |
| **Character Scale** | `Adam` native `16x32` at `scale = 1` | `Adam` native `16x32` upscaled `3x` (`48x96` on screen) |
| **Camera Zoom** | `3` (integer) | `1` (integer) |
| **Visual Clarity** | Identical crispness; zero subpixel blur | Identical crispness; zero subpixel blur |
| **Proportions** | Native 1:1 pixel grid parity between `Adam` (`16x32`) and `16x16` tiles/furniture | Requires manual `setScale(3)` on every `Characters_free` sprite to match `48x48` tiles |
| **Animation Consistency** | Native `16x32` (and `32x32` sit) frames align 1:1 with tile grid | Mixed native `48x96` (`Characters_MV.png`) vs `3x` scaled `16x32` (`Characters_free`) creates scale-management overhead |
| **Pixel Alignment** | Uniform 16px texel grid across all layers; `roundPixels` snaps to `1/3` screen px cleanly | 48px texel grid for environment + 16px texel grid scaled 3x for character |
| **Performance (Headless SwiftShader)** | `49–53 FPS`; ~9× smaller texture memory footprint (`2044x170` atlas) | `51–53 FPS`; ~9× larger texture memory (`2036x1063` atlas) |
| **Future Asset Integration** | Direct 1:1 compatibility with all `Characters_free` 7-action strips (`Adam`, `Alex`, `Amelia`, `Bob`) without upscaling | Requires either runtime `setScale(3)` on every `16x16` asset or pre-upscaling 28+ character strips |

## 2. Recommendation

**Adopt Config A (`16x16` native tiles & atlas + integer `3x` camera zoom)** for M1–M4 production implementation:

1. **Zero Upscaling Overhead:** All 4 primary characters (`Adam`, `Alex`, `Amelia`, `Bob`) and all 7 animation variants exist natively at `16x16` base scale (`16x32` / `32x32` frames).
2. **Smaller GPU Footprint:** `16x16` textures use ~9× less VRAM and faster initial load than `48x48` 3× pre-upscaled sheets while producing pixel-identical output on screen.
3. **Uniform Grid Math:** World coordinates, collision boxes, and camera `roundPixels` operate on a single canonical `16px` grid, scaled cleanly by integer zoom (`3x` default, `2x` or `4x` optional for display density) without mixed-scale artifacts.
