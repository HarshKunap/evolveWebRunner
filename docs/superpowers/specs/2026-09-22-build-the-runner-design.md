# EVOLVE: Build the Runner redesign

## Goal and agreed constraints

Make a 10,000 m web evolution runner that feels sharp and challenging, normally finishes in about 3–4 minutes, and teaches through visible changes to the playfield. The player collects era-specific web tools to build a distinct version of the page. Missed tools stay missed; every build remains playable.

The existing 10:00 hard cutoff, score formula, leaderboard order, jump/duck controls, collision recovery, and no-pause rule remain. The 10-second HTML opening is outside the scored run and its timer. Gate locations will be redistributed across the scored course to accommodate that opening; gates remain distance-based once the run starts.

## Player flow

### 1. Interactive HTML opening

Show a genuinely unstyled HTML document for up to 10 seconds. It contains a heading, short copy, native Blue/Orange radio buttons for the player's page color, a native `<details>` element explaining the missing capabilities, a working anchor, and a broken anchor. The player can use mouse or keyboard to select a color, expand the details, and follow a link. The working link advances after at least 4 seconds; otherwise the opening advances automatically at 10 seconds. The broken link produces a brief `404: target missing` teaching cue and lets the player try again.

The opening document contains HTML only. The host game's JavaScript observes the interactions and controls the transition. This distinction matters: the lesson is that HTML already provides links, forms, and disclosure controls, while dynamic runner behavior requires more than markup. The chosen color is stored for the run and becomes visible if a CSS styling drop is collected.

### 2. Scored runner and era gates

After the opening, the 10,000 m run begins. The CSS era starts at 0 m, JavaScript at 1,300 m, connected web at 3,100 m, responsive design at 4,900 m, cloud apps at 6,700 m, and AI at 8,300 m. The HTML opening remains the first of seven era experiences. Every player encounters all gates regardless of drops. Each gate changes the surrounding web world and introduces its era's obstacles and pickup pool, but does not silently award optional tools.

The host game engine uses JavaScript throughout; the historical eras describe the in-world page the player builds. This avoids claiming that HTML or CSS alone can implement the scored runner.

### 3. Drops and builds

There are three pickup classes:

| Class | Persistence | Player-facing behavior |
| --- | --- | --- |
| Build tool | Rest of run | Adds a visible page feature and a gameplay effect. |
| Speed tool | Short duration | Raises forward speed and makes the next stretch more demanding. |
| Bug | Short duration | Causes one visible problem; exact effect is revealed only on pickup. |

Each scored era offers at least one build tool, one speed tool, and one bug. Pickups display real syntax or a real web concept. The pickup response shows `tool → what changed` in a short edge toast, without covering approaching hazards. The end screen lists build tools collected, build opportunities missed, and bugs encountered, each with a one-sentence explanation. Gate chips continue to mark eras visited; a separate build stack lists only tools actually caught. Temporary effects refresh their timer if repeated; speed multipliers do not stack.

Example tool mappings, to be verified for accurate copy during implementation:

| Era | Example tool | Visible game change |
| --- | --- | --- |
| HTML | Native radio input | Records the player's page color before styling exists. |
| CSS | `display: grid` / `color` | Aligns page sections and applies the chosen color. |
| JavaScript | `addEventListener('keydown', …)` | Adds a buffered jump action and visible response in the page. |
| Connected web | `fetch('/feed')` | Adds a live feed to the world and an advance hazard cue. |
| Responsive | `@media (max-width: …)` | Reflows the page and adjusts the warning layout. |
| Cloud | `Cache-Control` | Shows cached content and grants a short speed boost. |
| AI | `fetch('/api/predict')` | Shows a limited forecast of the next hazard; the recap explains that predictions can err. |

These are gameplay metaphors, not claims that a CSS property directly changes running speed. The educational line states what each tool actually does on a webpage.

The player can ignore or miss any optional drop. The route never depends on a particular pickup, and alternative builds remain viable. No pickup directly changes score points; speed tools only affect completion time through actual travel speed.

### 4. Harmful drops

Bug drops have a subtle visual tell (an unstable glyph or slightly wrong border), but no explicit red `BUG` label before contact. On pickup, reveal the exact bug and show its temporary effect. Bug effects last 4 seconds; speed boosts last 5 seconds. Bugs must not remove controls, hide a hazard with less than a fair reaction window, or force an unavoidable collision. Examples include a clipped preview from `overflow: hidden`, notification clutter, and a cloud timeout. Bug effects do not persist into the next era.

## Feel and pacing

The base pace rises approximately from 30 to 68 m/s over the course. With no major mistakes, this traverses 10,000 m in about 3:35; the HTML opening puts the total experience near 3:45. Speed drops shorten it. A speed pickup makes the immediate course visibly faster and more hazardous but remains survivable.

Input responds on the same frame; jump and duck are the core controls throughout. Tune jump arc, collision boxes, and obstacle placement together. Generate or validate hazard patterns by time-to-contact and recovery time, not by a fixed metre gap. Early encounters provide roughly 1.2–1.5 seconds between decisions, tightening toward roughly 0.8–1.05 seconds late in the run. Check boosted speed separately. Gate banners and pickup messages stay out of the obstacle sightline. Crashes keep the existing short momentum loss and recovery rather than ending the run.

## Architecture and data flow

- `content.js` owns eras, obstacles, and a data-only catalog of tool drops: id, era, syntax, accurate explanation, class, cue, effect id, and duration where relevant.
- The HTML opening is a real unstyled document or isolated DOM surface. Its interactions produce a small `{ colorChoice, completedActions }` result for the run.
- The game engine in `game.js` owns elapsed time, distance, hazard physics, input, pickup collision, active temporary effects, and finish logic. It applies effect ids from the catalog without executing pickup text as code.
- Playfield rendering uses the current era plus the player's acquired build state. The actual course and page elements change; the small preview is removed or repurposed as a build stack.
- `scoring.js` remains the authority for 600-second scoring and leaderboard ranking. The unscored opening does not enter elapsed time.
- `style.css` owns the progressive page appearance, clear pickup cues, edge toasts, and build recap. `index.html` exposes the opening, build stack, playfield, and recap regions.

All run-local choices and effects reset on replay. A hidden tab still consumes scored elapsed time. Unsupported sound and storage remain non-fatal, as they are today.

## Verification

Automated checks cover the unchanged score boundaries, gate order, unscored opening timing, optional missed drops, persistent build effects, temporary boost and bug expiry, restart reset, and timer behavior after a hidden tab. Browser playtesting checks the 3–4 minute normal finish, readable teaching cues, keyboard access to the HTML opening, and hazard reachability at base and boosted speeds. A fast finisher, near-cutoff finisher, high-distance DNF, crash recovery, and replay remain required cases.

## Implementation collaboration

Continue the brief's Codex/Claude Code split without editing the same file concurrently. Codex owns the runner engine, pickup application, scoring integration, and end-to-end verification. Claude Code Opus 4.7 owns the visual treatment, era/tool content and educational copy, and focused gameplay review. Exchange file ownership and test notes at each handoff.
