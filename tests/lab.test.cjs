const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../stages.js");
const Core = require("../lab-core.js");
const R = require("../runtime.js");

test("six layers in order, each with correct blocks for every slot and at least one decoy", () => {
  assert.deepEqual(C.STAGES.map((s) => s.key), ["html", "css", "js", "api", "responsive", "ai"]);
  C.STAGES.forEach((s, i) => {
    const slots = Core.stageSlots(i);
    assert.ok(slots.length >= 4, s.key + " has slots");
    slots.forEach((id) => assert.ok(s.tiles.some((t) => !t.decoy && t.group === C.SLOTS[id].group), s.key + " fills " + id));
    assert.ok(s.tiles.some((t) => t.decoy && t.why), s.key + " decoy");
    s.tiles.forEach((t) => assert.ok(t.decoy ? t.why : t.lesson, t.id + " explains itself"));
  });
});

test("HTML and CSS alone cannot play; play unlocks from JavaScript onward", () => {
  assert.equal(C.STAGES[0].play, undefined);
  assert.equal(C.STAGES[1].play, undefined);
  C.STAGES.slice(2).forEach((s) => assert.ok(s.play && s.play.goal > 0));
  const st = Core.createState("A");
  st.shipped = 1;
  assert.equal(Core.runtimeConfig(st, {}).js, false);
  st.shipped = 2;
  assert.equal(Core.runtimeConfig(st, {}).js, true);
});

test("placing: strict top-to-bottom order, wrong blocks flagged for a penalty, choices swap freely", () => {
  const st = Core.createState("Ada");
  assert.equal(Core.currentSlot(st), "heading");
  const decoy = Core.place(st, "x-color");
  assert.equal(decoy.reason, "decoy"); assert.equal(decoy.penalty, true);
  const early = Core.place(st, "p");               // paragraph before heading
  assert.equal(early.reason, "wrong-slot"); assert.equal(early.penalty, true);
  assert.match(early.why, /goes somewhere else/);
  assert.equal(Core.place(st, "h1", "text").reason, "order");   // dragging onto a later line: no penalty
  assert.equal(Core.place(st, "h1", "text").penalty, undefined);
  assert.equal(Core.place(st, "grid").reason, "wrong-stage");
  ["h1", "p", "game"].forEach((id) => assert.ok(Core.place(st, id).ok));
  assert.ok(Core.place(st, "bot").ok);
  assert.equal(Core.place(st, "cat").replaced, "bot");        // change of mind on a choice is free
  assert.equal(Core.currentSlot(st), "button");
  assert.ok(Core.place(st, "btn").ok);
  assert.ok(Core.isStageComplete(st, 0));
  assert.equal(Core.nextHint(st), null);
});

test("document renders the literal HTML/CSS the player placed", () => {
  const st = Core.createState("Ada");
  ["h1", "p", "game", "dev", "btn"].forEach((id) => Core.place(st, id));
  let doc = Core.buildDocument(st, { runtimeSrc: R.SRC });
  assert.match(doc, /<h1>Ada's Web Runner<\/h1>/);
  assert.match(doc, /src="data:image\/svg\+xml/);
  assert.doesNotMatch(doc, /<style>/);
  st.shipped = 0; st.stage = 1;
  Core.place(st, "ac-blue"); Core.place(st, "bg-night");
  doc = Core.buildDocument(st, { runtimeSrc: R.SRC });
  assert.match(doc, /--accent: #2965f1;/);
  assert.match(doc, /background: #0b1020/);
  assert.doesNotMatch(doc, /<script src=/);
});

test("names are sanitised so they cannot inject markup", () => {
  assert.equal(Core.cleanName("<b>x</b>\"'"), "bx/b");
  assert.equal(Core.cleanName(""), "WEB DEV");
});

// helper: fill every line of every layer in order through the same calls the UI makes
function buildAll(st) {
  for (let i = 0; i < 6; i++) {
    st.stage = i;
    Core.stageSlots(i).forEach(() => { const h = Core.nextHint(st); const r = Core.place(st, h.tile); Core.awardLine(st, r.slot); });
  }
}

test("scoring constants: 60 code, 40 speed, -4 wrong, -2 hint, +2 coin (max +10), -3 crash", () => {
  const P = Core.POINTS;
  assert.deepEqual([P.codeMax, P.timeMax, P.mistake, P.hint, P.coin, P.coinMax, P.crash, P.max], [60, 40, 4, 2, 2, 10, 3, 100]);
});

test("all 27 lines pay exactly 60; a perfect build under 5:00 scores exactly 100", () => {
  const st = Core.createState("A");
  assert.equal(Core.score(st).total, 0);
  buildAll(st);
  assert.equal(Core.score(st).total, 60);
  assert.equal(Core.score(st).filled, 27);
  Core.recordFinish(st, 299);
  assert.equal(Core.score(st).total, 100);
  assert.equal(Core.recordFinish(st, 1), 0);                 // speed can only be awarded once
});

test("0 is a hard floor: a mistake, hint or crash at 0 costs nothing and leaves no hidden debt", () => {
  const st = Core.createState("A");
  assert.equal(Core.recordMistake(st), 0);
  assert.equal(Core.recordHint(st), 0);
  assert.equal(Core.recordCrash(st), 0);
  assert.equal(Core.score(st).total, 0);
  Core.place(st, "h1"); const gained = Core.awardLine(st, "heading");
  assert.ok(gained > 0);
  assert.equal(Core.score(st).total, gained);               // next correct line raises the score straight away
  assert.equal(Core.recordMistake(st), -gained);            // only what exists can be taken
  assert.equal(Core.score(st).total, 0);
});

test("the score never leaves 0..100 under thousands of random events", () => {
  let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let run = 0; run < 300; run++) {
    const st = Core.createState("R");
    const slots = []; for (let i = 0; i < 6; i++) slots.push(...Core.stageSlots(i));
    for (let k = 0; k < 120; k++) {
      const r = rnd();
      if (r < 0.3) Core.awardLine(st, slots[Math.floor(rnd() * slots.length)]);
      else if (r < 0.5) Core.recordMistake(st);
      else if (r < 0.6) Core.recordHint(st);
      else if (r < 0.8) Core.recordCoin(st);
      else if (r < 0.95) Core.recordCrash(st);
      else Core.recordFinish(st, rnd() * 700);
      const sc = Core.score(st);
      assert.ok(Number.isInteger(sc.total) && sc.total >= 0 && sc.total <= 100, "total " + sc.total);
      assert.equal(sc.code + sc.time + sc.play, sc.total);     // the result cards always add up exactly
      assert.ok(sc.coins <= 10);
    }
  }
});

test("penalties when you have points: wrong -4, hint -2, crash -3; coins +2 up to +10", () => {
  const st = Core.createState("A");
  buildAll(st);                                              // 60
  assert.equal(Core.recordMistake(st), -4);
  assert.equal(Core.recordHint(st), -2);
  assert.equal(Core.recordCrash(st), -3);
  assert.equal(Core.score(st).total, 51);
  for (let c = 0; c < 8; c++) Core.recordCoin(st);           // 8 coins but only +10
  assert.equal(Core.score(st).coins, 10);
  assert.equal(Core.score(st).coinsGot, 8);
  assert.equal(Core.score(st).total, 61);
});

test("100 is a hard ceiling: a perfect fast run plus every coin stays at 100", () => {
  const st = Core.createState("A");
  buildAll(st);
  for (let c = 0; c < 5; c++) Core.recordCoin(st);           // 70
  Core.recordFinish(st, 100);                                // +40 would be 110
  const sc = Core.score(st);
  assert.equal(sc.total, 100);
  assert.equal(sc.code + sc.time + sc.play, 100);
});

test("removing and re-adding a line never pays twice", () => {
  const st = Core.createState("A");
  Core.place(st, "h1"); Core.awardLine(st, "heading");
  const once = Core.score(st).total;
  for (let i = 0; i < 5; i++) { Core.removeFill(st, "heading"); Core.place(st, "h1"); Core.awardLine(st, "heading"); }
  assert.equal(Core.score(st).total, once);
});

test("speed tiers use the whole seconds the clock shows", () => {
  [[1, 40], [299.9, 40], [300, 40], [300.99, 40], [301, 30], [359.99, 30], [360, 20], [419.99, 20], [420, 10], [479.99, 10], [480, 0], [900, 0]]
    .forEach(([sec, pts]) => assert.equal(Core.timeBonus(sec), pts, sec + "s"));
});

test("score code: matches the spec's known values, 6 chars, reversible and unique for 0-100", () => {
  assert.equal(Core.encryptScore(0), "YPNMLM");
  assert.equal(Core.encryptScore(50), "0TYYWM");
  assert.equal(Core.encryptScore(100), "2X9A7M");
  const seen = new Set();
  for (let s = 0; s <= 100; s++) {
    const code = Core.encryptScore(s);
    assert.match(code, /^[0-9A-Z]{6}$/);
    assert.equal(Core.decryptScore(code), s);
    seen.add(code);
  }
  assert.equal(seen.size, 101);
  [-1, 101, 50.5, NaN, "50"].forEach((bad) => assert.throws(() => Core.encryptScore(bad), /between 0 and 100/));
});

test("leaderboard orders by score then faster time", () => {
  const list = [{ score: 900, time: 400 }, { score: 1200, time: 500 }, { score: 1200, time: 380 }].sort(Core.compareEntries);
  assert.deepEqual(list.map((x) => x.time), [380, 500, 400]);
});

test("runtime source is injectable (no closing script tag)", () => {
  assert.doesNotMatch(R.SRC, /<\/script/i);
});

test("no source file contains a literal closing script tag (keeps single-file builds working)", () => {
  const fs = require("fs"), path = require("path");
  ["stages.js", "lab-core.js", "runtime.js", "lab.js"].forEach((f) => {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), /<\/script/i, f);
  });
});
