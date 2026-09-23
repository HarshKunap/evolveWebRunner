# Web Build Lab redesign (2026-09-23)

## Why
The runner built the page as a side effect of playing. The team showcases web technology, so the
product is now a builder first: players assemble a real page from code blocks; the game is what their
page does once it has JavaScript. Progress is driven by correct build decisions, not distance.

## Decisions
- Six layers: HTML → CSS → JavaScript → APIs → Responsive → AI + Deploy. HTML and CSS cannot play.
- A layer ships only when every slot holds a valid block. Wrong-technology decoys are rejected with a reason.
- Choice blocks (runner, colour, theme, font, difficulty, jump style, feed) personalise the page and game.
- From layer 3 on, shipping loads a short level (320–440 m, ~20–25 s at zero crashes; verified by bot).
  Clearing it unlocks the next layer. Crashes stun and cost points; no fail state.
- Target 7:00 total for a beginner; timer is shown, never enforced.
- HTML/CSS render literally; JS/API/AI blocks toggle engine features; APIs, AI and deploy are mocks.

## Files
`stages.js` (data), `lab-core.js` (pure logic, Node-tested), `runtime.js` (in-page DOM engine),
`lab.js` + `index.html` + `lab.css` (UI). Old build: `legacy-runner/`.

## Verification
8 Node tests (content integrity, placement, literal rendering, sanitising, scoring, leaderboard).
Playwright walkthrough of all six layers with no page errors; keyboard bot cleared levels 1–4
in 19.7 / 24.2 / 25.0 / 23.8 s with 0 crashes.
