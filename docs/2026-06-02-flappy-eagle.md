# Make Flappy Bird Great Again — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single self-contained `flappy-eagle/index.html` Flappy Bird clone with a patriotic "Make Flappy Bird Great Again" theme (bald-eagle player, stars-and-stripes background).

**Architecture:** One HTML file with inline `<style>`, `<canvas>`, and `<script>`. The script defines pure game-logic functions (physics, collision, score, pipe spawning) at the top, exports them behind a `module.exports` guard for Node testing, then wires up canvas/input/render/RAF loop behind a browser guard. Pure logic is unit-tested with Node's built-in test runner via a small `vm`-based harness that evaluates the inline script; rendering/input are manually playtested in a browser.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas 2D, `requestAnimationFrame`. Tests use `node:test` + `node:assert` + `node:vm` (no dependencies, no build step).

---

## File Structure

- Create: `flappy-eagle/index.html` — the entire game (style + canvas + script).
- Create: `flappy-eagle/tests/harness.js` — loads & evaluates the inline `<script>` from `index.html` in a sandbox, returns its exports.
- Create: `flappy-eagle/tests/game.test.js` — unit tests for the pure logic functions.
- Create: `flappy-eagle/README.md` — how to play and how to run tests.

### Script layout inside `index.html` (built up across tasks)

```
<script>
  // 1. Constants (Task 1)
  // 2. Pure functions: stepPhysics, eagleRect, pipeRects, rectsOverlap,
  //    eagleHitsPipe, checkBounds, updateScore, spawnPipe (Tasks 1-5)
  // 3. Export guard: if (typeof module !== 'undefined' && module.exports) {...} (updated each task)
  // 4. Browser guard: if (typeof window !== 'undefined' && typeof document !== 'undefined') {...} (Task 6)
</script>
```

All DOM/browser access lives inside the browser guard, so evaluating the script in Node (no `window`) defines only the pure functions and exports.

### Coordinate model

- Logical canvas: 400 wide × 600 tall. Ground occupies the bottom `GROUND_HEIGHT` px; `PLAYFIELD_BOTTOM = 520`.
- Eagle: `{ y, velocity }` where `y` is the top-left Y; its hitbox is `{ x: EAGLE_X, y, w: EAGLE_SIZE, h: EAGLE_SIZE }`.
- Pipe: `{ x, gapY, scored }`. The gap spans `[gapY, gapY + PIPE_GAP_HEIGHT]`. Top segment is `{x, y:0, w:PIPE_WIDTH, h:gapY}`; bottom segment is `{x, y:gapY+PIPE_GAP_HEIGHT, w:PIPE_WIDTH, h:PLAYFIELD_BOTTOM-(gapY+PIPE_GAP_HEIGHT)}`.

---

## Task 1: Project skeleton, test harness, and physics step

**Files:**
- Create: `flappy-eagle/index.html`
- Create: `flappy-eagle/tests/harness.js`
- Create: `flappy-eagle/tests/game.test.js`

- [ ] **Step 1: Write the test harness and the first failing test**

Create `flappy-eagle/tests/harness.js`:

```js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No <script> block found in index.html');
  const sandbox = { module: { exports: {} }, console, Math };
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox);
  return sandbox.module.exports;
}

module.exports = { loadGame };
```

Create `flappy-eagle/tests/game.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: FAIL — `loadGame` throws `ENOENT` / "No <script> block found" because `index.html` does not exist yet.

- [ ] **Step 3: Create `index.html` with constants, `stepPhysics`, and the export guard**

Create `flappy-eagle/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Make Flappy Bird Great Again</title>
<style>
  html, body { margin: 0; height: 100%; background: #16162e; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; }
  canvas {
    height: 100vh; max-width: 100vw; aspect-ratio: 400 / 600;
    background: #000; box-shadow: 0 0 40px rgba(0,0,0,0.6);
    touch-action: none;
  }
</style>
</head>
<body>
<canvas id="game" width="400" height="600"></canvas>
<script>
  // ---- Constants ----
  const CANVAS_W = 400;
  const CANVAS_H = 600;
  const GROUND_HEIGHT = 80;
  const PLAYFIELD_BOTTOM = CANVAS_H - GROUND_HEIGHT; // 520
  const GRAVITY = 1400;          // px/s^2
  const FLAP_VELOCITY = -380;    // px/s
  const PIPE_SPEED = 150;        // px/s
  const PIPE_SPAWN_INTERVAL = 1.6; // s
  const PIPE_GAP_HEIGHT = 160;   // px
  const PIPE_WIDTH = 60;         // px
  const EAGLE_X = 100;
  const EAGLE_SIZE = 34;

  // ---- Pure game logic ----
  function stepPhysics(eagle, dt) {
    const velocity = eagle.velocity + GRAVITY * dt;
    const y = eagle.y + velocity * dt;
    return { ...eagle, y, velocity };
  }

  // ---- Node test export guard (inert in the browser) ----
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stepPhysics };
  }
</script>
</body>
</html>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS — both `stepPhysics` tests pass.

- [ ] **Step 5: Commit**

```bash
git add flappy-eagle/index.html flappy-eagle/tests/harness.js flappy-eagle/tests/game.test.js
git commit -m "feat(flappy-eagle): scaffold game with physics step and Node test harness"
```

---

## Task 2: Collision detection (rectangles, eagle vs pipe)

**Files:**
- Modify: `flappy-eagle/index.html` (add functions + extend export guard)
- Modify: `flappy-eagle/tests/game.test.js`

- [ ] **Step 1: Add failing collision tests**

Append to `flappy-eagle/tests/game.test.js`:

```js
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

// Helper: eagle x is fixed at 100; place the pipe so it overlaps that column.
function EAGLE_X_FOR_TEST() { return 90; }
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: FAIL — `game.rectsOverlap` / `game.eagleHitsPipe` are not functions.

- [ ] **Step 3: Add the collision functions**

In `index.html`, add these functions immediately after `stepPhysics`:

```js
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function eagleRect(eagle) {
    return { x: EAGLE_X, y: eagle.y, w: EAGLE_SIZE, h: EAGLE_SIZE };
  }

  function pipeRects(pipe) {
    const bottomStart = pipe.gapY + PIPE_GAP_HEIGHT;
    return [
      { x: pipe.x, y: 0, w: PIPE_WIDTH, h: pipe.gapY },
      { x: pipe.x, y: bottomStart, w: PIPE_WIDTH, h: PLAYFIELD_BOTTOM - bottomStart },
    ];
  }

  function eagleHitsPipe(eagle, pipe) {
    const e = eagleRect(eagle);
    return pipeRects(pipe).some((r) => rectsOverlap(e, r));
  }
```

Update the export guard:

```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stepPhysics, rectsOverlap, eagleRect, pipeRects, eagleHitsPipe };
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS — all collision tests pass.

- [ ] **Step 5: Commit**

```bash
git add flappy-eagle/index.html flappy-eagle/tests/game.test.js
git commit -m "feat(flappy-eagle): add AABB collision detection for eagle vs pipes"
```

---

## Task 3: Ground/ceiling bounds check

**Files:**
- Modify: `flappy-eagle/index.html`
- Modify: `flappy-eagle/tests/game.test.js`

- [ ] **Step 1: Add failing bounds tests**

Append to `flappy-eagle/tests/game.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: FAIL — `game.checkBounds` is not a function.

- [ ] **Step 3: Add `checkBounds`**

In `index.html`, add after `eagleHitsPipe`:

```js
  function checkBounds(eagle) {
    return eagle.y <= 0 || eagle.y + EAGLE_SIZE >= PLAYFIELD_BOTTOM;
  }
```

Update the export guard to include `checkBounds`:

```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stepPhysics, rectsOverlap, eagleRect, pipeRects, eagleHitsPipe, checkBounds };
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add flappy-eagle/index.html flappy-eagle/tests/game.test.js
git commit -m "feat(flappy-eagle): add ground/ceiling bounds collision"
```

---

## Task 4: Scoring (increment once per passed pipe)

**Files:**
- Modify: `flappy-eagle/index.html`
- Modify: `flappy-eagle/tests/game.test.js`

- [ ] **Step 1: Add failing scoring tests**

Append to `flappy-eagle/tests/game.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: FAIL — `game.updateScore` is not a function.

- [ ] **Step 3: Add `updateScore`**

In `index.html`, add after `checkBounds`:

```js
  function updateScore(eagle, pipes, score) {
    let newScore = score;
    for (const pipe of pipes) {
      if (!pipe.scored && pipe.x + PIPE_WIDTH < EAGLE_X) {
        pipe.scored = true;
        newScore++;
      }
    }
    return newScore;
  }
```

Update the export guard to include `updateScore`:

```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stepPhysics, rectsOverlap, eagleRect, pipeRects, eagleHitsPipe, checkBounds, updateScore };
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add flappy-eagle/index.html flappy-eagle/tests/game.test.js
git commit -m "feat(flappy-eagle): add per-pipe scoring"
```

---

## Task 5: Pipe spawning with injectable RNG

**Files:**
- Modify: `flappy-eagle/index.html`
- Modify: `flappy-eagle/tests/game.test.js`

- [ ] **Step 1: Add failing spawn tests**

Append to `flappy-eagle/tests/game.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: FAIL — `game.spawnPipe` is not a function.

- [ ] **Step 3: Add `spawnPipe`**

In `index.html`, add after `updateScore`:

```js
  function spawnPipe(rng) {
    const minGapY = 40;
    const maxGapY = PLAYFIELD_BOTTOM - PIPE_GAP_HEIGHT - 40;
    const gapY = minGapY + rng() * (maxGapY - minGapY);
    return { x: CANVAS_W, gapY, scored: false };
  }
```

Update the export guard to include `spawnPipe`:

```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stepPhysics, rectsOverlap, eagleRect, pipeRects, eagleHitsPipe, checkBounds, updateScore, spawnPipe };
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS — full suite green.

- [ ] **Step 5: Commit**

```bash
git add flappy-eagle/index.html flappy-eagle/tests/game.test.js
git commit -m "feat(flappy-eagle): add pipe spawning with injectable RNG"
```

---

## Task 6: Browser wiring, rendering, input, and game loop

This task is verified by a **manual in-browser playtest** (rendering/input/RAF can't be unit-tested). After adding the code, the Node test suite must still pass unchanged (the browser guard is skipped in Node).

**Files:**
- Modify: `flappy-eagle/index.html`

- [ ] **Step 1: Add the browser guard block**

In `index.html`, add the following **after** the export guard (it is the last thing in the `<script>`):

```js
  // ---- Browser-only wiring (inert under Node) ----
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const canvas = document.getElementById('game');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) {
      document.body.innerHTML =
        '<p style="color:#fff;font-family:sans-serif;padding:1rem">Sorry, your browser does not support canvas.</p>';
    } else {
      const STATE = { READY: 'READY', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
      let state, eagle, pipes, score, spawnTimer, lastTime;

      const stars = Array.from({ length: 12 }, () => ({
        x: Math.random() * CANVAS_W,
        y: 20 + Math.random() * (PLAYFIELD_BOTTOM - 40),
      }));

      function reset() {
        eagle = { y: CANVAS_H / 2, velocity: 0 };
        pipes = [];
        score = 0;
        spawnTimer = 0;
        state = STATE.READY;
      }

      function flap() {
        if (state === STATE.GAME_OVER) reset();
        if (state === STATE.READY) state = STATE.PLAYING;
        eagle.velocity = FLAP_VELOCITY;
      }

      function updateStars(dt) {
        for (const s of stars) {
          s.x -= 20 * dt;
          if (s.x < -12) { s.x = CANVAS_W + 12; s.y = 20 + Math.random() * (PLAYFIELD_BOTTOM - 40); }
        }
      }

      function update(dt) {
        if (state !== STATE.PLAYING) return;
        eagle = stepPhysics(eagle, dt);
        spawnTimer += dt;
        if (spawnTimer >= PIPE_SPAWN_INTERVAL) {
          spawnTimer -= PIPE_SPAWN_INTERVAL;
          pipes.push(spawnPipe(Math.random));
        }
        for (const p of pipes) p.x -= PIPE_SPEED * dt;
        pipes = pipes.filter((p) => p.x + PIPE_WIDTH > -10);
        score = updateScore(eagle, pipes, score);
        if (checkBounds(eagle) || pipes.some((p) => eagleHitsPipe(eagle, p))) {
          state = STATE.GAME_OVER;
        }
      }

      function drawBackground() {
        const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        g.addColorStop(0, '#3c3b6e');
        g.addColorStop(0.5, '#ffffff');
        g.addColorStop(1, '#b22234');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.font = '16px serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = 0.75;
        for (const s of stars) ctx.fillText('⭐', s.x, s.y);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(0, PLAYFIELD_BOTTOM, CANVAS_W, GROUND_HEIGHT);
        ctx.fillStyle = '#5e3f25';
        ctx.fillRect(0, PLAYFIELD_BOTTOM, CANVAS_W, 6);
      }

      function drawPipes() {
        for (const p of pipes) {
          for (const r of pipeRects(p)) {
            ctx.fillStyle = '#b22234';
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.fillStyle = '#ffffff';
            for (let sy = r.y; sy < r.y + r.h; sy += 24) {
              ctx.fillRect(r.x, sy, r.w, 12);
            }
          }
          ctx.fillStyle = '#3c3b6e';
          ctx.fillRect(p.x - 3, p.gapY - 14, PIPE_WIDTH + 6, 14);
          ctx.fillRect(p.x - 3, p.gapY + PIPE_GAP_HEIGHT, PIPE_WIDTH + 6, 14);
        }
      }

      function drawEagle() {
        const cx = EAGLE_X + EAGLE_SIZE / 2;
        const cy = eagle.y + EAGLE_SIZE / 2;
        const angle = Math.max(-0.5, Math.min(1.0, eagle.velocity / 600));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.font = EAGLE_SIZE + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦅', 0, 0); // 🦅
        ctx.restore();
      }

      function drawHUD() {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#3c3b6e';
        ctx.lineWidth = 4;
        ctx.font = 'bold 40px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.strokeText(String(score), CANVAS_W / 2, 18);
        ctx.fillText(String(score), CANVAS_W / 2, 18);
      }

      function drawCenterText(lines) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let y = CANVAS_H / 2 - 70;
        for (const line of lines) {
          ctx.font = line.font;
          ctx.fillStyle = line.color;
          ctx.fillText(line.text, CANVAS_W / 2, y);
          y += line.gap;
        }
      }

      function draw() {
        drawBackground();
        drawPipes();
        drawEagle();
        if (state === STATE.PLAYING || state === STATE.GAME_OVER) drawHUD();
        if (state === STATE.READY) {
          drawCenterText([
            { text: 'MAKE', font: 'bold 36px Georgia, serif', color: '#ffffff', gap: 42 },
            { text: 'FLAPPY BIRD', font: 'bold 36px Georgia, serif', color: '#ffffff', gap: 42 },
            { text: 'GREAT AGAIN', font: 'bold 36px Georgia, serif', color: '#e8b923', gap: 58 },
            { text: 'Click / Tap / Space to flap', font: '18px Georgia, serif', color: '#ffffff', gap: 0 },
          ]);
        } else if (state === STATE.GAME_OVER) {
          drawCenterText([
            { text: 'GAME OVER', font: 'bold 46px Georgia, serif', color: '#e8b923', gap: 52 },
            { text: 'Score: ' + score, font: 'bold 26px Georgia, serif', color: '#ffffff', gap: 46 },
            { text: 'Click to play again', font: '18px Georgia, serif', color: '#ffffff', gap: 0 },
          ]);
        }
      }

      function loop(now) {
        if (lastTime === undefined) lastTime = now;
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        dt = Math.min(dt, 0.05); // clamp so tab-switches don't fling the eagle
        updateStars(dt);
        update(dt);
        draw();
        requestAnimationFrame(loop);
      }

      function onFlap(e) { e.preventDefault(); flap(); }
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); flap(); }
      });
      canvas.addEventListener('mousedown', onFlap);
      canvas.addEventListener('touchstart', onFlap, { passive: false });

      reset();
      requestAnimationFrame(loop);
    }
  }
```

- [ ] **Step 2: Confirm the Node tests still pass (guard is inert under Node)**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS — same green suite as Task 5; the browser block is skipped because `window` is undefined in the `vm` sandbox.

- [ ] **Step 3: Manual in-browser playtest**

Open `flappy-eagle/index.html` in a browser (double-click the file, or run a static server: `npx --yes serve flappy-eagle` and open the printed URL). Verify:
- Title screen shows "MAKE / FLAPPY BIRD / GREAT AGAIN" over a red/white/blue background with drifting stars.
- Clicking / tapping / pressing Space starts the game and flaps the eagle (🦅).
- Patriotic red/white pipes scroll left with blue caps; the eagle falls under gravity and tilts with velocity.
- Passing a pipe increments the score in the HUD.
- Hitting a pipe, the ground, or the ceiling ends the game and shows the GAME OVER overlay with the final score.
- Clicking on the GAME OVER screen restarts cleanly (score resets to 0).

- [ ] **Step 4: Commit**

```bash
git add flappy-eagle/index.html
git commit -m "feat(flappy-eagle): add canvas rendering, input, state machine, and game loop"
```

---

## Task 7: README and final verification

**Files:**
- Create: `flappy-eagle/README.md`

- [ ] **Step 1: Write the README**

Create `flappy-eagle/README.md`:

```markdown
# Make Flappy Bird Great Again 🦅

A single-file, patriotic Flappy Bird clone. You pilot a bald eagle through
stars-and-stripes skies, threading the gaps in red/white pipes.

## Play

Open `index.html` in any modern web browser — double-click it, or serve the
folder (`npx serve .`) and open the URL. **Click**, **tap**, or press
**Space** to flap. Pass pipes to score; one collision ends the run. Click to
play again.

The entire game is the single `index.html` file — no install, no build, no
external assets. Share it by sending that one file.

## Develop / Test

Pure game logic (physics, collision, scoring, pipe spawning) is unit-tested
with Node's built-in test runner:

```bash
node --test tests/game.test.js
```

The test harness (`tests/harness.js`) extracts the inline `<script>` from
`index.html` and evaluates it in a sandbox, so the game stays a single
shareable file while remaining testable.
```

- [ ] **Step 2: Run the full test suite one last time**

Run: `node --test flappy-eagle/tests/game.test.js`
Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add flappy-eagle/README.md
git commit -m "docs(flappy-eagle): add README with play and test instructions"
```

---

## Self-Review Notes (for the author)

- **Spec coverage:** core gameplay (Tasks 1–6), bald-eagle player (Task 6 `drawEagle`), stars-and-stripes background (Task 6 `drawBackground`), MAGA title (Task 6 `draw` READY overlay), single self-contained file (one `index.html`, no external assets), TDD on pure logic (Tasks 1–5), `dt` clamp + canvas guard (Task 6). Non-goals (high score, sound, difficulty ramp, wall pipes) are intentionally absent.
- **Type/name consistency:** eagle is `{y, velocity}`; pipe is `{x, gapY, scored}`; functions `stepPhysics`, `rectsOverlap`, `eagleRect`, `pipeRects`, `eagleHitsPipe`, `checkBounds`, `updateScore`, `spawnPipe` are used identically in tests, the export guard, and the browser block. Constants (`EAGLE_X=100`, `PIPE_WIDTH=60`, `PLAYFIELD_BOTTOM=520`, `PIPE_GAP_HEIGHT=160`) are consistent across logic and test expectations.
```
