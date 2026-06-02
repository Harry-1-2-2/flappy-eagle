# Make Flappy Bird Great Again — Design

**Date:** 2026-06-02
**Status:** Approved design, pending spec review

## Summary

A single-file, browser-based Flappy Bird clone with a lighthearted patriotic
("Make Flappy Bird Great Again") theme. The player is a bald eagle navigating
through gaps in scrolling obstacles against a stars-and-stripes backdrop. The
deliverable is one self-contained `index.html` file that runs in any modern
browser with no install, no build step, and no external assets — so it is
trivial to share.

## Goals

- Faithful core Flappy Bird gameplay: flap against gravity, thread gaps, score,
  die on collision, restart.
- Distinct patriotic / satirical theme (bald eagle player, stars-and-stripes
  background) kept tasteful and good-natured.
- Single shareable file: double-click to open, email it, or drop on any static
  host.

## Non-Goals (YAGNI)

- High-score persistence (localStorage).
- Sound effects.
- Difficulty ramp / progressive speed-up.
- Border-wall pipe styling, MAGA-red bespoke UI chrome (beyond the title text).
- Multi-file project structure or any build tooling.

## Tech Stack

- Single file: `flappy-eagle/index.html` (new folder in the workspace).
- Inline `<style>`, `<canvas>`, and `<script>` — vanilla JavaScript, no
  frameworks, no dependencies, no external images/fonts/audio.
- HTML5 Canvas 2D for rendering.
- `requestAnimationFrame` game loop using delta-time for frame-rate
  independence.

## Architecture

The single file contains three inline blocks:

1. **`<style>`** — full-viewport, centered canvas; patriotic page background;
   no scrollbars; canvas scaled to fit the window while preserving aspect ratio.
2. **`<canvas>`** — fixed logical resolution of **400×600** (portrait).
   Rendering uses these logical coordinates; CSS scales the displayed size.
3. **`<script>`** — the entire game as plain functions/objects.

### State machine

A single `state` variable with three values drives `update` and `draw`:

- `READY` — title screen ("MAKE FLAPPY BIRD GREAT AGAIN") + prompt to start.
- `PLAYING` — active gameplay.
- `GAME_OVER` — final score + restart prompt.

Input transitions: `READY → PLAYING` (first flap), `PLAYING` flap actions,
`GAME_OVER → READY/PLAYING` (restart resets state and begins immediately).

### Components

- **Eagle (player):** `{ y, velocity }`. Fixed X position; the world scrolls
  past it. Each frame gravity adds to `velocity`; a flap sets `velocity` to a
  fixed negative value. Rendered as 🦅, rotated slightly toward its velocity.
- **Pipes (obstacles):** array of `{ x, gapY, scored }`. Spawned at a fixed
  interval at the right edge with a randomized `gapY`; scroll left at constant
  speed; removed once off-screen left. Each pipe has a fixed `gapHeight`.
  Rendered in a patriotic palette (red/white stripes with a blue cap), not green.
- **Background:** drawn first each frame, layered — red/white/blue sky gradient,
  a few slow-drifting ⭐ stars, and a ground strip at the bottom.
- **Score:** integer, increments when the eagle's X passes a pipe's right edge
  (tracked via the pipe's `scored` flag). Rendered bold/patriotic in the HUD.
- **Input:** mouse click, touch tap, and Spacebar all map to a single `flap()` /
  start / restart action depending on `state`.

### Constants (initial values, tunable)

- `GRAVITY`, `FLAP_VELOCITY`, `PIPE_SPEED`, `PIPE_SPAWN_INTERVAL`,
  `PIPE_GAP_HEIGHT`, `PIPE_WIDTH`, `EAGLE_X`, `EAGLE_SIZE`, `GROUND_HEIGHT`.
  Grouped at the top of the script for easy tweaking.

## Data Flow (game loop)

Each `requestAnimationFrame` tick:

1. Compute `dt`, **clamped** to a max (e.g. ~50 ms) so tab-switch pauses don't
   fling the eagle across the screen.
2. `update(dt)` (only when `PLAYING`):
   - Advance eagle physics (`velocity += GRAVITY * dt`, `y += velocity * dt`).
   - Advance pipes; spawn new ones on interval; recycle off-screen ones.
   - Update score when a pipe is passed.
   - Collision check (see below); on hit → `state = GAME_OVER`.
3. `draw()` renders for the current state: background → pipes → eagle → HUD,
   plus a title overlay (`READY`) or game-over overlay (`GAME_OVER`).

### Collision detection

The eagle is treated as a rectangle (or inset hitbox) at `EAGLE_X`. A collision
occurs when:

- The eagle's box overlaps any pipe's top or bottom segment (AABB overlap), OR
- The eagle hits the ground (`y + size >= playfield bottom`), OR
- The eagle hits the ceiling (`y <= 0`).

## Error Handling & Robustness

- Guard against a missing canvas or 2D context (fail gracefully with a message).
- Clamp `dt` as above.
- Pause/idle is implicitly handled by the state machine (no updates outside
  `PLAYING`).

## Testing Strategy

TDD focus is the **pure logic**, factored into testable functions independent of
canvas/DOM:

- `stepPhysics(eagle, dt)` — gravity/velocity/position integration.
- `rectsOverlap(a, b)` / `eagleHitsPipe(eagle, pipe)` — AABB collision.
- `checkBounds(eagle, playfield)` — ground/ceiling collision.
- `updateScore(eagle, pipes, score)` — increment-once-per-pipe behavior.

These functions are written test-first (red/green). Rendering, input wiring, and
the RAF loop are verified with a manual in-browser playtest.

To keep the game a single self-contained file *and* unit-testable, the pure
functions are defined inline in `index.html` but also conditionally exported at
the end of the script via a guard (`if (typeof module !== 'undefined')
module.exports = { stepPhysics, rectsOverlap, ... }`). A Node-based test file in
the same folder `require`s the file (loaded as text and evaluated, or via the
guard) to exercise the pure functions without a browser. The export guard is
inert in the browser, so the single-file/shareable property is preserved.

## Theme & Tone

Good-natured patriotic parody only: bald eagle, stars and stripes, red/white/blue
palette, and the title "MAKE FLAPPY BIRD GREAT AGAIN." No depiction of real
individuals, no demeaning or hateful content.

## Deliverable

`flappy-eagle/index.html` — a single self-contained file. A short `README.md`
in the same folder explains how to play (open the file; click/tap/space to flap).
