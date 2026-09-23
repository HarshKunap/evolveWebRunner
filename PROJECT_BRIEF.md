# EVOLVE — A Web Runner

## Build mission

Create a polished, browser-based runner game for the Coding Club's **Web Development Department**. It should feel immediately playable like a classic one-button runner, while teaching the evolution of web development through its world, obstacles, and short gate messages.

The player is a new Web Dev member racing through a fixed course from the first HTML pages to the modern AI web. The final message is: **"The next evolution is what you build."**

This is a one-week, event-ready build. Prioritise a reliable, great-feeling game over feature count.

## Required collaboration model

Use **both Codex and Claude Code**, deliberately and without duplicating work.

- Target a **60% Codex / 40% Claude Code** meaningful-work split.
- Use **Claude Code with Claude Opus 4.7**.
- Use Claude at **medium** effort for bounded tasks such as UI/CSS, content data, obstacle configuration, tests, and focused review.
- Use Claude at **high** effort only for architecture review, gameplay-balance review, difficult debugging, or final quality review.
- Use Codex for the core engine, integration, score system, file ownership, and final end-to-end verification.
- Do not run the two agents against the same file at once. Exchange a short handoff after each milestone: what changed, what to test, and any unresolved risk.
- If Claude Code is unavailable in the environment, state that immediately and continue with Codex; do not pretend the requested split happened.

### Ownership plan

| Owner | Approx. share | Owned work |
|---|---:|---|
| Codex | 60% | Project setup; runner loop; input; collision and respawn; timer; distance and final scoring; leaderboard; sound wiring; integration; end-to-end testing. |
| Claude Code (Opus 4.7) | 40% | Visual system and era styling; obstacle/configuration data; educational copy; gate transitions; accessibility/UI review; gameplay test cases; independent code review. |

Suggested handoff sequence:

1. Claude proposes the visual language, era data, obstacle roster, and test cases.
2. Codex builds the playable core and plugs in that content model.
3. Claude reviews a playable build, tunes the gates/obstacles/UI, and reports concrete defects.
4. Codex integrates fixes, verifies the scoring rules, and produces the final build.

## Product constraints

- Use vanilla HTML, CSS, and JavaScript with Canvas. No framework or heavy dependency is needed.
- Desktop-first. Support `Space`/`W`/Up Arrow to jump and `S`/Down Arrow to duck. Include a clear controls card before a run.
- The runner moves automatically. The player controls survival, not forward movement.
- Avoid Chrome Dino branding, copied art, sound, names, or code. It may be inspired by the clarity of that genre only.
- The scored game has no pause button. The timer uses real elapsed time; switching tabs must not create free time.
- Keep the app usable without sound and respect reduced-motion preferences where feasible.
- Keep all facts brief, accurate, and shown only at gates or in the post-run recap. Never interrupt active dodging with a tutorial modal.

## Game structure

### Run

- Course length: **10,000 m**.
- Hard time limit: **600 seconds / 10:00**.
- Target average completion: **6–8 minutes**; very strong players may finish materially faster.
- Gates are based on **distance**, never clock time, so every finisher sees the same evolution.
- A collision must not permanently eliminate a player early. Show a brief `ERROR 404: MOMENTUM LOST` crash/stun, preserve their run, and continue the clock. Make the consequence noticeable but not punishing enough to make the event frustrating.
- Do not introduce a whole new control scheme at each gate. The core stays jump/duck/dodge; the eras differ through visuals, obstacle patterns, speed, and messaging.

### Evolution gates

| Distance | Era | One-line teaching message | Representative obstacles |
|---:|---|---|---|
| 0 m | **HTML — The First Page** | `HTML gave the web its structure.` | Broken links, missing-image icons, tags. |
| ~1,400 m | **CSS — The Style Gate** | `CSS gave the web its look and layout.` | Layered `div` blocks, cascading panels, layout walls. |
| ~2,800 m | **JavaScript — The DOM Awakens** | `JavaScript made pages react.` | Moving buttons, pop-ups, glitching elements. |
| ~4,200 m | **Web 2.0 — Connected Web** | `Apps began connecting people, content, and data.` | Feed cards, notifications, loading bars. |
| ~5,700 m | **Responsive Web — Mobile Shift** | `Responsive design made the web work everywhere.` | Narrow viewport sections, phone-like panels. |
| ~7,200 m | **Cloud & Web Apps** | `The web became a platform for real-time apps.` | API packets, dashboards, latency bars. |
| ~8,600 m | **AI Web — What Comes Next** | `AI is changing how we build, but people still shape the web.` | Duplicating/glitching UI, prediction-like hazards. |

At every gate: make a quick, readable visual transition; show the era title and one sentence; award a collectible skill chip. The chips form this end-of-run learning path:

`HTML → CSS → JavaScript → APIs → Responsive Design → Modern Web`

## Scoring and leaderboard (non-negotiable)

Distance points are the ordinary live score. The speed bonus appears only on a successful finish.

```text
MAX_DISTANCE = 10,000 m
MAX_TIME = 600 seconds

finished = distance >= MAX_DISTANCE AND elapsedTime <= MAX_TIME

if finished:
  distanceScore = 10,000
  speedBonus = floor(((MAX_TIME - elapsedTime) / MAX_TIME) * 10,000)
  finalScore = distanceScore + speedBonus
else:
  distanceScore = min(floor(distance), 9,999)
  speedBonus = 0
  finalScore = distanceScore
```

Consequences of this design:

- Every finisher beats every non-finisher: even a 9:59 completion scores at least 10,016, while a non-finisher caps at 9,999.
- Faster finishers score more.
- Among non-finishers, distance decides rank.
- Do not add a separate completion or finish bonus.

Leaderboard sorting:

1. Finished players first.
2. Higher final score first.
3. Lower completion time as the tie-breaker.
4. Higher distance for unfinished players.

The end screen must clearly show:

```text
DEPLOYED ✓
Distance:     10,000 m
Finish time:  MM:SS
Speed bonus:  +N
FINAL SCORE:  N
```

For an unfinished run, show `DNF`, distance reached, and zero speed bonus.

## Story and club framing

The player is not just running through history; they are following the learning journey offered by the Coding Club's Web Development Department.

Final screen copy:

```text
You travelled through the evolution of the web.
The next evolution is what you build.

Coding Club
Web Development Department
```

Do not over-promote during the run. Let the game be the proof of the department's creativity.

## Definition of done

- A player can start, control, collide, recover, pass every gate, finish, time out, and replay without a page refresh.
- Gates appear in the required order and teach the correct idea.
- The score calculations match the specification exactly, including the 9,999 DNF cap.
- Leaderboard ordering is correct for fast/slow finishers and non-finishers.
- The UI remains readable at common desktop sizes.
- A short README explains how to run the project and where the club can customise its name, colours, and final call-to-action.
- Before declaring completion, test at least: a fast finish, a near-timeout finish, a DNF at near-maximum distance, collision recovery, restart, and tab-switch timing.
