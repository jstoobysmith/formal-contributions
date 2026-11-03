"""Draws the section badges (and the test badge): the site logo with the section's numeral.

    python3 scripts/draw-badges.py   # writes public/badges/<section>.svg

The colours and the logo mark come from scripts/draw-logo.py.
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("draw_logo", ROOT / "scripts" / "draw-logo.py")
logo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(logo)

INK, ACCENT, PAPER = logo.NAVY, logo.GOLD, logo.CREAM
ACCENT_TEXT = "#86672A"  # darker gold, so the small lettering stays readable on cream
MONO = "Menlo, Consolas, 'Courier New', monospace"

# The logo mark in the middle of the badge, about 134 units across, centred on (200, MARK_Y).
MARK_SCALE = 1.6
MARK_Y = 182


def badge(section):
    numeral = section["numeral"]
    bottom = "TEST · NOT A REAL REPORT" if section.get("test") else f"SECTION {numeral} · {section['name'].upper()}"
    offset = 42 * MARK_SCALE
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="{section["reportName"]}">
  <title>{section["reportName"]}</title>
  <defs>
    <path id="top" d="M 62,200 A 138,138 0 0 1 338,200"/>
    <path id="bottom" d="M 52,200 A 148,148 0 0 0 348,200"/>
  </defs>
  <circle cx="200" cy="200" r="194" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="{ACCENT}" stroke-width="1.5"/>
  <text font-family="{MONO}" font-size="17" font-weight="600" letter-spacing="4" fill="{INK}" text-anchor="middle">
    <textPath href="#top" startOffset="50%">FORMAL · CONTRIBUTIONS</textPath>
  </text>
  <text font-family="{MONO}" font-size="15" font-weight="500" letter-spacing="3" fill="{ACCENT_TEXT}" text-anchor="middle">
    <textPath href="#bottom" startOffset="50%">{bottom}</textPath>
  </text>
  <g transform="translate({200 - offset:.1f} {MARK_Y - offset:.1f}) scale({MARK_SCALE})">{logo.mark(logo.REGULAR, INK)}</g>
  <text x="200" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-style="italic" fill="{INK}" text-anchor="middle">{numeral}</text>
  <circle cx="44" cy="200" r="3.5" fill="{INK}"/>
  <circle cx="356" cy="200" r="3.5" fill="{INK}"/>
</svg>
'''


sections = json.loads((ROOT / "config" / "sections.json").read_text())
out = ROOT / "public" / "badges"
out.mkdir(parents=True, exist_ok=True)
for s in sections:
    (out / f"{s['id']}.svg").write_text(badge(s))
    print("wrote", out / f"{s['id']}.svg")
