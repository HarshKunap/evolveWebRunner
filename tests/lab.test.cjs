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
  const st = Core.createState("Harsh");
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
  const st = Core.createState("Harsh");
  ["h1", "p", "game", "dev", "btn"].forEach((id) => Core.place(st, id));
  let doc = Core.buildDocument(st, { runtimeSrc: R.SRC });
  assert.match(doc, /<h1>Harsh's Web Runner<\/h1>/);
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

test("scoring: build points, mistakes, run points, spicy bonus, time bonus only at finish", () => {
  const st = Core.createState("A");
  ["h1", "p", "game", "bot", "btn"].forEach((id) => Core.place(st, id));
  st.stagePoints[0] = { slots: 5, mistakes: 2, hints: 1 };
  st.runs.push({ level: 1, distance: 320, coins: 2, crashes: 1 });
  let s = Core.score(st, 300);
  assert.equal(s.build, 500 - 30 - 200);          // each wrong block costs a full 100
  assert.equal(s.run, 320 + 100 - 40);
  assert.equal(s.time, 0);
  st.finished = 1;
  s = Core.score(st, 300);
  assert.equal(s.time, (420 - 300) * 4);
  assert.equal(Core.score(st, 500).time, 0);
  st.fills.spawn = "sp-spicy";
  assert.equal(Core.score(st, 300).run, Math.round(380 * 1.25));
});

test("spamming wrong blocks can never pay: total drops by 100 per mistake", () => {
  const st = Core.createState("A");
  ["h1", "p", "game", "bot", "btn"].forEach((id) => Core.place(st, id));
  const clean = Core.score(st, 0).total;
  st.stagePoints[0].mistakes = 3;
  assert.equal(Core.score(st, 0).total, clean - 300);
  st.stagePoints[0].mistakes = 50;
  assert.equal(Core.score(st, 0).total, clean - 5000);
});

test("removing and re-adding a block does not farm points", () => {
  const st = Core.createState("A");
  Core.place(st, "h1");
  const once = Core.score(st, 0).build;
  for (let i = 0; i < 5; i++) { Core.removeFill(st, "heading"); Core.place(st, "h1"); }
  assert.equal(Core.score(st, 0).build, once);
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
