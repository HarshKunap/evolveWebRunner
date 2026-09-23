# Build the Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn EVOLVE into a 3–4 minute runner where players visibly build their web page by catching optional era tools.

**Architecture:** Keep the existing Canvas physics engine and scoring module. Use a real, isolated HTML document for the opening; use data-only drop definitions and effect ids; render acquired layers in the playfield and build inventory. The host engine controls all timing and effects.

**Tech Stack:** Vanilla HTML, CSS, JavaScript, Canvas, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-22-build-the-runner-design.md`

## Global Constraints

- Keep 10,000 m, 600-second hard limit, exact speed-bonus formula, leaderboard order, no pause, jump/duck controls, and collision recovery.
- The HTML opening lasts 4–10 seconds and does not count toward scored time.
- Every scored era has at least one optional persistent build tool, a speed tool, and a subtle harmful tool.
- Missed build tools stay missed. No pickup is required to finish.
- The build changes the actual playfield. Teaching copy must describe the real web concept accurately.
- Keep the original project brief's Codex/Claude Code ownership split. The folder is not a Git repository, so commit steps do not apply.

---

### Task 1: Content catalog and course structure

**Files:** Modify `content.js`; modify `tests/rules.test.cjs`.

**Interfaces:** `window.EVOLVE_CONTENT = { eras, obstacles, chips, drops }`; each drop has `id`, `era`, `kind`, `syntax`, `lesson`, `effect`, `duration`, `label`.

- [x] Update the course gate positions to `[0, 0, 1300, 3100, 4900, 6700, 8300]`, where HTML is prologue and CSS starts scored distance 0.
- [x] Define at least one `build`, `speed`, and `bug` drop per scored era. Use effects from a fixed engine enum: `theme`, `buffer`, `feed`, `reflow`, `cache`, `predict`, `boost`, `clip`, `clutter`, `latency`, `glitch`.
- [x] Update the content test to assert all six scored era pools contain all three drop kinds and syntax/lesson text.
- [x] Run `node --test tests/rules.test.cjs` and fix failures.

### Task 2: Interactive unstyled HTML opening

**Files:** Modify `index.html`, `game.js`, `style.css`; modify `tests/runtime.test.cjs`.

**Interfaces:** `beginPrologue()` creates a run in `phase: 'prologue'`; `startScoredRun(now)` starts elapsed time at zero with `eraIndex: 1`. The opening exposes Blue/Orange radio choice, `<details>`, working and broken anchors.

- [x] Add an isolated native HTML surface for the opening and host shell status. The opening document has no stylesheet or script.
- [x] On start, show the document and read its radio choice. A working anchor ends the opening after 4 seconds; the host advances automatically after 10 seconds. A broken anchor shows `404: target missing` without leaving the game.
- [x] Start the 10:00 scored timer only on `startScoredRun`; reset opening choices and actions on replay.
- [x] Update runtime tests to step through prologue, assert zero scored elapsed time, then assert CSS starts at distance 0.

### Task 3: Pickup engine and persistent build

**Files:** Modify `game.js`, `index.html`; modify `tests/runtime.test.cjs`.

**Interfaces:** `state.drops` holds positioned opportunities; `state.build` is a set of acquired build ids; `state.effects` stores `boostUntil` and `bugUntil`; `collectDrop(drop, now)` applies one catalog effect.

- [x] Spawn reachable drop opportunities separately from hazards, using each era's catalog. Resolve pickup collision independently from hazard collision.
- [x] On a build pickup, store the id for the run; on a speed pickup, set `boostUntil = now + 5000`; on a bug pickup, set `bugUntil = now + 4000` and reveal it. Repeated temporary pickups refresh time and never multiply boosts.
- [x] Track offered but missed build ids. Render the acquired build stack and end recap from actual state. Expire bugs at the next gate.
- [x] Add runtime tests for catch, miss, effect expiry, alternative builds, and replay reset.

### Task 4: Crisp pacing and fair hazards

**Files:** Modify `game.js`; modify `tests/runtime.test.cjs`.

**Interfaces:** `baseSpeed(distance) = 30 + 38 * distance / 10000`; active boost scales speed once; hazard spacing uses projected time-to-contact and player recovery time.

- [x] Replace elapsed-time 20–29 m/s curve with the distance curve and a short, visible boost.
- [x] Tune jump/duck response, hazard hitboxes, spawn gaps, and patterns to maintain reachable decisions as speed rises. Keep gate and pickup cues out of the course sightline.
- [x] Verify an ordinary no-boost finish estimates around 215 seconds of scored travel and keeps the 600-second cutoff.
- [x] Add targeted deterministic tests for rising speed, boosted speed, and collision recovery.

### Task 5: Visual evolution and educational UI

**Files:** Modify `style.css`, `game.js`, `index.html`, `README.md`.

- [x] Make the actual playfield show acquired page elements and color choices. Missing build tools leave visible gaps in that player's page.
- [x] Add subtle pre-pickup bug cues, concise pickup feedback, active effect timer, and a build recap with one-line lessons.
- [x] Update start instructions and README to describe the prologue, three drop kinds, controls, 3–4 minute target, and unchanged 10:00 score cap.
- [x] Play the game at common desktop widths and with keyboard only; check reduced-motion behavior.

### Task 6: Integration and quality review

**Files:** Modify `tests/runtime.test.cjs` and affected project files only as defects require.

- [x] Run `node --test tests/*.test.cjs` and fix failures.
- [x] Use deterministic browser hooks to verify finish, near-timeout finish, DNF, crash/recovery, replay, tab-switch timing, and representative pickups from all six scored eras.
- [x] Have Claude Code Opus 4.7 review visual readability, educational accuracy, and reachable hazard patterns; integrate concrete fixes.
- [x] Manually check the live browser run and report observed limits honestly.

