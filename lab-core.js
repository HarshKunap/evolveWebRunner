// EVOLVE — Web Build Lab: pure logic (no DOM). Used by lab.js and the Node tests.
(function (root) {
  "use strict";

  const C = root.EVOLVE_LAB_CONTENT || (typeof require === "function" ? require("./stages.js") : null);
  const { FILES, SLOTS, STAGES, ASSETS } = C;

  const POINTS = { slot: 100, mistake: 100, hint: 30, coin: 50, crash: 40, perMetre: 1, targetSeconds: 420, timeRate: 4 };

  function cleanName(name) {
    const n = String(name || "").replace(/[<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
    return n || "WEB DEV";
  }

  function createState(name) {
    return {
      name: cleanName(name),
      stage: 0,           // index into STAGES of the layer being built
      shipped: -1,        // highest shipped layer index
      fills: {},          // slotId -> tileId
      mistakes: 0, hints: 0,
      stagePoints: STAGES.map(() => ({ slots: 0, mistakes: 0, hints: 0 })),
      runs: [],           // { level, distance, coins, crashes, points }
      started: 0, finished: 0
    };
  }

  function tileById(id) {
    for (const s of STAGES) for (const t of s.tiles) if (t.id === id) return t;
    return null;
  }

  function stageSlots(i) {
    const n = i + 1, out = [];
    for (const file of Object.keys(FILES)) {
      for (const line of FILES[file].lines) if (line.slot && line.s === n) out.push(line.slot);
    }
    return out;
  }

  function isStageComplete(state, i) {
    return stageSlots(i).every((id) => state.fills[id]);
  }

  // The slot the player must fill next: blocks go in top to bottom.
  function currentSlot(state) {
    return stageSlots(state.stage).find((id) => !state.fills[id]) || null;
  }

  // Try to place a tile. Returns { ok, slot, replaced, reason, why, penalty }.
  // Blocks must be placed in order. A wrong block on the current line costs points (penalty: true).
  function place(state, tileId, slotId) {
    const tile = tileById(tileId);
    const stage = STAGES[state.stage];
    if (!tile) return { ok: false, reason: "unknown" };
    if (!stage.tiles.includes(tile)) return { ok: false, reason: "wrong-stage" };
    const slots = stageSlots(state.stage);
    const current = currentSlot(state);
    if (tile.decoy) return { ok: false, reason: "decoy", why: tile.why, penalty: true, slot: current };

    // Changing your mind on a choice you already made (e.g. Bot -> Cat) is free.
    const chosenSlot = slots.find((id) => state.fills[id] && SLOTS[id].group === tile.group);
    if (tile.choice && chosenSlot && (!slotId || slotId === chosenSlot)) {
      const previous = state.fills[chosenSlot];
      if (previous === tile.id) return { ok: true, slot: chosenSlot, replaced: null, same: true };
      state.fills[chosenSlot] = tile.id;
      return { ok: true, slot: chosenSlot, replaced: previous };
    }
    if (!current) return { ok: false, reason: "no-slot" };
    if (slotId && slotId !== current) return { ok: false, reason: "order", slot: current, why: "Fill the lines in order. The next line needs " + SLOTS[current].hint + "." };
    if (SLOTS[current].group !== tile.group) {
      const home = slots.find((id) => SLOTS[id].group === tile.group);
      return { ok: false, reason: "wrong-slot", penalty: true, slot: current,
        why: "This line needs " + SLOTS[current].hint + ". That block goes somewhere else" + (home ? ": on the \u201c" + SLOTS[home].hint + "\u201d line." : ".") };
    }
    state.fills[current] = tile.id;
    return { ok: true, slot: current, replaced: null };
  }

  function removeFill(state, slotId) {
    if (!stageSlots(state.stage).includes(slotId)) return false;
    delete state.fills[slotId];
    return true;
  }

  // First empty slot of the current stage plus a tile that fits it.
  function nextHint(state) {
    const slot = stageSlots(state.stage).find((id) => !state.fills[id]);
    if (!slot) return null;
    const tile = STAGES[state.stage].tiles.find((t) => !t.decoy && t.group === SLOTS[slot].group);
    return { slot, tile: tile && tile.id };
  }

  function tileCode(tile, state, real) {
    let code = tile.code.replace("{NAME}", state.name);
    if (real && tile.asset) code = code.replace(/src="[^"]*"/, 'src="' + ASSETS[tile.asset] + '"');
    return code;
  }

  // Lines of a file visible at layer `upTo` (1-based). Each: { kind:'given'|'slot', s, text, slot, tile }
  function fileLines(state, file, upTo, real) {
    const out = [];
    for (const line of FILES[file].lines) {
      if (line.s > upTo) continue;
      if (line.slot) {
        const def = SLOTS[line.slot];
        const tile = state.fills[line.slot] ? tileById(state.fills[line.slot]) : null;
        out.push({ kind: "slot", s: line.s, slot: line.slot, tile: tile && tile.id,
          text: tile ? def.indent + tileCode(tile, state, real) : null, indent: def.indent });
      } else {
        out.push({ kind: "given", s: line.s, text: line.t });
      }
    }
    return out;
  }

  function fileText(state, file, upTo, real) {
    return fileLines(state, file, upTo, real).filter((l) => l.text !== null).map((l) => l.text).join("\n");
  }

  function visibleFiles(upTo) {
    return Object.keys(FILES).filter((f) => FILES[f].from <= upTo);
  }

  function chosen(state, slot) {
    const t = state.fills[slot] && tileById(state.fills[slot]);
    return t ? t.id : null;
  }

  // Runtime config for the in-page engine, from what has been built and shipped.
  function runtimeConfig(state, opts) {
    const shipped = state.shipped; // index
    const stage = STAGES[state.stage];
    const playing = opts && opts.play ? stage.play : null;
    return {
      name: state.name,
      js: shipped >= 2,
      level: playing ? playing.level : 0,
      goal: playing ? playing.goal : 0,
      speed: playing ? playing.speed : 0,
      spawnMs: playing ? (chosen(state, "spawn") === "sp-spicy" ? Math.round(playing.spawnMs * 0.8) : playing.spawnMs) : 0,
      labels: playing ? playing.labels : [],
      highLabels: playing && playing.highLabels ? playing.highLabels : [],
      doubleJump: chosen(state, "input") === "k-double",
      duck: shipped >= 3, coins: shipped >= 3,
      feed: shipped >= 3 ? (chosen(state, "feed") === "feed-news" ? "news" : "board") : null,
      touch: shipped >= 4,
      ai: shipped >= 5, save: shipped >= 5, deployed: shipped >= 5,
      board: (opts && opts.board) || [],
      news: C.NEWS,
      bestKey: "evolve-lab-best"
    };
  }

  // Build the full HTML document for the preview iframe.
  function buildDocument(state, opts) {
    opts = opts || {};
    const upTo = Math.min(STAGES.length, state.stage + 1);
    let html = fileText(state, "index.html", upTo, true);
    const inline = (file) => "<style>\n" + fileText(state, file, upTo, true) + "\n</style>";
    html = html.replace('<link rel="stylesheet" href="style.css">', upTo >= 2 ? inline("style.css") : "");
    html = html.replace('<link rel="stylesheet" href="responsive.css">', upTo >= 5 ? inline("responsive.css") : "");
    html = html.replace(/\s*<script src="[^"]+"><\/script>/g, "");
    const cfg = runtimeConfig(state, opts);
    const probe = "<script>window.__LAB__=" + JSON.stringify(cfg).replace(/</g, "\\u003c") + ";<\/script>" +
      "<script>(" + (opts.runtimeSrc || "function(){}") + ")();<\/script>";
    return html.replace("</body>", probe + "\n</body>");
  }

  function runPoints(run, spicy) {
    const raw = Math.floor(run.distance) * POINTS.perMetre + run.coins * POINTS.coin - run.crashes * POINTS.crash;
    return Math.max(0, Math.round(raw * (spicy ? 1.25 : 1)));
  }

  function score(state, nowSeconds) {
    // +100 per line actually filled (removing and re-adding a block can't farm points)
    const earned = state.stagePoints.reduce((sum, p, i) => {
      const filled = i <= state.stage ? stageSlots(i).filter((id) => state.fills[id]).length : 0;
      return sum + Math.max(0, filled * POINTS.slot - p.hints * POINTS.hint);
    }, 0);
    const lost = state.stagePoints.reduce((sum, p) => sum + p.mistakes * POINTS.mistake, 0);
    const build = earned - lost;          // wrong blocks always cost the full 100, so spamming never pays
    const spicy = chosen(state, "spawn") === "sp-spicy";
    const run = state.runs.reduce((sum, r) => sum + runPoints(r, spicy), 0);
    const seconds = nowSeconds == null ? 0 : nowSeconds;
    const time = state.finished ? Math.max(0, Math.floor((POINTS.targetSeconds - seconds) * POINTS.timeRate)) : 0;
    return { build, run, time, total: build + run + time };   // can go negative: every wrong block visibly costs 100
  }

  function compareEntries(a, b) {
    if (a.score !== b.score) return b.score - a.score;
    if (a.time !== b.time) return a.time - b.time;
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  const api = { POINTS, cleanName, createState, tileById, stageSlots, currentSlot, isStageComplete, place, removeFill, nextHint,
    fileLines, fileText, visibleFiles, runtimeConfig, buildDocument, runPoints, score, compareEntries, chosen };
  root.EVOLVE_LAB_CORE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
