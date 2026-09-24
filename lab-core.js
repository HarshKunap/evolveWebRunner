// EVOLVE — Web Build Lab: pure logic (no DOM). Used by lab.js and the Node tests.
(function (root) {
  "use strict";

  const C = root.EVOLVE_LAB_CONTENT || (typeof require === "function" ? require("./stages.js") : null);
  const { FILES, SLOTS, STAGES, ASSETS } = C;

  // Score out of 100: up to 60 for the code (accuracy), up to 40 for speed.
  // Code starts at 0 and climbs as lines are filled (all 27 lines = 60). Mistakes/hints subtract (floors at 0).
  // Score never leaves 0..100: every event is clamped as it happens (no hidden debt, no overflow).
  // Speed (added when you finish): under 7:00 = 40, under 8:00 = 30, under 9:00 = 20, under 10:00 = 10, 10:00+ = 0.
  // Wrong block −4, paid hint −2, crash in a level −1. Coins in levels: +2 each, bonus capped at +10. Total capped at 100.
  const POINTS = { max: 100, codeMax: 60, timeMax: 40, mistake: 4, hint: 2,
    speedTiers: [[420, 40], [480, 30], [540, 20], [600, 10]],   // [finish under this many seconds, points]
    coin: 2, coinMax: 10, crash: 1, perMetre: 1 };

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
      mistakes: 0, hints: 0, coinCount: 0, crashCount: 0,
      stagePoints: STAGES.map(() => ({ slots: 0, mistakes: 0, hints: 0 })),
      runs: [],           // { level, distance, coins, crashes }
      started: 0, finished: 0,
      // Running score, clamped to 0..100 after EVERY event. tally holds what each kind of event
      // actually added/removed, so the parts always add up exactly to the total.
      points: 0,
      tally: { lines: 0, mistakes: 0, hints: 0, coins: 0, crashes: 0, speed: 0 },
      earned: {},         // slotId -> true once its line has paid out (re-adding never pays twice)
      coinGross: 0,       // coin points credited so far (bonus capped at POINTS.coinMax)
      speedDone: false
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

  const TOTAL_SLOTS = STAGES.reduce((n, _s, i) => n + stageSlots(i).length, 0);

  // Uses whole seconds, exactly what the clock shows (6:59.9 reads "6:59", so it still counts as under 7:00).
  function timeBonus(seconds) {
    seconds = Math.floor(seconds);
    for (const [limit, pts] of POINTS.speedTiers) if (seconds < limit) return pts;
    return 0;
  }

  // Add delta to the running score, clamped to [0, max]. Returns what was actually applied.
  function applyPoints(state, kind, delta) {
    const raw = delta >= 0 ? Math.min(delta, POINTS.max - state.points) : -Math.min(-delta, state.points);
    const applied = raw === 0 ? 0 : raw;                  // never return -0
    state.points += applied;
    state.tally[kind] += applied;
    return applied;
  }

  // A line pays out the first time it is filled: all 27 lines together pay exactly 60.
  function awardLine(state, slotId) {
    if (!slotId || state.earned[slotId]) return 0;
    state.earned[slotId] = true;
    const k = Object.keys(state.earned).length;
    const delta = Math.round(POINTS.codeMax * k / TOTAL_SLOTS) - Math.round(POINTS.codeMax * (k - 1) / TOTAL_SLOTS);
    return applyPoints(state, "lines", delta);
  }
  function recordMistake(state) {
    state.mistakes += 1; state.stagePoints[state.stage].mistakes += 1;
    return applyPoints(state, "mistakes", -POINTS.mistake);
  }
  function recordHint(state) {
    state.hints += 1; state.stagePoints[state.stage].hints += 1;
    return applyPoints(state, "hints", -POINTS.hint);
  }
  function recordCoin(state) {
    state.coinCount += 1;
    const gross = Math.max(0, Math.min(POINTS.coin, POINTS.coinMax - state.coinGross));
    state.coinGross += gross;
    return applyPoints(state, "coins", gross);
  }
  function recordCrash(state) {
    state.crashCount += 1;
    return applyPoints(state, "crashes", -POINTS.crash);
  }
  function recordFinish(state, seconds) {
    if (state.speedDone) return 0;
    state.speedDone = true;
    return applyPoints(state, "speed", timeBonus(seconds));
  }

  function score(state) {
    const t = state.tally;
    return {
      total: state.points,
      code: t.lines + t.mistakes + t.hints, lines: t.lines, mistakePts: t.mistakes, hintPts: t.hints,
      time: t.speed,
      play: t.coins + t.crashes, coins: t.coins, crashLoss: -t.crashes,
      mistakes: state.mistakes, hints: state.hints, coinsGot: state.coinCount, crashes: state.crashCount,
      filled: Object.keys(state.earned).length
    };
  }

  // ---------- Score code (shared with the organisers' decryption site) ----------
  // Encrypts an integer score 0..100 into a fixed 6-character base-36 code.
  // BigInt keeps every step exact (no 32-bit overflow); modulo is normalised to be non-negative.
  const CODE = { CHARSET: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", PRIME: 381001n, SECRET_KEY: 98765n, LENGTH: 6 };
  const mod = (a, m) => ((a % m) + m) % m;

  function encryptScore(score) {
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new RangeError("Score must be between 0 and 100");
    const base = BigInt(CODE.CHARSET.length);                       // 36
    const v = BigInt(score) * CODE.PRIME + CODE.SECRET_KEY;
    let power = 1n, out = "";
    for (let i = 0; i < CODE.LENGTH; i++) {
      const d = mod(v / power, base);                                // BigInt division truncates (v is positive)
      const c = mod(d + CODE.SECRET_KEY + BigInt(i), base);
      out += CODE.CHARSET[Number(c)];
      power *= base;
    }
    return out;
  }

  // Inverse, used only by the tests to prove the code is reversible.
  function decryptScore(code) {
    const base = BigInt(CODE.CHARSET.length);
    let v = 0n, power = 1n;
    for (let i = 0; i < CODE.LENGTH; i++) {
      const c = BigInt(CODE.CHARSET.indexOf(code[i]));
      if (c < 0n) throw new Error("bad character");
      v += mod(c - CODE.SECRET_KEY - BigInt(i), base) * power;
      power *= base;
    }
    const s = v - CODE.SECRET_KEY;
    if (s < 0n || s % CODE.PRIME !== 0n) throw new Error("invalid code");
    return Number(s / CODE.PRIME);
  }

  function compareEntries(a, b) {
    if (a.score !== b.score) return b.score - a.score;
    if (a.time !== b.time) return a.time - b.time;
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  const api = { POINTS, cleanName, createState, tileById, stageSlots, currentSlot, isStageComplete, place, removeFill, nextHint,
    fileLines, fileText, visibleFiles, runtimeConfig, buildDocument, runPoints, score, timeBonus, TOTAL_SLOTS, applyPoints, awardLine, recordMistake, recordHint, recordCoin, recordCrash, recordFinish, encryptScore, decryptScore, CODE, compareEntries, chosen };
  root.EVOLVE_LAB_CORE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
