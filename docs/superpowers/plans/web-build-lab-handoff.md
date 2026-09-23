
---

## Redesign handoff — Web Build Lab (2026-09-23, Claude in Cowork)

- The product is now a **builder-first lab**: six layers (HTML → CSS → JS → APIs → Responsive → AI + Deploy), each built from snap-in blocks with decoys; HTML/CSS cannot play; from JS onward each shipped layer unlocks a ~25 s level.
- New files at root: `index.html`, `lab.css`, `lab.js`, `lab-core.js`, `stages.js`, `runtime.js`, `tests/lab.test.cjs`. The old runner is untouched in `legacy-runner/` (its tests still run from there).
- Spec: `docs/2026-09-23-web-build-lab-design.md`. README rewritten; old README copied to `legacy-runner/README.md`.
- Verified: `node --test tests/*.test.cjs` (8 pass); Playwright full walkthrough, no page errors; keyboard bot clears all four levels in 20–25 s each.
- Open risks: tune level goals after a live beginner playtest; name is sanitised to letters/spaces-safe text; APIs/AI/deploy are clearly labelled mocks.
