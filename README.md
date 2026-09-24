# EVOLVE — Web Build Lab

A 7-minute web-tech showcase for the Coding Club's Web Development Department (Enigma Reboot).
Players **build a real web page** from snap-in code blocks, one technology at a time. Every correct
layer visibly upgrades the page. Once the page has JavaScript, it becomes playable, and clearing each
short level unlocks the next layer to build.

## The flow (about 7 minutes)

| # | Layer | Player snaps in | Page upgrade | Play? |
|---|---|---|---|---|
| 1 | HTML | `<h1>`, `<p>`, game `<div>`, runner `<img>` (pick Bot/Cat/Dev), `<button>` | Raw, unstyled page. Play does nothing | No |
| 2 | CSS | accent colour, background theme, font, Grid layout, game-box size | Looks like a real site. Still static | No |
| 3 | JavaScript | `requestAnimationFrame`, `setInterval` (Chill/Spicy), key listener (Jump/Double jump), collision, click handler | Page reacts: Level 1 | ~25 s |
| 4 | APIs | `fetch`, `res.json()`, duck listener, live feed (Leaderboard/Dev news) | Network requests, live sidebar, duck bars + coins: Level 2 | ~25 s |
| 5 | Responsive | viewport meta, `@media` one-column, `clamp()`, touch controls | Phone view: Level 3 on a phone | ~25 s |
| 6 | AI + Deploy | `ai.predict`, confidence guard, `localStorage`, `npm run deploy` | HTTPS URL, LIVE badge, AI hints: final level | ~25 s |

Each layer mixes correct blocks with 2 decoys from the wrong technology (for example `<font>` in the CSS
layer, or `eval(aiResponse)` in the AI layer). A wrong block costs 100 points and explains *why* it's wrong and where it belongs. Hint glows appear
after 25 s idle for free; the Hint button costs 30 points.

## What is real

- **HTML and CSS are literal.** The preview iframe renders exactly the HTML/CSS lines shown in the editor.
- **The game is plain DOM**: the runner is the player's `<img>`, obstacles are `<div class="block">`
  created by JavaScript, and they're styled by the player's CSS (`var(--accent)`).
- JS/API/AI blocks switch features on in `runtime.js`. The APIs and the AI model are mocks
  (labelled "mock server" in the Network tab). The deploy is simulated.

## Run it locally

**Windows:** double-click `start.bat`. It starts a local server and opens http://localhost:8765/ (uses Node.js, or Python if Node isn't installed). Close the black window to stop it.

**Any OS with Node.js:**

```sh
npm start          # or: node server.js 8765
```

**Python instead:** `python -m http.server 8765`, then open http://localhost:8765/

**No install at all:** double-click `index.html`. Everything works from the file too.

For rehearsals, `http://localhost:8765/?test=1` exposes `window.EVOLVE_LAB` debug hooks.

## Scoring (out of 100)

- **Code: up to 60.** Everyone starts at **0**. Each correct line adds points the first time it's filled (all 27 lines = 60). A wrong block (decoy or out of order) costs **−4**, a paid hint **−2**. Changing a choice you already made is free.
- **Speed: up to 40.** Added when you finish: **5:00 or less = 40**, under 6:00 = 30, under 7:00 = 20, under 8:00 = 10, 8:00 or more = 0. Shown next to the finish time on the results screen.
- **Coins: up to +10.** Levels 2–4 have floating **+2** coins; jump to grab them. The coin bonus is capped at +10.
- **Crashes: −3 each.** Hitting a block in any level costs 3 points.
- **The score is always between 0 and 100.** It's a running total clamped after every event: a penalty only takes what you have (at 0 it costs nothing and leaves no hidden debt), and gains stop at 100. The result cards show what each part actually added or removed, so they always add up exactly to the total. The local leaderboard (`localStorage`) ranks by score, then faster time.
- **Clear the leaderboard** (e.g. after test runs on the event laptop): open the site with `?reset=1` at the end of the address.

## Score code

The results screen shows a **6-character score code** (e.g. `2X9A7M` = 100) with a Copy button, for players to paste into the organisers' score site.
`encryptScore()` in `lab-core.js` implements the shared spec: `v = score × 381001 + 98765`, then 6 base-36 digits of `v`, each shifted by `(98765 + position) mod 36` and mapped to `0-9A-Z`. BigInt is used throughout. `decryptScore()` is the exact inverse (used by the tests).

Note: the code is produced in the browser, so someone with developer tools could generate a code by hand. It's fine for a fun leaderboard, not for anything high-stakes.

## Customise

| What | File |
|---|---|
| Layers, blocks, decoys, lessons, level goals, project file templates | `stages.js` |
| Validation, document assembly, scoring | `lab-core.js` |
| In-page game engine (runs inside the player's page) | `runtime.js` |
| Lab UI (toolbox, editor, preview, DevTools, flow) | `lab.js`, `index.html` |
| Lab look | `lab.css` |

## Test

```sh
npm test          # or: node --test tests/*.test.cjs
```

Add `?test=1` to the URL to expose `window.EVOLVE_LAB` (`start`, `fillStage`, `ship`, `clearLevel`, `next`)
for event-day rehearsals.

The previous runner build is kept unchanged in `legacy-runner/`.
