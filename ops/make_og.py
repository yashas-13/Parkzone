#!/usr/bin/env python3
"""Render the ParkZone social card and app icons as real PNGs.

    python3 ops/make_og.py

Outputs: public/assets/og.png (1200x630), icon-192.png, icon-512.png,
apple-touch-icon.png. Uses the variable Roboto shipped with Android when the
bundled Inter webfont (woff2) cannot be read by Pillow.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets")
FONTS = ["/system/fonts/RobotoFlex-Regular.ttf", "/system/fonts/Roboto-Regular.ttf"]
FONT = next((f for f in FONTS if os.path.exists(f)), None)
if not FONT:
    raise SystemExit("no usable TTF found - install a font or edit FONTS")

BRAND = (0, 255, 136)
BRAND_DARK = (0, 190, 96)
INK = (238, 242, 240)
DIM = (167, 179, 174)
FAINT = (109, 122, 117)
BG_TOP = (5, 7, 10)
BG_BOTTOM = (4, 20, 14)


def font(size, weight="Regular"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f



def overlay(img, draw_fn):
    """Draw translucent shapes onto a layer and composite them properly.

    ImageDraw writes the alpha channel verbatim instead of blending, so a
    (255,255,255,8) fill would survive convert('RGB') as solid white.
    """
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return Image.alpha_composite(img, layer)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        row = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return img


def grid(img, step=46, alpha=26):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(0, img.size[0], step):
        d.line([(x, 0), (x, img.size[1])], fill=(0, 255, 136, alpha), width=1)
    for y in range(0, img.size[1], step):
        d.line([(0, y), (img.size[0], y)], fill=(0, 255, 136, alpha), width=1)
    return Image.alpha_composite(img.convert("RGBA"), layer)


def glow(img, center, radius, color=(0, 255, 136), alpha=90):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(
        [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
        fill=color + (alpha,),
    )
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.45))
    return Image.alpha_composite(img, layer)


def gradient_text(img, xy, text, fnt, c1=(255, 255, 255), c2=BRAND):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=fnt, fill=255)
    grad = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(grad)
    x0, y0 = xy
    for x in range(img.size[0]):
        t = min(1.0, max(0.0, (x - x0) / 620.0))
        d.line([(x, 0), (x, img.size[1])], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,))
    return Image.composite(grad, img, mask)


def brand_mark(img, x, y, size=56):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x, y, x + size, y + size], radius=16, fill=BRAND + (255,))
    d.text((x + 15, y + 8), "P", font=font(int(size * 0.78), "ExtraBold"), fill=(4, 22, 12, 255))


def og_card():
    img = gradient((1200, 630), BG_TOP, BG_BOTTOM).convert("RGBA")
    img = grid(img)
    img = glow(img, (600, -60), 420, alpha=120)
    img = glow(img, (1080, 520), 300, color=(95, 233, 255), alpha=60)
    img = overlay(img, lambda L: (L.rounded_rectangle([64, 56, 1136, 574], radius=28, fill=(255, 255, 255, 8),
                                                      outline=(0, 255, 136, 70), width=2)))
    d = ImageDraw.Draw(img)

    brand_mark(img, 112, 108)
    # Lay the wordmark out by measured width so the parts can never collide.
    f_word = font(30, "ExtraBold")
    x = 186
    for part, colour, fnt in (("PARK", INK, f_word), ("ZONE", BRAND, f_word), (".in", FAINT, font(20, "Medium"))):
        d.text((x, 112 if fnt is f_word else 118), part, font=fnt, fill=colour + (255,))
        x += d.textlength(part, font=fnt) + (1 if fnt is not f_word else 0)

    img = gradient_text(img, (112, 214), "Indian GPUs for", font(72, "ExtraBold"))
    img = gradient_text(img, (112, 296), "Indian AI.", font(72, "ExtraBold"), c1=(255, 255, 255), c2=(95, 233, 255))
    d = ImageDraw.Draw(img)
    d.text((114, 396), "RTX 4090 from Rs 29/hr - 70% below AWS.", font=font(24), fill=DIM + (255,))
    d.text((114, 428), "Per-minute billing. UPI. Hosted in India.", font=font(24), fill=DIM + (255,))

    d.rounded_rectangle([114, 480, 314, 542], radius=14, fill=BRAND + (255,))
    d.text((144, 497), "Rent a GPU", font=font(21, "Bold"), fill=(4, 22, 12, 255))
    d.rounded_rectangle([330, 480, 596, 542], radius=14, outline=(0, 255, 136, 150), width=2)
    d.text((358, 497), "Park your GPU", font=font(21, "Bold"), fill=BRAND + (255,))

    # Terminal card
    img = overlay(img, lambda L: (L.rounded_rectangle([672, 176, 1096, 498], radius=20, fill=(6, 9, 12, 232),
                                                      outline=(0, 255, 136, 70), width=2)))
    d = ImageDraw.Draw(img)
    for i, col in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        d.ellipse([700 + i * 24, 200, 714 + i * 24, 214], fill=col + (255,))
    mono = [font(19), font(18), font(16)]
    d.text((700, 250), "$ curl parkzone.in/api/gpus", font=mono[0], fill=BRAND + (255,))
    rows = [
        ("RTX 4090  24GB  Mumbai   Rs 29/hr", DIM),
        ("RTX 3090  24GB  Pune     Rs 19/hr", DIM),
        ("A100 80GB       Delhi    Rs 74/hr", DIM),
    ]
    y = 288
    for text, col in rows:
        d.text((700, y), text, font=mono[1], fill=col + (255,))
        y += 34
    d.text((700, 400), "ssh root@parkzone.in -p 22001", font=mono[1], fill=BRAND + (255,))
    d.text((700, 440), "billed per minute, cancel anytime", font=mono[0], fill=FAINT + (255,))
    return img.convert("RGB")


def icon(size):
    img = Image.new("RGBA", (size, size), (5, 7, 10, 255))
    d = ImageDraw.Draw(img)
    pad = max(2, int(size * 0.03))
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.24), fill=(5, 7, 10, 255),
                        outline=(0, 255, 136, 90), width=max(1, int(size * 0.03)))
    d.rounded_rectangle([int(size * 0.18), int(size * 0.18), int(size * 0.82), int(size * 0.82)],
                        radius=int(size * 0.16), fill=BRAND + (255,))
    f = font(int(size * 0.5), "ExtraBold")
    box = d.textbbox((0, 0), "P", font=f)
    d.text(((size - (box[2] - box[0])) / 2 - box[0], (size - (box[3] - box[1])) / 2 - box[1]), "P", font=f, fill=(4, 22, 12, 255))
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    og_card().save(os.path.join(OUT, "og.png"), "PNG", optimize=True)
    icon(512).save(os.path.join(OUT, "icon-512.png"), "PNG", optimize=True)
    icon(192).save(os.path.join(OUT, "icon-192.png"), "PNG", optimize=True)
    icon(180).save(os.path.join(OUT, "apple-touch-icon.png"), "PNG", optimize=True)
    for name in ("og.png", "icon-512.png", "icon-192.png", "apple-touch-icon.png"):
        path = os.path.join(OUT, name)
        with Image.open(path) as im:
            print(f"{name}: {im.size[0]}x{im.size[1]} {os.path.getsize(path) // 1024} KB")
