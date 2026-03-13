// =============================================================================
// EQUALIZER - A Math Brain Teaser Game
// Built for OpenProcessing with p5.js
//
// MODIFICATIONS:
// 2026-03-07  Initial version
// 2026-03-07  Fix: extras empty well shows background color with 1px border
// 2026-03-07  Fix: extra tile drag uses finger offset
// 2026-03-07  Fix: reverse snapback animation direction
// 2026-03-07  Fix: tile green shading only on valid equations
// 2026-03-09  Fix: recompute validUseCount on re-evaluation; rename useCount to validUseCount
// 2026-03-09  Fix: cellsInRange always iterates left-to-right or top-to-bottom regardless of drag direction
// 2026-03-09  Fix: replace safeEval with eval()-based implementation; handles leading +, double negatives, leading zeros
// 2026-03-09  Fix: collapse consecutive signs (--,+-,-+) before eval to handle double negatives
// 2026-03-13  Responsive layout: continuous scaling of tile size, gap, and margins from available space
// 2026-03-13  Scoring list oldest-first; silently discard selections without exactly one =
// 2026-03-13  Silently discard duplicate selection ranges
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

// Grid dimensions
const ROWS = 7;
const COLS = 10;
const EXTRA_COLS = 13; // 0-9, +, -, =

// Tile appearance
const TILE_BORDER_COLOR       = '#000000';
const TILE_BORDER_WIDTH       = 1;
const TILE_BG_DEFAULT         = '#f0f0f0';
const TILE_TEXT_COLOR         = '#000000';
const TILE_TEXT_SIZE_RATIO    = 0.45;  // fraction of tile size
const TILE_CORNER_RADIUS      = 4;

// Tile green shading — each use adds this much green darkness (0.0–1.0)
const TILE_USED_TINT_START    = 0.10;  // 10% green on first use
const TILE_USED_TINT_STEP     = 0.10;  // +10% per additional use
const TILE_USED_TINT_MAX      = 0.80;  // cap so text stays visible
const TILE_USED_GREEN         = '#27ae60';

// Extra tile empty well
const EXTRA_WELL_COLOR        = '#000000';

// Selection outline
const SELECTION_COLOR         = '#f1c40f'; // yellow
const SELECTION_STROKE_WIDTH  = 3;

// Invalidated score entry color
const SCORE_INVALID_COLOR     = '#cc0000';
const SCORE_VALID_COLOR       = '#000000';

// Layout colors
const AREA_BG_COLOR           = '#e8e8e8'; // extras + main areas
const SCORING_BG_COLOR        = '#b0b0b0'; // darker but readable
const DIVIDER_COLOR           = '#888888';
const DIVIDER_DASH_ON         = 6;
const DIVIDER_DASH_OFF        = 4;

// Layout sizing — gap and margin are computed from tileSize in computeLayout()
const TILE_GAP_RATIO          = 0.20; // gap = tileSize × ratio, rounded to nearest even int
const MARGIN_RATIO            = 0.30; // margin = tileSize × ratio, rounded to nearest int
const SCORING_WIDTH_RATIO     = 0.18; // scoring area width as fraction of canvas width
const SCORING_MIN_WIDTH       = 100;  // floor for scoring area width
const EXTRAS_ROWS             = 2;
const MIN_TILE_SIZE           = 16;

// Scoring area — entry font/height are computed in computeLayout() as L.entryFontSize / L.entryHeight
const SCORE_TOTAL_FONT_RATIO  = 0.18; // fraction of scoring width
const SCORE_PADDING           = 10;

// Snap-back animation
const SNAPBACK_FRAMES         = 20;

// Extra tile types (2 rows of 13)
const EXTRA_ROW_1 = ['0','1','2','3','4','5','6','7','8','9','+','-','='];
const EXTRA_ROW_2 = ['0','1','2','3','4','5','6','7','8','9','+','-','='];

// Tile pool weights for random generation
const TILE_WEIGHT_DIGIT  = 0.65;
const TILE_WEIGHT_PLUS   = 0.12;
const TILE_WEIGHT_MINUS  = 0.13;
// remainder = '='

// =============================================================================
// STATE
// =============================================================================

// Computed layout (recalculated on resize)
let L = {};

// Two p5 graphics buffers
let staticCanvas;  // redrawn only on state change
let needsRedraw = true;

// Main grid: grid[row][col] = { value: str, validUseCount: int }
let grid = [];

// Extras: extras[row][col] = { value: str, used: bool }
let extras = [];

// Scored selections: { startRow, startCol, endRow, endCol, raw, display, points, valid }
let scores = [];
let totalPoints = 0;

// Active drag-to-select state
let selActive = false;
let selStartCell = null;   // { row, col }
let selEndCell = null;     // { row, col } — last valid cell finger was over
let selOutlineRect = null; // { x, y, w, h } in screen coords

// Active extra tile drag state
let extraDrag = null;
// {
//   srcRow, srcCol,       — origin in extras grid
//   value,                — tile value
//   fingerX, fingerY,     — tile top-left position (finger minus offset)
//   offsetX, offsetY,     — finger position relative to tile top-left at drag start
//   startScreenX,         — tile top-left of origin (for snapback destination)
//   startScreenY,
//   snapback: bool,
//   snapFrame: int
// }

// =============================================================================
// P5 SETUP & DRAW
// =============================================================================

function setup() {
  createCanvas(windowWidth, windowHeight);
  computeLayout();
  staticCanvas = createGraphics(width, height);
  initGame();
}

function draw() {
  if (needsRedraw) {
    drawStatic();
    needsRedraw = false;
  }
  // Blit static canvas
  image(staticCanvas, 0, 0);

  // Dynamic layer: selection outline + dragging tile
  drawSelectionOutline();
  drawDraggingTile();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeLayout();
  staticCanvas.resizeCanvas(width, height);
  needsRedraw = true;
}

// =============================================================================
// LAYOUT COMPUTATION
// =============================================================================

function computeLayout() {
  let W = width;
  let H = height;

  // Scoring area width
  let scoringW = max(SCORING_MIN_WIDTH, floor(W * SCORING_WIDTH_RATIO));

  // --- Width constraint: fit EXTRA_COLS=13 columns (the wider area) ---
  // Exact: tileSize*(EXTRA_COLS + (EXTRA_COLS-1)*TILE_GAP_RATIO + 2*MARGIN_RATIO) = W - scoringW
  // One-pass: estimate tileSize, derive margin, recompute availW
  let tileSizeEstW = (W - scoringW) / (EXTRA_COLS + (EXTRA_COLS - 1) * TILE_GAP_RATIO + 2 * MARGIN_RATIO);
  let marginEstW   = round(tileSizeEstW * MARGIN_RATIO);
  let availW       = W - scoringW - 2 * marginEstW;
  let tileSizeFromWidth = availW / (EXTRA_COLS + (EXTRA_COLS - 1) * TILE_GAP_RATIO);

  // --- Height constraint: fit EXTRAS_ROWS+ROWS=9 rows with 8 gaps + 3 margins ---
  // 3 margins: top, bottom, and divider gap between areas
  let totalRows = EXTRAS_ROWS + ROWS;   // 9
  let totalGaps = totalRows - 1;        // 8
  let tileSizeEstH = H / (totalRows + totalGaps * TILE_GAP_RATIO + 3 * MARGIN_RATIO);
  let marginEstH   = round(tileSizeEstH * MARGIN_RATIO);
  let availH       = H - 3 * marginEstH;
  let tileSizeFromHeight = availH / (totalRows + totalGaps * TILE_GAP_RATIO);

  // Final tile size: smaller of the two constraints, floored, min enforced
  let tileSize = max(MIN_TILE_SIZE, floor(min(tileSizeFromWidth, tileSizeFromHeight)));

  // Derived spacing from final tileSize
  let gap    = round(tileSize * TILE_GAP_RATIO / 2) * 2; // nearest even integer
  let margin = round(tileSize * MARGIN_RATIO);

  // Recompute availW with final margin
  availW = W - scoringW - 2 * margin;

  // Heights
  let extrasH = EXTRAS_ROWS * tileSize + (EXTRAS_ROWS - 1) * gap + 2 * margin;
  let mainH   = ROWS * tileSize + (ROWS - 1) * gap + 2 * margin;
  let dividerY = extrasH;

  // Tile area widths
  let extrasTotalTilesW = EXTRA_COLS * tileSize + (EXTRA_COLS - 1) * gap;
  let mainTotalTilesW   = COLS * tileSize + (COLS - 1) * gap;

  // Offsets: center tile blocks within availW
  let extrasOffsetX = margin + floor((availW - extrasTotalTilesW) / 2);
  let mainOffsetX   = margin + floor((availW - mainTotalTilesW) / 2);
  let mainOffsetY   = extrasH + margin;

  // Scoring area
  let scoringX = W - scoringW - margin;
  let scoringY = 0;
  let scoringH = H;

  // Responsive scoring entry sizes
  let entryFontSize = max(9, floor(tileSize * 0.55));
  let entryHeight   = max(14, floor(entryFontSize * 1.6));

  L = {
    tileSize, gap, margin,
    scoringW, scoringX, scoringY, scoringH,
    extrasH, dividerY,
    extrasOffsetX,
    mainOffsetX, mainOffsetY,
    mainTotalTilesW, mainH,
    availW,
    entryFontSize, entryHeight,
  };
}

// =============================================================================
// GAME INIT
// =============================================================================

function initGame() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = { value: randomTile(), validUseCount: 0 };
    }
  }

  extras = [];
  for (let r = 0; r < EXTRAS_ROWS; r++) {
    extras[r] = [];
    let src = r === 0 ? EXTRA_ROW_1 : EXTRA_ROW_2;
    for (let c = 0; c < EXTRA_COLS; c++) {
      extras[r][c] = { value: src[c], used: false };
    }
  }

  scores = [];
  totalPoints = 0;
  selActive = false;
  selStartCell = null;
  selEndCell = null;
  extraDrag = null;
  needsRedraw = true;
}

function randomTile() {
  let r = random();
  if (r < TILE_WEIGHT_DIGIT) return str(floor(random(10)));
  if (r < TILE_WEIGHT_DIGIT + TILE_WEIGHT_PLUS) return '+';
  if (r < TILE_WEIGHT_DIGIT + TILE_WEIGHT_PLUS + TILE_WEIGHT_MINUS) return '-';
  return '=';
}

// =============================================================================
// STATIC CANVAS DRAW
// =============================================================================

function drawStatic() {
  let g = staticCanvas;
  g.clear();
  g.background(AREA_BG_COLOR);

  drawExtrasArea(g);
  drawDivider(g);
  drawMainArea(g);
  drawScoringArea(g);
}

// --- EXTRAS AREA ---
function drawExtrasArea(g) {
  g.fill(AREA_BG_COLOR);
  g.noStroke();
  g.rect(0, 0, width - L.scoringW - L.margin, L.extrasH);

  for (let r = 0; r < EXTRAS_ROWS; r++) {
    for (let c = 0; c < EXTRA_COLS; c++) {
      let pos = extrasTilePos(r, c);
      let tile = extras[r][c];

      // If this tile is currently being dragged, show empty well
      let isDragging = extraDrag && extraDrag.srcRow === r && extraDrag.srcCol === c;

      if (tile.used || isDragging) {
        // Empty well: area background color with 1px black border
        g.fill(AREA_BG_COLOR);
        g.stroke(TILE_BORDER_COLOR);
        g.strokeWeight(TILE_BORDER_WIDTH);
        g.rect(pos.x, pos.y, L.tileSize, L.tileSize, TILE_CORNER_RADIUS);
      } else {
        drawTileAt(g, pos.x, pos.y, tile.value, 0, false);
      }
    }
  }
}

// --- DASHED DIVIDER ---
function drawDivider(g) {
  g.stroke(DIVIDER_COLOR);
  g.strokeWeight(1);
  g.drawingContext.setLineDash([DIVIDER_DASH_ON, DIVIDER_DASH_OFF]);
  g.line(0, L.dividerY, width - L.scoringW - L.margin, L.dividerY);
  g.drawingContext.setLineDash([]);
}

// --- MAIN AREA ---
function drawMainArea(g) {
  g.fill(AREA_BG_COLOR);
  g.noStroke();
  g.rect(0, L.mainOffsetY - L.margin, width - L.scoringW - L.margin, L.mainH);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let pos = mainTilePos(r, c);
      let tile = grid[r][c];
      drawTileAt(g, pos.x, pos.y, tile.value, tile.validUseCount, true);
    }
  }
}

// --- DRAW A SINGLE TILE ---
function drawTileAt(g, x, y, value, validUseCount, showGreen) {
  let ts = L.tileSize;
  let bgColor = TILE_BG_DEFAULT;

  if (showGreen && validUseCount > 0) {
    let t = min(TILE_USED_TINT_START + (validUseCount - 1) * TILE_USED_TINT_STEP, TILE_USED_TINT_MAX);
    bgColor = lerpColor(color(TILE_BG_DEFAULT), color(TILE_USED_GREEN), t);
  }

  g.fill(bgColor);
  g.stroke(TILE_BORDER_COLOR);
  g.strokeWeight(TILE_BORDER_WIDTH);
  g.rect(x, y, ts, ts, TILE_CORNER_RADIUS);

  g.fill(TILE_TEXT_COLOR);
  g.noStroke();
  g.textAlign(CENTER, CENTER);
  g.textSize(ts * TILE_TEXT_SIZE_RATIO);
  g.textStyle(BOLD);
  g.text(value, x + ts / 2, y + ts / 2);
}

// --- SCORING AREA ---
function drawScoringArea(g) {
  let { scoringX, scoringY, scoringH, scoringW } = L;

  g.fill(SCORING_BG_COLOR);
  g.noStroke();
  g.rect(scoringX, 0, scoringW + L.margin, height);

  // TOTAL label
  let totalFontSize = max(16, floor(scoringW * SCORE_TOTAL_FONT_RATIO));
  g.fill(TILE_TEXT_COLOR);
  g.noStroke();
  g.textAlign(LEFT, TOP);
  g.textStyle(BOLD);
  g.textSize(totalFontSize);
  g.text('TOTAL:', scoringX + SCORE_PADDING, scoringY + SCORE_PADDING);
  g.textSize(totalFontSize * 1.4);
  g.text(totalPoints, scoringX + SCORE_PADDING, scoringY + SCORE_PADDING + totalFontSize + 4);

  // Entries
  let entryStartY = scoringY + SCORE_PADDING + totalFontSize * 2.6 + 8;
  g.textSize(L.entryFontSize);
  g.textStyle(NORMAL);

  for (let i = 0; i < scores.length; i++) {
    let entry = scores[i];
    let ey = entryStartY + i * L.entryHeight;

    g.fill(entry.valid ? SCORE_VALID_COLOR : SCORE_INVALID_COLOR);
    g.textAlign(LEFT, TOP);
    g.text(entry.display, scoringX + SCORE_PADDING, ey);
    g.textAlign(RIGHT, TOP);
    g.text(entry.points, scoringX + scoringW - SCORE_PADDING, ey);
  }
}

// =============================================================================
// DYNAMIC LAYER
// =============================================================================

function drawSelectionOutline() {
  if (!selActive || !selStartCell || !selEndCell) return;

  let start = mainTilePos(selStartCell.row, selStartCell.col);
  let end   = mainTilePos(selEndCell.row, selEndCell.col);
  let ts = L.tileSize;
  let halfGap = L.gap / 2;

  let x1 = min(start.x, end.x) - halfGap;
  let y1 = min(start.y, end.y) - halfGap;
  let x2 = max(start.x, end.x) + ts + halfGap;
  let y2 = max(start.y, end.y) + ts + halfGap;

  noFill();
  stroke(SELECTION_COLOR);
  strokeWeight(SELECTION_STROKE_WIDTH);
  rect(x1, y1, x2 - x1, y2 - y1, TILE_CORNER_RADIUS);
}

function drawDraggingTile() {
  if (!extraDrag) return;

  let ts = L.tileSize;
  let x, y;

  if (extraDrag.snapback) {
    // Interpolate tile top-left from release position back to origin
    // t goes 1 → 0 as snapFrame counts down, so lerp moves fingerX → startScreenX
    let t = extraDrag.snapFrame / SNAPBACK_FRAMES;
    x = lerp(extraDrag.startScreenX, extraDrag.fingerX, t);
    y = lerp(extraDrag.startScreenY, extraDrag.fingerY, t);
    extraDrag.snapFrame--;  // decrement after using current frame
    if (extraDrag.snapFrame <= 0) {
      extraDrag = null;
      needsRedraw = true;
      return;
    }
  } else {
    // fingerX/Y is already the tile top-left (finger minus offset)
    x = extraDrag.fingerX;
    y = extraDrag.fingerY;
  }

  // Draw tile at top-left (x, y)
  fill(TILE_BG_DEFAULT);
  stroke(TILE_BORDER_COLOR);
  strokeWeight(TILE_BORDER_WIDTH + 1);
  rect(x, y, ts, ts, TILE_CORNER_RADIUS);
  fill(TILE_TEXT_COLOR);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(ts * TILE_TEXT_SIZE_RATIO);
  textStyle(BOLD);
  text(extraDrag.value, x + ts / 2, y + ts / 2);
}

// =============================================================================
// INPUT
// =============================================================================

function mousePressed() {
  // Check extras area for drag start
  let ec = extrasCell(mouseX, mouseY);
  if (ec && !extras[ec.row][ec.col].used) {
    let pos = extrasTilePos(ec.row, ec.col);
    let offsetX = mouseX - pos.x;
    let offsetY = mouseY - pos.y;
    extraDrag = {
      srcRow: ec.row,
      srcCol: ec.col,
      value: extras[ec.row][ec.col].value,
      fingerX: pos.x,         // tile top-left: starts at origin
      fingerY: pos.y,
      offsetX,                // finger offset from tile top-left
      offsetY,
      startScreenX: pos.x,    // origin top-left (snapback destination)
      startScreenY: pos.y,
      snapback: false,
      snapFrame: 0,
    };
    needsRedraw = true; // redraw to show empty well
    return;
  }

  // Check main area for selection start
  let mc = mainCell(mouseX, mouseY);
  if (mc) {
    selActive = true;
    selStartCell = mc;
    selEndCell = mc;
  }
}

function mouseDragged() {
  if (extraDrag && !extraDrag.snapback) {
    extraDrag.fingerX = mouseX - extraDrag.offsetX;
    extraDrag.fingerY = mouseY - extraDrag.offsetY;
    return;
  }

  if (!selActive || !selStartCell) return;
  let mc = mainCell(mouseX, mouseY);
  if (mc) {
    // Only extend if same axis
    let dr = mc.row - selStartCell.row;
    let dc = mc.col - selStartCell.col;
    if (dr === 0 || dc === 0) {
      selEndCell = mc;
    }
    // If diagonal, keep last valid selEndCell
  }
}

function mouseReleased() {
  // Handle extra tile drop
  if (extraDrag && !extraDrag.snapback) {
    let mc = mainCell(mouseX, mouseY);
    if (mc) {
      // Valid drop — replace tile
      let oldValue = grid[mc.row][mc.col].value;
      grid[mc.row][mc.col].value = extraDrag.value;
      grid[mc.row][mc.col].validUseCount = 0;
      extras[extraDrag.srcRow][extraDrag.srcCol].used = true;
      extraDrag = null;

      // Re-evaluate all scores that contain this cell
      reEvaluateScoresAt(mc.row, mc.col);
      needsRedraw = true;
    } else {
      // Invalid drop — snapback
      extraDrag.snapback = true;
      extraDrag.snapFrame = SNAPBACK_FRAMES;
      // Store visual tile top-left at release as snapback start
      extraDrag.fingerX = mouseX - extraDrag.offsetX;
      extraDrag.fingerY = mouseY - extraDrag.offsetY;
    }
    return;
  }

  // Handle selection commit
  if (selActive && selStartCell && selEndCell) {
    // Must lift inside main area
    let mc = mainCell(mouseX, mouseY);
    if (mc) {
      // Must be more than one cell
      if (selStartCell.row !== selEndCell.row || selStartCell.col !== selEndCell.col) {
        commitSelection();
      }
    }
    // Otherwise silently cancel
  }

  selActive = false;
  selStartCell = null;
  selEndCell = null;
}

// Touch support
function touchStarted() { mousePressed(); return false; }
function touchMoved()   { mouseDragged(); return false; }
function touchEnded()   { mouseReleased(); return false; }

// =============================================================================
// SELECTION & EVALUATION
// =============================================================================

function commitSelection() {
  // Normalize range to ascending row/col
  let normStart = { row: min(selStartCell.row, selEndCell.row), col: min(selStartCell.col, selEndCell.col) };
  let normEnd   = { row: max(selStartCell.row, selEndCell.row), col: max(selStartCell.col, selEndCell.col) };

  // Silently discard duplicate ranges
  if (scores.some(e =>
    e.startRow === normStart.row && e.startCol === normStart.col &&
    e.endRow   === normEnd.row   && e.endCol   === normEnd.col
  )) return;

  let cells = cellsInRange(normStart, normEnd);
  let raw = cells.map(c => grid[c.row][c.col].value).join('');
  let display = raw;
  let normalized = normalizeEquation(raw);
  // Silently discard if not exactly one '='
  if ((normalized.match(/=/g) || []).length !== 1) return;
  let valid = isValidEquation(normalized);
  let pts = valid ? cells.length * cells.length : 0;

  scores.push({
    startRow: normStart.row,
    startCol: normStart.col,
    endRow:   normEnd.row,
    endCol:   normEnd.col,
    raw,
    display,
    points: pts,
    valid,
  });

  recomputeValidUseCounts();
  totalPoints += pts;
  needsRedraw = true;
}

function reEvaluateScoresAt(row, col) {
  totalPoints = 0;
  for (let entry of scores) {
    let cells = cellsInRange(
      { row: entry.startRow, col: entry.startCol },
      { row: entry.endRow,   col: entry.endCol }
    );

    // Check if this cell is in the range
    let affected = cells.some(c => c.row === row && c.col === col);
    if (affected) {
      // Rebuild raw string from current grid
      entry.raw     = cells.map(c => grid[c.row][c.col].value).join('');
      entry.display = entry.raw;
      let normalized = normalizeEquation(entry.raw);
      entry.valid   = isValidEquation(normalized);
      entry.points  = entry.valid ? cells.length * cells.length : 0;
    }

    totalPoints += entry.points;
  }
  recomputeValidUseCounts();
}

function recomputeValidUseCounts() {
  // Zero out all tile validUseCount values
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r][c].validUseCount = 0;
    }
  }
  // For each valid score entry, increment validUseCount for every tile in its range
  for (let entry of scores) {
    if (entry.valid) {
      let cells = cellsInRange(
        { row: entry.startRow, col: entry.startCol },
        { row: entry.endRow,   col: entry.endCol }
      );
      for (let cell of cells) {
        grid[cell.row][cell.col].validUseCount++;
      }
    }
  }
}

// =============================================================================
// EQUATION LOGIC
// =============================================================================

function normalizeEquation(expr) {
  // Collapse consecutive '=' signs into one
  return expr.replace(/=+/g, '=');
}

function isValidEquation(expr) {
  // Must contain exactly one '='
  let parts = expr.split('=');
  if (parts.length !== 2) return false;
  let [left, right] = parts;
  if (!left || !right) return false;

  let lVal = safeEval(left);
  let rVal = safeEval(right);
  if (lVal === null || rVal === null) return false;
  return lVal === rVal;
}

function collapseSigns(expr) {
  let prev;
  do {
    prev = expr;
    expr = expr.replace(/--/g, '+')
               .replace(/\+-/g, '-')
               .replace(/-\+/g, '-');
  } while (expr !== prev);
  return expr;
}

function safeEval(expr) {
  // Whitelist: only digits, +, and - allowed
  if (!/^[0-9+\-]+$/.test(expr)) return null;
  expr = collapseSigns(expr);
  try {
    let result = eval(expr);
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch(e) {
    return null;
  }
}

// =============================================================================
// COORDINATE HELPERS
// =============================================================================

function extrasTilePos(row, col) {
  let x = L.extrasOffsetX + col * (L.tileSize + L.gap);
  let y = L.margin + row * (L.tileSize + L.gap);
  return { x, y };
}

function mainTilePos(row, col) {
  let x = L.mainOffsetX + col * (L.tileSize + L.gap);
  let y = L.mainOffsetY + row * (L.tileSize + L.gap);
  return { x, y };
}

function extrasCell(mx, my) {
  for (let r = 0; r < EXTRAS_ROWS; r++) {
    for (let c = 0; c < EXTRA_COLS; c++) {
      let pos = extrasTilePos(r, c);
      if (mx >= pos.x && mx <= pos.x + L.tileSize &&
          my >= pos.y && my <= pos.y + L.tileSize) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function mainCell(mx, my) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let pos = mainTilePos(r, c);
      if (mx >= pos.x && mx <= pos.x + L.tileSize &&
          my >= pos.y && my <= pos.y + L.tileSize) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function cellsInRange(start, end) {
  let cells = [];
  let r0 = min(start.row, end.row);
  let r1 = max(start.row, end.row);
  let c0 = min(start.col, end.col);
  let c1 = max(start.col, end.col);

  if (r0 === r1) {
    // Horizontal
    for (let c = c0; c <= c1; c++) cells.push({ row: r0, col: c });
  } else {
    // Vertical
    for (let r = r0; r <= r1; r++) cells.push({ row: r, col: c0 });
  }
  return cells;
}
