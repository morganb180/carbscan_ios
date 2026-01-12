# CarbScan Scripts

This directory contains build and asset generation scripts.

## SVG Generation

### Generate Honest Plate Illustration

The `generate_honest_plate_svg.py` script creates the "Honest Plate" line-art SVG used on the Welcome screen.

#### Prerequisites

```bash
pip install svgwrite
```

#### How to Run

```bash
# From project root
npm run gen:svg

# Or directly with Python
python scripts/generate_honest_plate_svg.py
```

#### Output

The script generates:
- `assets/illustrations/honest_plate.svg`

#### Design Spec

- Minimal line art, calm and modern aesthetic
- Imperfect plate outline with slight wobble for organic feel
- 2 organic food blobs positioned inside the plate
- 3 tiny crumb strokes (very restrained)
- Stroke color: warm charcoal `#2B2B2B`
- Stroke width: 2px (renders ~1.5px at typical display sizes)
- Round line caps and joins
- No fill (transparent)
- ViewBox: `0 0 512 512`
- Deterministic output (seeded randomness for reproducibility)

## Other Scripts

### build.js

Expo build helper script for static builds.
