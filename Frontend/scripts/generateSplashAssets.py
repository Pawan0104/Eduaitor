"""Regenerate Android splash.png assets with Option D icon on #05080F."""
from pathlib import Path
from PIL import Image

BG = (0x05, 0x08, 0x0F, 255)
ICON_SRC = Path(r"D:\Eduaitor\Frontend\resources\icon.png")
RES = Path(r"D:\Eduaitor\Frontend\android\app\src\main\res")
PUBLIC_SPLASH = Path(r"D:\Eduaitor\Frontend\public\eduaitor-splash-logo.png")

# Fraction of the shorter canvas edge for the centered icon (large / highly visible)
ICON_FRACTION = 0.55


def make_splash(width: int, height: int, icon: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), BG)
    side = max(1, int(min(width, height) * ICON_FRACTION))
    logo = icon.resize((side, side), Image.Resampling.LANCZOS)
    x = (width - side) // 2
    y = (height - side) // 2
    canvas.paste(logo, (x, y), logo if logo.mode == "RGBA" else None)
    return canvas.convert("RGB")


def main() -> None:
    icon = Image.open(ICON_SRC).convert("RGBA")
    updated = []

    for path in sorted(RES.rglob("splash.png")):
        with Image.open(path) as existing:
            w, h = existing.size
        out = make_splash(w, h, icon)
        out.save(path, "PNG", optimize=True)
        updated.append((str(path), w, h))
        print(f"updated {path.relative_to(RES.parent.parent)}  {w}x{h}")

    # High-visibility splash mark for web/public (512x512 Option D on dark bg)
    mark = make_splash(512, 512, icon)
    PUBLIC_SPLASH.parent.mkdir(parents=True, exist_ok=True)
    mark.save(PUBLIC_SPLASH, "PNG", optimize=True)
    updated.append((str(PUBLIC_SPLASH), 512, 512))
    print(f"updated public/eduaitor-splash-logo.png  512x512")

    print(f"\nDone: {len(updated)} files")


if __name__ == "__main__":
    main()
