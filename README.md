# Make Flappy Bird Great Again 🦅

### ▶ [**Play now in your browser**](https://harry-1-2-2.github.io/flappy-eagle/)

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
