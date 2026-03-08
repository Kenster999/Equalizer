# CLAUDE.md — Equalizer Project

## Project Overview
Equalizer is a p5.js math brain teaser game built for OpenProcessing.
Main file: `src/equalizer.js`
Runtime: p5.js on OpenProcessing (browser-based, no build step)

## Repository Structure
- `src/equalizer.js` — the entire game (single file)
- `SPEC.md` — full game design specification
- `CLAUDE.md` — this file

## Standing Instructions
- Always commit directly to main, no PRs needed
- Single-file architecture — all code stays in `src/equalizer.js`
- The GitHub fine-grained access token will be provided at the start of each session
- After making changes, always confirm what was changed and the commit message used

## Coding Conventions
- All magic numbers must be named constants at the top of the file
- Use YYYY-MM-DD format for all dates
- Maintain the modification history comment block at the top of the file
- Area names in code and comments: "main area", "extras area", "scoring area"
- Two-layer rendering: static canvas redraws only on state changes, dynamic layer handles drag and selection outline

## Key Architecture Notes
- `computeLayout()` calculates all dimensions responsively from window size
- `drawStatic()` redraws the static canvas — call `needsRedraw = true` to trigger
- Scoring area is fixed width, full canvas height, right side
- Extras area is top-left, 2 rows of 13 tile types
- Main area is below extras, left side
