# SPEC.md — Equalizer Game Design

## Overview
Equalizer is a math brain teaser game. The player searches for valid
equations within a grid of tiles containing digits (0–9) and symbols
(+, −, =), then selects them by dragging to score points.

## Layout
The canvas has three areas:

**Extras Area** (top-left)
- Full width minus scoring area
- 2 rows × 13 columns of tiles
- Tile types: 0–9, +, −, = (one of each per row)
- Horizontally centered within available space
- Separated from main area by a dashed horizontal line

**Main Area** (below extras, left side)
- 7 rows × 10 columns of tiles (ROWS and COLS are constants)
- Horizontally centered within available space
- Where gameplay takes place

**Scoring Area** (right side)
- Fixed minimum width (enough for 10-char equation + 4-digit score)
- Full canvas height
- Darker background than extras/main areas
- Black text must remain readable

Extras area and main area share the same background color.
Scoring area has a darker background color.
All colors are named constants.

## Tiles
- Square with 1px black border, light background, black text
- Same tile size used throughout all areas
- Tile size computed responsively from window size
- Minimum tile size enforced
- Gap between tiles wide enough to show yellow selection outline
- Corner radius: small, consistent

**Main area tile shading:**
Each time a tile is used in a submitted equation, its background
gets progressively greener:
- 1st use: TILE_USED_TINT_START (e.g. 10% green)
- Each additional use: +TILE_USED_TINT_STEP (e.g. +10%)
- Maximum: TILE_USED_TINT_MAX (e.g. 80%)
All three values are constants.

Green shading reflects only **valid** equation uses (validUseCount).
When an extra tile is dropped onto the grid and triggers re-evaluation,
validUseCount is fully recomputed from scratch across all score entries:
equations that become invalid lose their green contribution; equations
that become valid gain it. This ensures shading always matches current
equation validity.

## Extras Tiles
- 13 types: digits 0–9, plus +, −, =
- 2 rows (identical tile types in each row)
- One-time use — once dragged to main area, cannot be used again
- Empty well appearance: area background color shows through, 1px black border remains
- No replenishment

## Tile Generation (Main Area)
Random, weighted toward digits for solvability:
- TILE_WEIGHT_DIGIT: ~65% chance of a digit
- TILE_WEIGHT_PLUS: ~12%
- TILE_WEIGHT_MINUS: ~13%
- Remainder: =

## Selection Mechanic
- Player places finger on a tile in the main area and drags
- Selection extends in a straight line: horizontal OR vertical only
- Selection is defined by start cell and end cell (two endpoints stored)
- Yellow outline appears centered in the gaps around the selected range
- Outline is one connected rectangle around the entire range
- Single-tile selections are silently ignored
- If finger wanders outside main area during drag: selection stays at
  last valid cell, outline remains visible
- Commit: finger lifts INSIDE a main area tile → evaluate and record
- Cancel: finger lifts OUTSIDE main area → selection silently discarded
- Yellow outline disappears on finger lift regardless of outcome

## Equation Evaluation
Before evaluation, normalize the raw tile string:
- Collapse consecutive = signs into one (e.g. "3==3" → "3=3")
- No other normalization

Evaluation rules:
- Must contain exactly one = after normalization
- Both sides evaluated as standard arithmetic (+ and − only)
- Handles negative numbers (e.g. -0+1=1)
- Handles double negatives (e.g. 1--2=3)
- Mathematically accurate

## Scoring
- Every selection (valid or invalid) is recorded in the scoring area
- Points: n² where n = number of tiles selected (valid equations only)
- Invalid equations score 0 points
- Scoring formula is a constant (easy to change)

**Dynamic re-evaluation:**
When an extra tile is dropped onto a main area tile:
- Find all previously recorded selections whose range includes that cell
- Re-evaluate each using current grid state
- Update equation string and points accordingly
- A previously valid equation may become invalid (score drops to 0)
- A previously invalid equation may become valid (score increases)

## Scoring Area Display
- "TOTAL:" label at top in large font, followed by total points
- List of all selections below, most recent first
- Each entry shows: equation string (raw, as selected) and point value
- Invalid/zero entries displayed in a distinct color (constant: SCORE_INVALID_COLOR)
- Valid entries in standard color (constant: SCORE_VALID_COLOR)
- Equation string is updated if re-evaluation changes it

## Extra Tile Drag Behavior
- Dragged tile follows finger centered on fingertip
- Source slot immediately shows empty well (background color + 1px border)
- Valid drop: finger lifts within a main area tile bounds (not in gap)
- Invalid drop: finger lifts anywhere else → tile animates back to
  source slot (snap-back animation, SNAPBACK_FRAMES constant)
- On valid drop: tile replaces main area tile, source slot stays empty,
  re-evaluation triggered

## Responsive Layout
- All dimensions derived from windowWidth / windowHeight
- p5's windowResized() triggers recompute and redraw
- Scoring area: fixed width, does not grow
- Main area gets priority for available space
- Minimum tile size enforced (MIN_TILE_SIZE constant)

## Performance
- Two-layer rendering:
  1. Static canvas (staticCanvas): redrawn only when state changes
  2. Dynamic layer: runs every frame, handles dragging tile + selection outline
- needsRedraw = true triggers a static redraw on next frame

## No Reset
No in-game reset or new game option.
Player reloads the page to start a new game.

## Platform
- p5.js on OpenProcessing
- Touch events supported (touchStarted, touchMoved, touchEnded)
- Designed for both desktop and mobile/tablet
- Landscape orientation recommended on mobile
