# CLAUDE_HANDOFF

## Current redesign handoff — 2026-09-23

Claude Code Opus 4.7 updated `content.js` and `style.css` for the Build the Runner redesign, then completed a high-effort read-only quality review. Codex integrated the data and styling with `game.js`, `index.html`, `html-prologue.html`, scoring, README, and tests.

- Current scored era distances: CSS 0, JavaScript 1,300, Web 2.0 3,100, Responsive 4,900, Cloud 6,700, AI 8,300 m. HTML is a 4–10 second unscored interactive opening.
- `window.EVOLVE_CONTENT` now exports `{ eras, obstacles, chips, drops }`. There are 18 drops: one persistent build, one five-second speed tool, and one four-second bug per scored era.
- Keep the six original gate chips. The separate build stack and recap show only tools actually caught, with missed build opportunities called out.
- Claude's review found a late-boost reaction-window risk, a forced-scrollbar copy issue, a silent prologue status, and a misleading stun pace display. Codex corrected these. The pickup toast also has a separate screen-reader status channel.
- Verification: `node --test tests/*.test.cjs` passes 18 tests. Browser inspection confirmed native HTML radio choice, working and broken links, and the CSS transition.

The material below records earlier milestones and their older gate distances. Use the current spec in `docs/superpowers/specs/2026-09-22-build-the-runner-design.md` for the active design.

## Historical handoff — content.js → engine

Owner of this note: Claude (content/data). Owner of engine + integration: Codex.

## What shipped

- `content.js` exposes `window.EVOLVE_CONTENT = { eras, obstacles, chips }`.
- 7 eras keyed to the required gate distances (0, 1400, 2800, 4200, 5700, 7200, 8600).
- 21 obstacles (3 per era), mixed `jump` and `duck`, sized for a ~44px-tall standing player / ~26px ducking.
- 6 skill chips in the required order: HTML → CSS → JavaScript → APIs → Responsive Design → Modern Web.
- No engine behavior, no scoring, no timers. Pure data.

## Visual direction (desktop)

Not neon, not cartoon. Aim for **"editorial poster meets terminal"**: warm off-white early eras that slowly cool, then invert to dark for JS, brighten for Web 2.0, desaturate purple for Responsive, cool teal for Cloud, and end in a magenta/violet AI dusk. Each era's `bgTop`/`bgBottom` already encodes this arc — engine should just draw a vertical gradient between them and lerp across gates over ~800 ms so the transition reads as a chapter turn, not a flash.

- Typography on obstacles: use a monospace label (e.g. `ui-monospace, Menlo`) baked into obstacle draw. The `label` field is short on purpose so it stays legible at speed.
- Ground: a single flat band in `ground` color, plus a 1–2 px accent line in `accent`. No parallax clouds; this reads more "webpage in motion" than platformer.
- Chip HUD: bottom-left row of 6 pill slots. Empty slots are hollow outlines in the current era's accent; earned slots fill with the chip's own color. This visually promises the learning path from the first second.
- Gate flash: full-screen wash in the new era's `accent` at 15% alpha for ~250 ms, then title + one-liner in the top-third for ~2.0 s while the run keeps moving. Do not pause.
- Reduced motion: keep gradients but skip the flash and any shake on collision; swap the crash stun for a color pulse.

## Gameplay balance suggestions

Distances imply ~1,400 m between gates. For a 6–8 min completion, that's roughly 3.5–4.5 m/s average base speed with a mild ramp per era. Suggested pacing (engine's call, not data):

- Base speed 260 px/s at start, +8% per era, cap around 460 px/s in AI era.
- Obstacle spawn cadence: floor 900 ms between hazards, tighten by 60 ms per era.
- Never place a `duck` obstacle within 500 ms of a `jump` obstacle — the player needs one control window to react.
- Collision stun: 700–900 ms with input locked and 40% opacity blink. Distance keeps counting from the stun position (clock never pauses per spec).
- Skill chips awarded on gate crossing, not on obstacle clears — chip count must equal gates passed.

## Test cases

Required (from brief):

1. **Fast finish** — reach 10,000 m in ≤ 5:00. Expect `finalScore = 10,000 + floor(((600-elapsed)/600)*10,000)`, chips = 6, `DEPLOYED ✓`.
2. **Near-timeout finish** — cross 10,000 m at 9:59. Expect `finalScore ≥ 10,016`, `speedBonus ≥ 16`.
3. **DNF at near-max distance** — die (or time out) at ~9,990 m. Expect `finalScore = 9,990`, `speedBonus = 0`, DNF displayed, and ranked below any finisher.
4. **Collision recovery** — take a hit mid-run, verify stun triggers, run continues, clock does not pause, chips already earned persist.
5. **Restart** — after finish and after DNF, replay without a page refresh; distance, chips, timer, and obstacle spawns reset cleanly.
6. **Tab-switch timing** — background the tab for 30 s mid-run; on return, elapsed time reflects real wall-clock (no free time), and the player is not teleported forward through obstacles.

Additional worth running:

7. **Gate ordering** — log era transitions; confirm exact order HTML → CSS → JS → Web 2.0 → Responsive → Cloud → AI at the right distances.
8. **Chip order** — confirm chips array renders left-to-right as `HTML, CSS, JavaScript, APIs, Responsive Design, Modern Web`.
9. **Duck/jump fairness** — for each era, spawn only duck obstacles for 10 s, then only jumps; both should be survivable with correct input.
10. **DNF cap** — force a death at exactly 9,999.9 m; score must display 9,999, not 10,000.
11. **Finish-vs-DNF leaderboard** — a 9:59 finisher (score ~10,016) must sort above a 9,999 DNF.
12. **Reduced motion** — set `prefers-reduced-motion: reduce`; verify no shake/flash and game still passes gates.

## What to test in `content.js` specifically

- `window.EVOLVE_CONTENT.eras.length === 7` and `at` values match `[0,1400,2800,4200,5700,7200,8600]`.
- Every `era.obstacleTypes` entry exists as a key in `obstacles`.
- `chips.length === 6` and labels are exactly the strings above.
- Every obstacle has a valid `kind` (`'jump' | 'duck'`) and positive width/height.

A trivial assertion block in game.js at startup covers this in ~10 lines.

## Risks / open questions

- **Obstacle sizes are educated guesses** without seeing the engine's exact player rig. If the player ends up 32 px instead of 44 px, jump obstacles at 54 px may be unclearable — expect one tuning pass after the first playable build.
- **Duck labels can be verbose** (`@media`, `alert!`). If the engine renders text inside the hitbox, widths may need to grow, or engine should clip text. Data side is easy to adjust.
- **Color contrast on JS era** (yellow on dark) is intentional but bright — if it fatigues the eye, drop `#f7df1e` to `#e6c800`.
- **AI era pink `#ff5cf0`** may bloom on OLED. Fine on projectors; flag for the event display if it looks blown out.
- **No sound cues encoded here** — chip pickups and gate transitions should get short SFX from Codex's side; content.js intentionally stays data-only.
- **Chip-vs-gate count mismatch** — spec has 7 gates but only 6 chips. Handled by awarding chips at the first 6 gates (HTML through Cloud→Modern Web); the AI gate is narrative only. Confirm this reading is intended; if the AI gate must also award a chip, the chips array needs a 7th entry.

---

# CLAUDE_HANDOFF (2) — style.css visual pass + engine review

Owner of this note: Claude (visual layer + independent review). No changes made to `index.html`, `game.js`, `scoring.js`, or `content.js`.

## What shipped

- **`style.css`** (new file, ~660 lines). Desktop-first editorial-poster + terminal system. No external assets/fonts — system stacks only. Covers every hook in the current `index.html` markup.
- Palette: off-white paper `#f1ece2`, navy ink `#0a1021`, editorial coral `#e94e1b`, warm gold `#f2b705` (era value), terminal green `#17c26d` (live score). Canvas eras still drive their own colors; only the UI chrome is fixed.
- Type: system-ui sans for display, `ui-monospace` for HUD/labels/kbd/leaderboard, serif italic accent (`Iowan Old Style` → `Palatino` → `Georgia`) for the display accent word and gate one-liners.
- Overlays are absolutely positioned inside `.canvas-wrap` with `z-index: 5` (start/end) and `2–3` (gate/crash), so the canvas surface is entirely behind them but the HUD, footer progress, and header stay visible around the frame.
- `[hidden] { display: none !important; }` guarantees the game.js `hidden` toggles on start/end/gate/crash actually hide (before this, the browser default would still get overridden by any `display` we set).
- Reduced-motion: kills animations globally (`animation-duration: 0.001ms`, transitions clamped), and nulls the primary-button hover shift so nothing wobbles for users who opt out.
- Focus: `:focus-visible` outlines on the two buttons and player-name input use the coral accent at 2–3px offset so keyboard navigation is obvious against the paper background.
- Responsive: two breakpoints (1180px, 960px). At ≤1180 the HUD collapses to 2×2 and the club label hides; at ≤960 start/end panels stack and result-stats become 2-wide. Below that the canvas keeps its aspect-ratio and everything scrolls in-frame via `.overlay { overflow: auto }`.

## Files touched

- `style.css` — created.
- `content.js` — left untouched; sizes and colors still match the ~44/26 px player rig noted in the first handoff. No concrete issue observed on visual inspection.

## What Codex should test in this build

1. Start screen renders on first paint; Start button (mouse + Enter after clicking body) begins the run and hides the overlay cleanly.
2. HUD numbers update every frame and stay legible during gate flashes and crash stuns (banners sit over the canvas, not over the HUD).
3. Gate banner: text is centered top-third, accent border follows the era's `accent` (game.js sets `--gate-accent` inline), auto-hides at `state.gateUntil`.
4. Crash banner: appears on collision, disappears at `state.stunUntil`. With reduced-motion on, no shake.
5. End screen: `#result-title` shows either `DEPLOYED ✓` or `DNF`; the final-score row is the dark full-width band with the yellow score; chips recap shows earned chips filled with their `--chip-color` and unearned chips as dashed outlines; leaderboard first-place score renders in green, others in coral.
6. Replay flips overlays back without a page refresh.
7. Sound toggle button stays legible in header and updates its label between `SOUND OFF` / `SOUND ON`.
8. Resize desktop window from 1440 → 1200 → 1000 → 900 px: layout should degrade cleanly at each breakpoint with no clipped controls and canvas remaining fully visible.
9. Set `prefers-reduced-motion: reduce` in DevTools → verify no crash shake, no gate-in slide, and no button hover jitter.

## Defects / risks in the current playable build (read-only review)

Severity legend: **S1** blocks the event · **S2** should fix before demo · **S3** polish.

- **S2 — Restart doesn't reset `state.previousEra`, so the first gate flash after replay lerps from the AI era back to HTML.** `beginRun()` sets `previousEra: 0` (correct), but if the previous run ended past era 0, the canvas fade from `previous.bgTop → current.bgTop` computes as HTML→HTML at t=1 on the first frame — actually safe. The subtler risk: the *engine gradient* on the very first `draw()` before `showGate(0)` is called uses the freshly-initialized state, so this one is likely fine. Verify by finishing in AI era and replaying — background should start warm-cream, not violet.
- **S2 — Tab-switch resume relies on the browser firing one queued rAF on visibility change.** `visibilitychange` handler in `game.js:432` never calls `requestAnimationFrame`. In most browsers rAF resumes on foreground; in some hardened configurations it may not, leaving the loop stalled with `phase === "running"` but no frame ticking. Cheap safety net: call `frameId = requestAnimationFrame(loop); lastFrame = performance.now();` inside the `!document.hidden` branch. Confirm behavior across Chrome/Firefox/Safari.
- **S2 — Time-out edge at exactly 600.0 s is `DNF` even if the same frame would have crossed 10,000 m.** `update()` checks `elapsed >= MAX_TIME` first (`game.js:162`) and returns before the distance check, so a runner who crosses the finish on the timeout frame gets DNF. Reorder the two checks (or evaluate them together) to honor the spec ("finished when distance ≥ 10,000 AND elapsed ≤ 600").
- **S3 — No enforced separation between adjacent `jump` and `duck` obstacles.** First handoff called for ≥500 ms of spacing; `spawnObstacles()` uses purely random distance-based cadence (`state.nextSpawn += 25 + rand*9 - eraIndex*0.35`). At AI-era speed a duck can spawn ~1.1 s after a jump, but a very unlucky roll can put them tighter than the reaction window. Add an `if (last.kind !== current.kind) minGap += ...` guard.
- **S3 — `content.chips[6]` is `undefined`, protected only by the `index < 6 ? chips[index] : chips[5]` fallback in `showGate` (`game.js:83`).** Works today but is a footgun; either extend `chips` to 7 or remove the AI gate's chip label entirely from the banner.
- **S3 — Sound button starts with `aria-label="Turn sound on"` which matches the "SOUND OFF" state, good; but the button lacks `aria-pressed`.** Screen readers won't announce toggle state changes cleanly.
- **S3 — `#player-name` has no visible focus ring on some browsers past the border color-shift.** For accessibility parity with the buttons consider adding an explicit `outline` on `:focus-visible` if AA contrast is a concern in your event display.
- **S3 — `ctx.roundRect` (used in `draw()`) requires Chrome 99+/Safari 16+/Firefox 111+.** Fine for a 2026 event laptop, but flag if the demo machine is older.
- **S3 — Live-score HUD caps at 9,999 while running (`game.js:192`).** Matches DNF cap per spec but can confuse a spectator when the final score jumps from 9,999 to 20,000-ish on a fast finish. Consider a subtle "+bonus at finish" hint in the HUD label.
- **S3 — `keydown` handler ignores Enter while `#player-name` has focus, so keyboard-only users can't press Enter from the input to start.** Either move focus off input on Enter, or accept Enter inside the input as a start signal.

## Not observed / considered but not filed

- Scoring math in `scoring.js` matches the brief exactly (DNF cap 9,999, `finalScore = distanceScore + speedBonus`, and `compareEntries` orders finishers first → higher score → lower time → higher distance for DNF). No defect.
- `content.js` obstacle dimensions still fit the ~44/26 px player rig; the ducks that felt tallest (`popup` at 28, `notification` at 26) still leave the ~20 px overhead gap the engine assumes (`GROUND - 56 - h`). Left untouched.
- No CSS changes affect canvas rendering; canvas colors continue to be sourced from `content.eras[i]`.

---

## Redesign handoff — Web Build Lab (2026-09-23, Claude in Cowork)

- The product is now a **builder-first lab**: six layers (HTML → CSS → JS → APIs → Responsive → AI + Deploy), each built from snap-in blocks with decoys; HTML/CSS cannot play; from JS onward each shipped layer unlocks a ~25 s level.
- New files at root: `index.html`, `lab.css`, `lab.js`, `lab-core.js`, `stages.js`, `runtime.js`, `tests/lab.test.cjs`. The old runner is untouched in `legacy-runner/` (its tests still run from there).
- Spec: `docs/2026-09-23-web-build-lab-design.md`. README rewritten; old README copied to `legacy-runner/README.md`.
- Verified: `node --test tests/*.test.cjs` (8 pass); Playwright full walkthrough, no page errors; keyboard bot clears all four levels in 20–25 s each.
- Open risks: tune level goals after a live beginner playtest; name is sanitised to letters/spaces-safe text; APIs/AI/deploy are clearly labelled mocks.
