const { test } = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

const game = loadGame();

test('stepPhysics applies gravity then integrates position (semi-implicit Euler)', () => {
  // GRAVITY=1400, dt=0.1 -> velocity 0 + 140 = 140; y 100 + 140*0.1 = 114
  const next = game.stepPhysics({ y: 100, velocity: 0 }, 0.1);
  assert.ok(Math.abs(next.velocity - 140) < 1e-9, `velocity was ${next.velocity}`);
  assert.ok(Math.abs(next.y - 114) < 1e-9, `y was ${next.y}`);
});

test('stepPhysics does not mutate the input eagle', () => {
  const eagle = { y: 100, velocity: 0 };
  game.stepPhysics(eagle, 0.1);
  assert.strictEqual(eagle.y, 100);
  assert.strictEqual(eagle.velocity, 0);
});

test('rectsOverlap is true for overlapping rects, false for disjoint', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.strictEqual(game.rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.strictEqual(game.rectsOverlap(a, { x: 20, y: 0, w: 10, h: 10 }), false);
  // Edge-touching is NOT overlap (strict inequality)
  assert.strictEqual(game.rectsOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), false);
});

test('eagleHitsPipe true when eagle is inside the top segment', () => {
  // Pipe at the eagle's x; gap from 300..460. Eagle at y=10 is in the top segment.
  const pipe = { x: EAGLE_X_FOR_TEST(), gapY: 300, scored: false };
  assert.strictEqual(game.eagleHitsPipe({ y: 10, velocity: 0 }, pipe), true);
});

test('eagleHitsPipe false when eagle is within the gap', () => {
  const pipe = { x: EAGLE_X_FOR_TEST(), gapY: 300, scored: false };
  assert.strictEqual(game.eagleHitsPipe({ y: 350, velocity: 0 }, pipe), false);
});

test('eagleHitsPipe false when pipe is far to the right of the eagle', () => {
  const pipe = { x: 380, gapY: 300, scored: false };
  assert.strictEqual(game.eagleHitsPipe({ y: 10, velocity: 0 }, pipe), false);
});

test('eagleHitsPipe true when eagle is inside the bottom segment', () => {
  // Pipe gap is 300..460; bottom segment is 460..520. Eagle at y=470 overlaps it.
  const pipe = { x: EAGLE_X_FOR_TEST(), gapY: 300, scored: false };
  assert.strictEqual(game.eagleHitsPipe({ y: 470, velocity: 0 }, pipe), true);
});

// Helper: eagle x is fixed at 100; place the pipe so it overlaps that column.
function EAGLE_X_FOR_TEST() { return 90; }

test('checkBounds true at/above ceiling', () => {
  assert.strictEqual(game.checkBounds({ y: 0, velocity: 0 }), true);
  assert.strictEqual(game.checkBounds({ y: -5, velocity: 0 }), true);
});

test('checkBounds true when eagle bottom reaches the ground', () => {
  // PLAYFIELD_BOTTOM=520, EAGLE_SIZE=34 -> y >= 486 hits ground
  assert.strictEqual(game.checkBounds({ y: 486, velocity: 0 }), true);
});

test('checkBounds false when comfortably mid-air', () => {
  assert.strictEqual(game.checkBounds({ y: 200, velocity: 0 }), false);
});

test('updateScore increments once when a pipe passes the eagle and marks it scored', () => {
  // EAGLE_X=100, PIPE_WIDTH=60 -> pipe is "passed" when pipe.x + 60 < 100, i.e. pipe.x < 40
  const pipes = [{ x: 30, gapY: 200, scored: false }];
  const score = game.updateScore({ y: 0, velocity: 0 }, pipes, 0);
  assert.strictEqual(score, 1);
  assert.strictEqual(pipes[0].scored, true);
});

test('updateScore does not double-count an already-scored pipe', () => {
  const pipes = [{ x: 30, gapY: 200, scored: true }];
  const score = game.updateScore({ y: 0, velocity: 0 }, pipes, 5);
  assert.strictEqual(score, 5);
});

test('updateScore does not count a pipe still ahead of the eagle', () => {
  const pipes = [{ x: 200, gapY: 200, scored: false }];
  const score = game.updateScore({ y: 0, velocity: 0 }, pipes, 0);
  assert.strictEqual(score, 0);
  assert.strictEqual(pipes[0].scored, false);
});

test('spawnPipe places the pipe at the right edge, unscored, gap within bounds', () => {
  // minGapY=40, maxGapY = 520-160-40 = 320
  const atTop = game.spawnPipe(() => 0);
  assert.strictEqual(atTop.x, 400);
  assert.strictEqual(atTop.scored, false);
  assert.ok(Math.abs(atTop.gapY - 40) < 1e-9, `gapY was ${atTop.gapY}`);

  const mid = game.spawnPipe(() => 0.5);
  // 40 + 0.5 * (320 - 40) = 180
  assert.ok(Math.abs(mid.gapY - 180) < 1e-9, `gapY was ${mid.gapY}`);

  const atBottom = game.spawnPipe(() => 1);
  assert.ok(Math.abs(atBottom.gapY - 320) < 1e-9, `gapY was ${atBottom.gapY}`);
});

test('pipeRects returns top and bottom segments with correct heights', () => {
  // gapY=300, PIPE_GAP_HEIGHT=160 -> gap 300..460; PLAYFIELD_BOTTOM=520, PIPE_WIDTH=60
  const rects = game.pipeRects({ x: 200, gapY: 300, scored: false });
  assert.strictEqual(rects.length, 2);
  const [top, bottom] = rects;
  assert.strictEqual(top.x, 200);
  assert.strictEqual(top.y, 0);
  assert.strictEqual(top.w, 60);
  assert.strictEqual(top.h, 300);
  assert.strictEqual(bottom.x, 200);
  assert.strictEqual(bottom.y, 460);
  assert.strictEqual(bottom.w, 60);
  assert.strictEqual(bottom.h, 60);
});
