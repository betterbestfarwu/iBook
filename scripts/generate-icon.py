#!/usr/bin/env python3
"""Generate iBook app icon from book artwork with transparent background."""

from pathlib import Path
from PIL import Image

SIZE = 1024
CONTENT_RATIO = 0.80
MARGIN = int(SIZE * (1 - CONTENT_RATIO) / 2)
CONTENT = SIZE - 2 * MARGIN
GRAPHIC_RATIO = 1.0  # book graphic fills content area

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "build"
SOURCE = ROOT / "build" / "book-source.png"
FALLBACK_SOURCE = Path(
    "/Users/airdroid/.cursor/projects/Users-airdroid-iBook/assets/"
    "image-c9f20166-b9f7-40e2-8383-867afeaa1c8d.png"
)

# Teal background sampled from source image borders.
BG_COLOR = (46, 170, 166)
BG_TOLERANCE = 38


def remove_background(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    br, bg, bb = BG_COLOR

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            dist = ((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2) ** 0.5
            if dist <= BG_TOLERANCE:
                pixels[x, y] = (r, g, b, 0)
            elif dist <= BG_TOLERANCE + 18:
                fade = int(255 * (dist - BG_TOLERANCE) / 18)
                pixels[x, y] = (r, g, b, min(255, fade))

    return rgba


def trim_transparent(img: Image.Image, padding: int = 2) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(img.width, x1 + padding)
    y1 = min(img.height, y1 + padding)
    return img.crop((x0, y0, x1, y1))


def compose_icon(artwork: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    target = int(CONTENT * GRAPHIC_RATIO)
    scale = min(target / artwork.width, target / artwork.height)
    new_w = max(1, int(artwork.width * scale))
    new_h = max(1, int(artwork.height * scale))
    resized = artwork.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (SIZE - new_w) // 2
    y = (SIZE - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def make_iconset(png_path: Path) -> None:
    iconset = OUT_DIR / "icon.iconset"
    iconset.mkdir(exist_ok=True)
    base = Image.open(png_path).convert("RGBA")
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    for size in sizes:
        resized = base.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(iconset / f"icon_{size}x{size}.png")
        if size <= 512:
            resized2 = base.resize((size * 2, size * 2), Image.Resampling.LANCZOS)
            resized2.save(iconset / f"icon_{size}x{size}@2x.png")


def resolve_source() -> Path:
    if SOURCE.exists():
        return SOURCE
    if FALLBACK_SOURCE.exists():
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        Image.open(FALLBACK_SOURCE).save(SOURCE)
        return SOURCE
    raise FileNotFoundError("Book source image not found")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source_path = resolve_source()

    raw = Image.open(source_path)
    cutout = remove_background(raw)
    cutout = trim_transparent(cutout)
    cutout.save(OUT_DIR / "book-cutout.png", "PNG")

    icon = compose_icon(cutout)
    png_path = OUT_DIR / "icon.png"
    icon.save(png_path, "PNG")
    make_iconset(png_path)

    alpha = sum(1 for y in range(SIZE) for x in range(SIZE) if icon.getpixel((x, y))[3] == 0)
    print(f"Source: {source_path}")
    print(f"Cutout: {OUT_DIR / 'book-cutout.png'} ({cutout.width}x{cutout.height})")
    print(
        f"Generated {png_path} ({SIZE}x{SIZE}, "
        f"content area {CONTENT_RATIO:.0%}, graphic {GRAPHIC_RATIO:.0%} of content, "
        f"transparent {alpha / (SIZE * SIZE):.1%})"
    )


if __name__ == "__main__":
    main()
