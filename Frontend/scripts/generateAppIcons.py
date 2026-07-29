from pathlib import Path
from PIL import Image

src = Path(r"D:\Eduaitor\Frontend\resources\icon.png")
img = Image.open(src).convert("RGBA")

legacy = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
foreground = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

res = Path(r"D:\Eduaitor\Frontend\android\app\src\main\res")


def resize(size):
    return img.resize((size, size), Image.Resampling.LANCZOS)


for folder, size in legacy.items():
    out_dir = res / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    icon = resize(size)
    icon.save(out_dir / "ic_launcher.png")
    icon.save(out_dir / "ic_launcher_round.png")
    print(f"wrote {folder}/ic_launcher.png ({size})")

for folder, size in foreground.items():
    out_dir = res / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    fg = resize(size)
    fg.save(out_dir / "ic_launcher_foreground.png")
    print(f"wrote {folder}/ic_launcher_foreground.png ({size})")

public = Path(r"D:\Eduaitor\Frontend\public\eduaitor-app-icon.png")
img.resize((512, 512), Image.Resampling.LANCZOS).save(public)
print("wrote public/eduaitor-app-icon.png")
print("done")
