#!/usr/bin/env python3
"""
Generate the "Honest Plate" continuous single-line SVG illustration for CarbScan.

Design spec:
- Single continuous line art (pen never lifts)
- Flowing hand-drawn aesthetic
- Elements: placemat, plate, chicken, rice, salad, fork, knife, glass
- Stroke: warm charcoal #2B2B2B
- Stroke width: 2.5px for hand-drawn feel
- Round line caps + joins
- No fill
- ViewBox: 0 0 512 512

Usage:
    python scripts/generate_honest_plate_svg.py
"""

import math
import os

# SVG settings
VIEWBOX_SIZE = 512
STROKE_COLOR = "#2B2B2B"
STROKE_WIDTH = 2.5
CENTER_X = VIEWBOX_SIZE / 2
CENTER_Y = VIEWBOX_SIZE / 2

# Scale factor for food (20% bigger)
FOOD_SCALE = 1.2


def smooth_curve(points: list[tuple[float, float]], tension: float = 0.3) -> str:
    """Generate smooth bezier curve through points."""
    if len(points) < 2:
        return ""

    path = f"M {points[0][0]:.1f} {points[0][1]:.1f}"

    for i in range(1, len(points)):
        p0 = points[max(0, i - 2)]
        p1 = points[i - 1]
        p2 = points[i]
        p3 = points[min(len(points) - 1, i + 1)]

        # Control points
        cp1x = p1[0] + (p2[0] - p0[0]) * tension
        cp1y = p1[1] + (p2[1] - p0[1]) * tension
        cp2x = p2[0] - (p3[0] - p1[0]) * tension
        cp2y = p2[1] - (p3[1] - p1[1]) * tension

        path += f" C {cp1x:.1f} {cp1y:.1f} {cp2x:.1f} {cp2y:.1f} {p2[0]:.1f} {p2[1]:.1f}"

    return path


def generate_continuous_path() -> str:
    """Generate a single continuous line drawing the entire scene."""

    # All points in drawing order - one continuous line
    points = []

    # === START: Bottom left of placemat ===
    placemat_left = 60
    placemat_right = 452
    placemat_top = 120
    placemat_bottom = 400
    placemat_radius = 20

    # Start point
    points.append((placemat_left, placemat_bottom - placemat_radius))

    # === PLACEMAT (rounded rectangle, clockwise) ===
    # Left side up
    points.append((placemat_left, placemat_top + placemat_radius))
    # Top left corner
    points.append((placemat_left + placemat_radius, placemat_top))
    # Top edge
    points.append((placemat_right - placemat_radius, placemat_top))
    # Top right corner
    points.append((placemat_right, placemat_top + placemat_radius))
    # Right side down
    points.append((placemat_right, placemat_bottom - placemat_radius))
    # Bottom right corner
    points.append((placemat_right - placemat_radius, placemat_bottom))
    # Bottom edge back
    points.append((placemat_left + placemat_radius, placemat_bottom))
    # Complete placemat
    points.append((placemat_left, placemat_bottom - placemat_radius))

    # === TRANSITION to fork (left side) ===
    fork_x = 95
    fork_top = 160
    fork_bottom = 360

    points.append((fork_x, placemat_bottom - 60))

    # === FORK ===
    # Handle
    points.append((fork_x, fork_bottom))
    points.append((fork_x, fork_bottom - 40))
    # Neck
    points.append((fork_x, fork_top + 60))
    # Tines (4 prongs with loops)
    tine_width = 18
    tine_start = fork_x - tine_width/2

    # Left tine
    points.append((tine_start, fork_top + 50))
    points.append((tine_start, fork_top))
    points.append((tine_start + 2, fork_top + 45))

    # Second tine
    points.append((tine_start + 6, fork_top))
    points.append((tine_start + 8, fork_top + 45))

    # Third tine
    points.append((tine_start + 12, fork_top))
    points.append((tine_start + 14, fork_top + 45))

    # Fourth tine
    points.append((tine_start + 18, fork_top))
    points.append((tine_start + 18, fork_top + 50))

    # Back to handle base
    points.append((fork_x, fork_top + 60))

    # === TRANSITION to plate ===
    plate_cx = CENTER_X
    plate_cy = CENTER_Y + 20
    plate_outer_r = 130
    plate_inner_r = 105

    # Move to plate starting point (left side)
    points.append((fork_x + 20, plate_cy))
    points.append((plate_cx - plate_outer_r, plate_cy))

    # === OUTER PLATE (full circle with slight wobble) ===
    num_plate_points = 32
    for i in range(num_plate_points + 1):
        angle = math.pi + (2 * math.pi * i / num_plate_points)
        wobble = 2 * math.sin(angle * 5)  # Subtle wobble
        r = plate_outer_r + wobble
        x = plate_cx + r * math.cos(angle)
        y = plate_cy + r * math.sin(angle)
        points.append((x, y))

    # === SPIRAL INTO INNER PLATE ===
    # Transition from outer to inner
    for i in range(8):
        t = i / 7
        angle = math.pi + (math.pi * 0.3 * t)
        r = plate_outer_r - (plate_outer_r - plate_inner_r) * t
        x = plate_cx + r * math.cos(angle)
        y = plate_cy + r * math.sin(angle)
        points.append((x, y))

    # === INNER PLATE (partial, then into food) ===
    for i in range(20):
        angle = math.pi * 1.3 + (1.4 * math.pi * i / 19)
        wobble = 1.5 * math.sin(angle * 6)
        r = plate_inner_r + wobble
        x = plate_cx + r * math.cos(angle)
        y = plate_cy + r * math.sin(angle)
        points.append((x, y))

    # === TRANSITION TO SALAD (top area) ===
    salad_cx = plate_cx - 10
    salad_cy = plate_cy - 50 * FOOD_SCALE
    salad_r = 38 * FOOD_SCALE

    points.append((salad_cx + salad_r, salad_cy + 10))

    # === SALAD (bowl with leaves) ===
    # Bowl curve
    points.append((salad_cx + salad_r, salad_cy + 15))
    points.append((salad_cx + salad_r * 0.5, salad_cy + salad_r * 0.7))
    points.append((salad_cx, salad_cy + salad_r * 0.7))
    points.append((salad_cx - salad_r * 0.5, salad_cy + salad_r * 0.7))
    points.append((salad_cx - salad_r, salad_cy + 15))

    # Lettuce leaf 1 (left)
    points.append((salad_cx - salad_r * 0.7, salad_cy))
    points.append((salad_cx - salad_r * 0.9, salad_cy - salad_r * 0.5))
    points.append((salad_cx - salad_r * 0.5, salad_cy - salad_r * 0.7))
    points.append((salad_cx - salad_r * 0.3, salad_cy - salad_r * 0.3))

    # Lettuce leaf 2 (center)
    points.append((salad_cx, salad_cy - salad_r * 0.2))
    points.append((salad_cx, salad_cy - salad_r * 0.9))
    points.append((salad_cx + salad_r * 0.2, salad_cy - salad_r * 0.4))

    # Lettuce leaf 3 (right)
    points.append((salad_cx + salad_r * 0.4, salad_cy - salad_r * 0.3))
    points.append((salad_cx + salad_r * 0.8, salad_cy - salad_r * 0.6))
    points.append((salad_cx + salad_r * 0.6, salad_cy))

    # Cherry tomato (small loop)
    tomato_cx = salad_cx + salad_r * 0.3
    tomato_cy = salad_cy - salad_r * 0.1
    tomato_r = 10 * FOOD_SCALE
    for i in range(9):
        angle = -math.pi/2 + (2 * math.pi * i / 8)
        x = tomato_cx + tomato_r * math.cos(angle)
        y = tomato_cy + tomato_r * math.sin(angle)
        points.append((x, y))

    # === TRANSITION TO CHICKEN ===
    chicken_cx = plate_cx + 50 * FOOD_SCALE
    chicken_cy = plate_cy + 10
    chicken_w = 42 * FOOD_SCALE
    chicken_h = 28 * FOOD_SCALE

    points.append((chicken_cx - chicken_w, chicken_cy))

    # === CHICKEN BREAST ===
    # Oval outline
    for i in range(17):
        angle = math.pi + (2 * math.pi * i / 16)
        wobble = 2 * math.sin(angle * 3)
        x = chicken_cx + (chicken_w + wobble) * math.cos(angle)
        y = chicken_cy + (chicken_h + wobble * 0.5) * math.sin(angle)
        points.append((x, y))

    # Grill mark 1
    points.append((chicken_cx - chicken_w * 0.6, chicken_cy - chicken_h * 0.5))
    points.append((chicken_cx + chicken_w * 0.6, chicken_cy - chicken_h * 0.7))

    # Loop back for grill mark 2
    points.append((chicken_cx + chicken_w * 0.5, chicken_cy))
    points.append((chicken_cx - chicken_w * 0.6, chicken_cy + chicken_h * 0.2))
    points.append((chicken_cx + chicken_w * 0.6, chicken_cy))

    # Grill mark 3
    points.append((chicken_cx + chicken_w * 0.4, chicken_cy + chicken_h * 0.5))
    points.append((chicken_cx - chicken_w * 0.5, chicken_cy + chicken_h * 0.7))
    points.append((chicken_cx + chicken_w * 0.5, chicken_cy + chicken_h * 0.5))

    # === TRANSITION TO RICE ===
    rice_cx = plate_cx - 60 * FOOD_SCALE
    rice_cy = plate_cy + 20
    rice_w = 35 * FOOD_SCALE
    rice_h = 25 * FOOD_SCALE

    points.append((chicken_cx, chicken_cy + chicken_h))
    points.append((rice_cx + rice_w, rice_cy + rice_h * 0.5))

    # === RICE MOUND ===
    # Dome shape
    points.append((rice_cx + rice_w, rice_cy + rice_h * 0.3))
    points.append((rice_cx + rice_w * 0.5, rice_cy - rice_h * 0.8))
    points.append((rice_cx, rice_cy - rice_h))
    points.append((rice_cx - rice_w * 0.5, rice_cy - rice_h * 0.8))
    points.append((rice_cx - rice_w, rice_cy + rice_h * 0.3))

    # Rice grain texture (small zigzag inside)
    points.append((rice_cx - rice_w * 0.6, rice_cy - rice_h * 0.2))
    points.append((rice_cx - rice_w * 0.3, rice_cy - rice_h * 0.5))
    points.append((rice_cx, rice_cy - rice_h * 0.3))
    points.append((rice_cx + rice_w * 0.3, rice_cy - rice_h * 0.6))
    points.append((rice_cx + rice_w * 0.5, rice_cy - rice_h * 0.2))
    points.append((rice_cx + rice_w * 0.2, rice_cy))
    points.append((rice_cx - rice_w * 0.2, rice_cy - rice_h * 0.1))

    # === TRANSITION OUT OF PLATE TO KNIFE ===
    knife_x = 417
    knife_top = 160
    knife_bottom = 360

    # Flow to right side
    points.append((rice_cx, rice_cy + rice_h * 0.3))
    points.append((plate_cx + plate_inner_r * 0.7, plate_cy + plate_inner_r * 0.5))
    points.append((plate_cx + plate_outer_r, plate_cy + 30))
    points.append((knife_x, plate_cy + 60))

    # === KNIFE ===
    # Handle
    points.append((knife_x, knife_bottom))
    points.append((knife_x, knife_bottom - 30))

    # Blade back
    points.append((knife_x, knife_top + 30))
    points.append((knife_x, knife_top))

    # Blade edge (pointed tip)
    points.append((knife_x - 8, knife_top + 5))
    points.append((knife_x - 10, knife_top + 40))
    points.append((knife_x - 8, knife_bottom - 35))

    # Back to handle
    points.append((knife_x, knife_bottom - 30))

    # === TRANSITION TO GLASS ===
    glass_cx = 420
    glass_cy = 100
    glass_w = 25
    glass_h = 50

    points.append((knife_x, knife_top + 20))
    points.append((glass_cx, glass_cy + glass_h))

    # === WATER GLASS ===
    # Left side up
    points.append((glass_cx - glass_w, glass_cy + glass_h))
    points.append((glass_cx - glass_w * 0.8, glass_cy))

    # Rim
    points.append((glass_cx - glass_w * 0.8, glass_cy - 5))
    points.append((glass_cx + glass_w * 0.8, glass_cy - 5))
    points.append((glass_cx + glass_w * 0.8, glass_cy))

    # Right side down
    points.append((glass_cx + glass_w, glass_cy + glass_h))

    # Bottom curve
    points.append((glass_cx + glass_w * 0.3, glass_cy + glass_h + 5))
    points.append((glass_cx - glass_w * 0.3, glass_cy + glass_h + 5))
    points.append((glass_cx - glass_w, glass_cy + glass_h))

    # Water line inside
    points.append((glass_cx - glass_w * 0.6, glass_cy + glass_h * 0.4))
    points.append((glass_cx + glass_w * 0.6, glass_cy + glass_h * 0.4))

    # === END ===
    # Finish with a small flourish
    points.append((glass_cx + glass_w * 0.8, glass_cy + glass_h * 0.6))

    return smooth_curve(points, tension=0.25)


def generate_honest_plate_svg(output_path: str) -> None:
    """Generate the complete single-line Honest Plate SVG."""

    svg_content = f'''<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{VIEWBOX_SIZE}px"
     height="{VIEWBOX_SIZE}px"
     viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}">
  <path d="{generate_continuous_path()}"
        fill="none"
        stroke="{STROKE_COLOR}"
        stroke-width="{STROKE_WIDTH}"
        stroke-linecap="round"
        stroke-linejoin="round"/>
</svg>'''

    with open(output_path, 'w') as f:
        f.write(svg_content)

    print(f"Generated: {output_path}")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    output_dir = os.path.join(project_root, "assets", "illustrations")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "honest_plate.svg")
    generate_honest_plate_svg(output_path)


if __name__ == "__main__":
    main()
