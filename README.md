# EVOLVE — A Web Runner

A browser-based runner for the Coding Club's Web Development Department. A short interactive HTML page opens the journey, then the fixed 10,000 m course moves through CSS, JavaScript, connected web, responsive design, cloud apps, and AI. An ordinary clean run takes about 3–4 minutes; the hard cutoff remains 10:00.

The first page is real, unstyled HTML: choose Blue or Orange, open its details, and follow a link. It advances after at most 10 seconds, outside the scored clock. Before starting, a four-item key explains the drops: mint BUILD is permanent, yellow BUFF helps briefly, violet ? may cause a bug, and blue 200 packets clear obstacles after the Web 2.0 fetch upgrade. Missed build tools stay missed, so each run can develop differently.

During play, pickup notices lead with the actual change to the game, then show the web command that caused it. Timed buffs and nerfs also have visible countdown chips. CSS animation drops give a five-second speed burst; the cloud gzip drop shrinks obstacles for six seconds. A responsive CSS bloat bug enlarges the runner's hitbox for five seconds. Other glitching drops cause short view or pace disruptions. The playfield and end recap show what you actually collected.

## Run it

Serve the folder in a current desktop browser so the HTML opening loads inside its isolated frame:

```sh
python -m http.server 8765
```

Then visit `http://localhost:8765/`. There is no build step, framework, or package install.

## Controls

- **Space**, **W**, or **Up Arrow**: jump. Catch the JavaScript drop to press again for a second air jump.
- **S** or **Down Arrow**: duck. Catch the responsive drop to press S in air and snap down.
- The runner moves forward automatically. A collision slows the runner; repeated crashes in a short distance build a longer recovery chain. Dodging breaks the chain.
- Pace rises from about 36 to 78 m/s as distance increases. Temporary speed drops raise it further. The current pace is shown in the HUD.
- The sound toggle starts off. The game remains fully playable with sound off.

Each optional build drop changes the run: CSS narrows obstacle blocks and styles the lane; JavaScript grants a double jump; Web 2.0 sends catchable response packets that clear hazards; responsive design creates a phone viewport, smaller runner, and air snap; cloud caching absorbs a hit and recharges by distance; AI shows a future ghost for the next jump or duck. The page's build cards and pickup notices explain each effect as it arrives.

The scored run has no pause control. Real elapsed time counts while the tab is hidden. A run ends at 10,000 m or 10:00, whichever comes first. Replay resets the HTML choice, drops, and effects without refreshing the page.

## Scoring

The live score is distance in metres. A finish gets 10,000 distance points plus `floor(((600 - elapsedSeconds) / 600) * 10,000)`. A DNF has no speed bonus and caps at 9,999 points. The local leaderboard is stored in this browser's `localStorage`; finishers rank ahead of non-finishers, then by final score and completion time.

## Customize it

| What | File |
|---|---|
| Club and department name, final call to action, controls card | `index.html` |
| Bare HTML opening | `html-prologue.html` |
| Colours, typography, overlay layout, focus styles | `style.css` |
| Era names, teaching lines, distances, hazards, skill chips, drop catalog | `content.js` |
| Pace ramp, drops, build effects, jump, collision recovery, Canvas visuals, sound | `game.js` |
| Score formula and leaderboard ordering | `scoring.js` |

The brief lists seven era experiences and six named skill chips. The HTML opening is the first experience; the six scored eras follow. Gate chips mark eras reached, while the build stack marks only tools caught. The AI gate evolves the final Modern Web chip.

## Verify

Run `node --test tests/*.test.cjs` for scoring, course data, opening timing, pickups, collision recovery, restart, and background-time checks. Add `?test=1` to the local URL to expose `window.EVOLVE_DEBUG` for manual event testing; that interface is absent from normal play.
