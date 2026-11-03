#!/usr/bin/env python3
"""Draw the Formal Contributions logo set into ./Logo.

The wordmark is set in STIX Two Text (the site's serif) and converted to
outlines, so the SVGs render the same everywhere without a web font.

Needs: python3 with fontTools, `hb-shape` (HarfBuzz) for kerning, and
`rsvg-convert` (librsvg) for the PNG/ICO exports.

    python3 scripts/draw-logo.py [--font /path/to/STIXTwoText.ttf]
"""

from __future__ import annotations

import argparse
import json
import struct
import subprocess
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "Logo"
DEFAULT_FONT = "/System/Library/Fonts/Supplemental/STIXTwoText.ttf"

NAVY = "#16223C"
GOLD = "#A78439"
CREAM = "#F7F6F2"

WEIGHT = 550

# Mark geometry, in an 84 x 84 box centred on (42, 42).
# Proportions measured from the reference artwork.
C = 42.0
REGULAR = dict(r=40.0, ring=4.0, line=4.0, vx=30.35, dot_x=57.7, dot_r=9.4, dot_ring=2.6)
# Heavier strokes so the mark stays legible at 16-48 px.
FAVICON = dict(r=38.0, ring=7.0, line=6.0, vx=29.5, dot_x=58.5, dot_r=11.0, dot_ring=4.5)

# Wordmark placement relative to the 84-unit mark.
FONT_SIZE = 26.0
TEXT_X = 109.6
BASELINES = (35.2, 61.0)


def mark(g: dict, ink: str, dot_ring: str | None = None, cls: str = "") -> str:
    """The circle, the vertical chord, the horizontal radius and the gold dot."""
    r, vx = g["r"], g["vx"]
    half = (r * r - (vx - C) ** 2) ** 0.5
    stroke = f'class="{cls}" ' if cls else f'stroke="{ink}" '
    ring_stroke = f'class="{cls}" ' if cls else f'stroke="{dot_ring or ink}" '
    return (
        f'<g fill="none" {stroke}stroke-width="{g["line"]}">'
        f'<line x1="{vx}" y1="{C - half:.2f}" x2="{vx}" y2="{C + half:.2f}"/>'
        f'<line x1="{vx}" y1="{C}" x2="{C + r}" y2="{C}"/>'
        f"</g>"
        f'<circle {stroke}cx="{C}" cy="{C}" r="{r}" fill="none" stroke-width="{g["ring"]}"/>'
        f'<circle {ring_stroke}cx="{g["dot_x"]}" cy="{C}" r="{g["dot_r"]}" fill="{GOLD}" stroke-width="{g["dot_ring"]}"/>'
    )


def svg(view_w: float, view_h: float, label: str, body: str, view_x: float = 0, view_y: float = 0) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_x} {view_y} {view_w:g} {view_h:g}" '
        f'role="img" aria-label="{label}">\n'
        f"  <title>{label}</title>\n  {body}\n</svg>\n"
    )


class Wordmark:
    def __init__(self, font_path: str):
        self.font_path = font_path
        self.font = TTFont(font_path)
        self.upem = self.font["head"].unitsPerEm
        self.order = self.font.getGlyphOrder()
        self.glyphs = self.font.getGlyphSet(location={"wght": WEIGHT})

    def shape(self, text: str) -> list[dict]:
        out = subprocess.run(
            ["hb-shape", f"--variations=wght={WEIGHT}", "--output-format=json",
             "--no-glyph-names", self.font_path, text],
            check=True, capture_output=True, text=True,
        ).stdout
        return json.loads(out)

    def path(self, text: str, x: float, baseline: float, size: float) -> tuple[str, float]:
        """Outline `text` with its origin at (x, baseline). Returns (path data, advance)."""
        s = size / self.upem
        pen = SVGPathPen(self.glyphs, ntos=lambda v: f"{round(v, 2):g}")
        pen_x = 0
        for g in self.shape(text):
            ox = x + (pen_x + g.get("dx", 0)) * s
            oy = baseline - g.get("dy", 0) * s
            self.glyphs[self.order[g["g"]]].draw(TransformPen(pen, (s, 0, 0, -s, ox, oy)))
            pen_x += g["ax"]
        return pen.getCommands(), pen_x * s


def ico(pngs: list[tuple[int, bytes]]) -> bytes:
    """Pack PNG images into a .ico container (PNG entries are valid since Vista)."""
    header = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, data = b"", b""
    for size, png in pngs:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(png), offset + len(data))
        data += png
    return header + entries + data


def rasterise(src: Path, size: int) -> bytes:
    return subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size), str(src)],
        check=True, capture_output=True,
    ).stdout


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--font", default=DEFAULT_FONT, help="STIX Two Text variable TTF")
    args = parser.parse_args()

    OUT.mkdir(exist_ok=True)
    (OUT / "png").mkdir(exist_ok=True)
    words = Wordmark(args.font)

    # Wordmark outlines, shared by both colourways.
    line1, w1 = words.path("Formal", TEXT_X, BASELINES[0], FONT_SIZE)
    line2, w2 = words.path("Contributions", TEXT_X, BASELINES[1], FONT_SIZE)
    lockup_w = round(TEXT_X + max(w1, w2) + 1, 1)

    files = {
        "mark.svg": svg(84, 84, "Formal Contributions", mark(REGULAR, NAVY)),
        "mark-inverse.svg": svg(84, 84, "Formal Contributions", mark(REGULAR, CREAM)),
        "logo.svg": svg(
            lockup_w, 84, "Formal Contributions",
            mark(REGULAR, NAVY) + f'\n  <path fill="{NAVY}" d="{line1}{line2}"/>',
        ),
        "logo-inverse.svg": svg(
            lockup_w, 84, "Formal Contributions",
            mark(REGULAR, CREAM) + f'\n  <path fill="{CREAM}" d="{line1}{line2}"/>',
        ),
        # Browser-tab icon: heavier strokes, and switches to cream in dark mode.
        "favicon.svg": svg(
            84, 84, "Formal Contributions",
            f"<style>.ink{{stroke:{NAVY}}}"
            f"@media (prefers-color-scheme:dark){{.ink{{stroke:{CREAM}}}}}</style>\n  "
            + mark(FAVICON, NAVY, cls="ink"),
        ),
        # App / touch icon: the favicon mark on a cream rounded square.
        "icon.svg": svg(
            100, 100, "Formal Contributions",
            f'<rect width="100" height="100" rx="22" fill="{CREAM}"/>\n  '
            f'<g transform="translate(13 13) scale({74 / 84:.4f})">{mark(FAVICON, NAVY)}</g>',
        ),
    }
    for name, text in files.items():
        (OUT / name).write_text(text)

    for size in (16, 32, 48):
        (OUT / "png" / f"favicon-{size}.png").write_bytes(rasterise(OUT / "favicon.svg", size))
    for size in (180, 192, 512):
        (OUT / "png" / f"icon-{size}.png").write_bytes(rasterise(OUT / "icon.svg", size))
    (OUT / "png" / "mark-512.png").write_bytes(rasterise(OUT / "mark.svg", 512))
    (OUT / "favicon.ico").write_bytes(
        ico([(s, (OUT / "png" / f"favicon-{s}.png").read_bytes()) for s in (16, 32, 48)])
    )

    print(f"Wrote logo set to {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
