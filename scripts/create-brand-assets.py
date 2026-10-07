from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "assets" / "images"
SOURCE = OUT / "gun-akisi-logo-mark.png"
SIZE = 1024
CREAM = (246, 243, 235, 255)


def fitted_mark(source: Image.Image, canvas_size: int, max_side: int) -> Image.Image:
    mark = source.convert("RGBA").copy()
    mark.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - mark.width) // 2
    y = (canvas_size - mark.height) // 2
    canvas.alpha_composite(mark, (x, y))
    return canvas


def save_png(image: Image.Image, name: str) -> None:
    image.save(OUT / name, format="PNG", optimize=True)


if not SOURCE.exists():
    raise SystemExit(f"Generated transparent logo is missing: {SOURCE}")

source = Image.open(SOURCE).convert("RGBA")
if source.width < 256 or source.height < 256:
    raise SystemExit(f"Logo source is too small for app branding: {source.width}x{source.height}")

# Full square background, leaving platform launchers to apply their own corner masks.
icon = Image.new("RGBA", (SIZE, SIZE), CREAM)
icon.alpha_composite(fitted_mark(source, SIZE, 700))
save_png(icon, "icon.png")

# Transparent centered layers for splash/adaptive rendering.
save_png(fitted_mark(source, SIZE, 760), "splash-icon.png")
save_png(fitted_mark(source, SIZE, 700), "android-icon-foreground.png")

# Favicon uses the same mark on the app's warm paper color.
favicon = Image.new("RGBA", (256, 256), CREAM)
favicon.alpha_composite(fitted_mark(source, 256, 184))
save_png(favicon, "favicon.png")

# The adaptive background contains no baked-in mark; the OS combines both layers.
Image.new("RGBA", (SIZE, SIZE), CREAM).save(OUT / "android-icon-background.png", format="PNG", optimize=True)
foreground = fitted_mark(source, SIZE, 700)
monochrome = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
monochrome.putalpha(foreground.getchannel("A"))
save_png(monochrome, "android-icon-monochrome.png")

alpha = source.getchannel("A").getextrema()
print(
    "Created Gün Akışı launcher/splash/adaptive assets from the generated logo: "
    f"{source.width}x{source.height}, source alpha range {alpha[0]}–{alpha[1]}."
)
