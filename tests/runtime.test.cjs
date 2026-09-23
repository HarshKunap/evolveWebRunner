const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

function makeGame() {
  let now = 1000;
  let nextFrame = 0;
  const frames = new Map();
  const elements = new Map();
  const storage = new Map();
  const listeners = new Map();
  class Element {
    constructor(id) {
      this.id = id;
      this.hidden = false;
      this.textContent = "";
      this.value = id === "player-name" ? "TESTER" : "";
      this.children = [];
      this.style = { setProperty() {} };
      this.dataset = {};
      this.handlers = {};
      this.width = 1200;
      this.height = 620;
    }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    setAttribute() {}
    focus() { this.focused = true; }
    append(...children) { this.children.push(...children); }
    click() { this.handlers.click?.(); }
    getContext() {
      return new Proxy({}, { get(_, key) {
        if (key === "createLinearGradient") return () => ({ addColorStop() {} });
        return () => {};
      } });
    }
    set innerHTML(value) { this._html = value; this.children = []; }
    get innerHTML() { return this._html || ""; }
  }
  const document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element(id));
      return elements.get(id);
    },
    querySelector(selector) { return this.getElementById(selector); },
    createElement: tag => new Element(tag),
    addEventListener: (name, handler) => listeners.set(name, handler),
    activeElement: null
  };
  const context = {
    document,
    performance: { now: () => now },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    location: { search: "?test=1" },
    URLSearchParams,
    setTimeout: callback => callback(),
    console
  };
  context.window = context;
  context.window.addEventListener = (name, handler) => listeners.set(name, handler);
  vm.createContext(context);
  for (const file of ["content.js", "scoring.js", "game.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  const el = id => elements.get(id);
  function step(milliseconds = 16) {
    now += milliseconds;
    const [id, callback] = frames.entries().next().value || [];
    assert.ok(callback, "expected a scheduled frame");
    frames.delete(id);
    callback(now);
  }
  return { context, el, step, advance: milliseconds => { now += milliseconds; },
    emitVisibility: hidden => { document.hidden = hidden; listeners.get("visibilitychange")?.(); },
    emitBlur: () => listeners.get("blur")?.(),
    pressKey: key => listeners.get("keydown")?.({ key, repeat: false, preventDefault() {} }),
    releaseKey: key => listeners.get("keyup")?.({ key }),
    start: () => el("start-button").click(),
    startRun: () => { el("start-button").click(); context.EVOLVE_DEBUG.completePrologue(); },
    replay: () => el("replay-button").click(),
    debug: context.EVOLVE_DEBUG,
    storage };
}

test("HTML opening is interactive markup outside the scored timer", () => {
  const game = makeGame();
  game.start();
  assert.equal(game.debug.getState().phase, "prologue");
  assert.equal(game.debug.getState().elapsed, 0);
  game.debug.setColor("orange");
  game.step(5000);
  assert.equal(game.debug.getState().phase, "prologue");
  assert.equal(game.debug.getState().elapsed, 0);
  game.step(5000);
  assert.equal(game.debug.getState().phase, "running");
  assert.equal(game.debug.getState().elapsed, 0);
  assert.equal(game.debug.getState().colorChoice, "orange");
  assert.equal(game.el("game-canvas").focused, true);
  game.debug.collectDrop("css-theme");
  assert.equal(game.el("game-frame").dataset.theme, "orange");
  assert.ok(game.el("game-frame").dataset.build.includes("theme"));
});

test("returning to a tab after the HTML opening starts the scored run", () => {
  const game = makeGame();
  game.start();
  game.advance(11000);
  game.emitVisibility(true);
  game.emitVisibility(false);
  game.step(16);
  assert.equal(game.debug.getState().phase, "running");
  assert.equal(game.debug.getState().elapsed, 0);
});

test("speed and bug drops expire, while missed build choices remain missed", () => {
  const game = makeGame();
  game.startRun();
  game.debug.missDrop("css-theme");
  game.debug.collectDrop("css-boost");
  game.step(16);
  assert.ok(game.debug.getState().speed >= 46);
  game.debug.collectDrop("css-clip");
  assert.equal(game.debug.getState().activeBug, "clip");
  game.advance(5000);
  game.step(16);
  assert.equal(game.debug.getState().activeBug, null);
  assert.ok(game.debug.getState().speed < 38);
  assert.deepEqual(Array.from(game.debug.getState().build), []);
  game.debug.timeout();
  assert.ok(game.el("drop-recap").children.some(item =>
    item.dataset.status === "missed" && item.children[1].textContent.includes("color")));
});

test("pickup feedback calls out a temporary nerf and its remaining time", () => {
  const game = makeGame();
  game.startRun();
  game.debug.collectDrop("responsive-bloat");
  assert.equal(game.el("pickup-toast").children[0].textContent, "NERF · TEMPORARY");
  assert.equal(game.el("pickup-toast").children[1].textContent, "HITBOX +17% FOR 5S");
  game.step();
  assert.ok(game.el("game-frame").dataset.effects.includes("nerf"));
  assert.ok(game.el("effect-status").children[0].textContent.includes("OVERSIZED HITBOX"));
});

test("a timed jump catches the first build drop and running through a speed drop boosts pace", () => {
  const game = makeGame();
  game.startRun();
  game.debug.setDistance(315);
  game.pressKey(" ");
  for (let i = 0; i < 35 && !game.debug.getState().collectedDrops.includes("css-theme"); i++) game.step(16);
  assert.ok(game.debug.getState().collectedDrops.includes("css-theme"));
  assert.ok(game.debug.getState().build.includes("theme"));
  for (let i = 0; i < 40 && game.debug.getState().jumpY > 0; i++) game.step(16);
  game.debug.setDistance(645);
  for (let i = 0; i < 35 && !game.debug.getState().collectedDrops.includes("css-boost"); i++) game.step(16);
  assert.ok(game.debug.getState().collectedDrops.includes("css-boost"));
  game.step(16);
  assert.ok(game.debug.getState().speed > 40);
});

test("the clean 10,000 m course finishes in the intended 3–4 minute range", () => {
  const game = makeGame();
  for (const obstacle of Object.values(game.context.EVOLVE_CONTENT.obstacles)) {
    obstacle.kind = "jump";
    obstacle.height = 0;
  }
  game.startRun();
  for (const drop of game.context.EVOLVE_CONTENT.drops) game.debug.missDrop(drop.id);
  let frames = 0;
  while (game.debug.getState().phase === "running" && frames++ < 5000) game.step(50);
  assert.ok(frames < 5000, "run should reach the finish");
  assert.equal(game.el("result-title").textContent, "DEPLOYED ✓");
  const finishTime = game.debug.getState().elapsed;
  assert.ok(finishTime > 175 && finishTime < 195, "scored finish was " + finishTime + "s");
});

test("doing nothing cannot finish before the ten-minute cutoff", () => {
  const game = makeGame();
  game.startRun();
  let frames = 0;
  while (game.debug.getState().phase === "running" && frames++ < 13000) game.step(50);
  assert.ok(frames < 13000, "run should reach a result");
  assert.equal(game.el("result-title").textContent, "DNF", JSON.stringify(game.debug.getState()));
  assert.ok(game.debug.getState().distance > 6000 && game.debug.getState().distance < 10000,
    "a no-input run reached " + game.debug.getState().distance + " m");
});

test("a full build still needs player input to finish", () => {
  const game = makeGame();
  game.startRun();
  for (const drop of game.context.EVOLVE_CONTENT.drops.filter(item => item.kind === "build")) {
    game.debug.collectDrop(drop.id);
  }
  let frames = 0;
  while (game.debug.getState().phase === "running" && frames++ < 13000) game.step(50);
  assert.ok(frames < 13000, "run should reach a result");
  assert.equal(game.el("result-title").textContent, "DNF", JSON.stringify(game.debug.getState()));
});

test("each era's caught build tool appears in the player's page and inventory", () => {
  const game = makeGame();
  game.startRun();
  const builds = Array.from(game.context.EVOLVE_CONTENT.drops).filter(drop => drop.kind === "build");
  const layers = { theme: ".world-theme", doubleJump: ".world-interaction", feed: ".world-feed",
    reflow: ".world-reflow", cache: ".world-cache", predict: ".world-predict" };
  for (const drop of builds) {
    const era = Array.from(game.context.EVOLVE_CONTENT.eras).find(item => item.key === drop.era);
    game.debug.setDistance(era.at);
    game.debug.collectDrop(drop.id);
    assert.ok(game.debug.getState().build.includes(drop.effect));
    assert.equal(game.el(layers[drop.effect]).hidden, false);
  }
  assert.equal(game.el("build-items").children.length, 6);
  assert.equal(game.el("game-frame").dataset.build.split(" ").length, 6);
});

test("fast finish shows exact score, all chips, and a saved leaderboard entry", () => {
  const game = makeGame();
  game.startRun();
  game.debug.setElapsed(300);
  game.debug.setDistance(9999.9);
  game.step(16);
  assert.equal(game.el("result-title").textContent, "DEPLOYED ✓");
  assert.equal(game.el("result-bonus").textContent, "+4,999");
  assert.equal(game.el("result-score").textContent, "14,999");
  assert.equal(game.el("score-value").textContent, "10,000");
  assert.equal(game.el("chips-recap").children.length, 6);
  assert.equal(game.el("leaderboard-list").children.length, 1);
  game.replay();
  assert.equal(game.debug.getState().phase, "prologue");
  assert.equal(game.debug.getState().distance, 0);
  assert.equal(game.el("end-screen").hidden, true);
});

test("near-timeout finish beats a near-max DNF", () => {
  const game = makeGame();
  game.startRun();
  game.debug.setElapsed(598.98);
  game.debug.setDistance(9999.9);
  game.step(16);
  assert.equal(game.el("result-title").textContent, "DEPLOYED ✓");
  assert.equal(game.el("result-score").textContent, "10,016");
  game.replay();
  game.debug.completePrologue();
  game.debug.setDistance(9999.9);
  game.debug.timeout();
  assert.equal(game.el("result-title").textContent, "DNF");
  assert.equal(game.el("result-score").textContent, "9,999");
  assert.equal(game.el("result-bonus").textContent, "+0");
  assert.equal(game.el("leaderboard-list").children[0].children[1].textContent, "TESTER");
  assert.equal(game.el("leaderboard-list").children[0].children[2].textContent, "10,016 ✓");
});

test("crossing the finish at exactly 600 seconds is still a finish", () => {
  const game = makeGame();
  game.startRun();
  game.debug.setElapsed(599.984);
  game.debug.setDistance(9999.9);
  game.step(16);
  assert.equal(game.el("result-title").textContent, "DEPLOYED ✓");
  assert.equal(game.el("result-score").textContent, "10,000");
});

test("the HTML opening and six scored eras appear in order", () => {
  const game = makeGame();
  game.startRun();
  assert.equal(game.debug.getState().eraIndex, 1);
  const distances = [1300, 3100, 4900, 6700, 8300];
  const titles = ["JavaScript", "Web 2.0", "Responsive Web", "Cloud", "AI Web"];
  distances.forEach((distance, index) => {
    game.debug.setDistance(distance);
    assert.equal(game.debug.getState().eraIndex, index + 2);
    assert.ok(game.el("gate-title").textContent.startsWith(titles[index]));
  });
  assert.equal(game.debug.getState().earnedChips, 6);
  assert.equal(game.el("gate-chip").textContent, "MODERN WEB ✦ EVOLVED");
  assert.equal(game.el("game-frame").dataset.era, "ai");
  assert.equal(game.el("skill-path").children.length, 6);
  assert.ok(game.el("skill-path").children.every(chip => chip.className.includes("earned")));
});

test("pace rises with distance and optional builds change the playfield", () => {
  const game = makeGame();
  game.startRun();
  assert.equal(game.debug.getState().speed, 36);
  assert.equal(game.el("game-frame").dataset.era, "css");
  game.debug.setDistance(5000);
  game.step();
  const middlePace = game.debug.getState().speed;
  assert.ok(middlePace >= 56 && middlePace <= 58);
  game.debug.collectDrop("responsive-reflow");
  assert.ok(game.el("game-frame").dataset.build.includes("reflow"));
  game.debug.setDistance(9000);
  game.step();
  assert.ok(game.debug.getState().speed > middlePace);
  assert.equal(game.el("game-frame").dataset.era, "ai");
  game.debug.timeout();
  game.replay();
  assert.equal(game.debug.getState().speed, 36);
  assert.equal(game.el("game-frame").dataset.era, "html");
  assert.equal(game.el("game-frame").dataset.build, "");
});

test("collision recovery preserves the run and restart resets state", () => {
  const game = makeGame();
  game.startRun();
  game.debug.setDistance(1500);
  game.debug.forceCollision();
  assert.equal(game.debug.getState().collisions, 1);
  const before = game.debug.getState().distance;
  game.step(16);
  assert.equal(game.debug.getState().phase, "running");
  assert.ok(game.debug.getState().distance > before);
  assert.equal(game.debug.getState().earnedChips, 3);
  game.debug.timeout();
  game.replay();
  assert.equal(game.debug.getState().distance, 0);
  assert.equal(game.debug.getState().collisions, 0);
  assert.equal(game.debug.getState().earnedChips, 1);
  assert.equal(game.el("end-screen").hidden, true);
});

test("duck clears overhead hazards while standing collides with them", () => {
  const standing = makeGame();
  standing.startRun();
  standing.debug.addObstacle("tagBlock", 0);
  standing.step();
  assert.equal(standing.debug.getState().collisions, 1);

  const ducking = makeGame();
  ducking.startRun();
  ducking.pressKey("s");
  ducking.debug.addObstacle("tagBlock", 0);
  ducking.step();
  assert.equal(ducking.debug.getState().collisions, 0);
  ducking.releaseKey("s");

  const airborne = makeGame();
  airborne.startRun();
  airborne.pressKey(" ");
  airborne.step(50);
  airborne.debug.addObstacle("tagBlock", airborne.debug.getState().distance);
  airborne.step();
  assert.equal(airborne.debug.getState().collisions, 1,
    "jumping into a hanging panel should not replace ducking");
});

test("the CSS build physically narrows a near-miss obstacle", () => {
  const plain = makeGame();
  plain.startRun();
  plain.debug.addObstacle("divStack", -1.8);
  plain.step();
  assert.equal(plain.debug.getState().collisions, 1);

  const styled = makeGame();
  styled.startRun();
  styled.debug.collectDrop("css-theme");
  styled.debug.addObstacle("divStack", -1.8);
  styled.step();
  assert.equal(styled.debug.getState().collisions, 0);
});

test("gzip buff compresses obstacle collision boxes and visibly expires", () => {
  const plain = makeGame();
  plain.startRun();
  plain.debug.addObstacle("divStack", -1.8);
  plain.step();
  assert.equal(plain.debug.getState().collisions, 1);

  const compressed = makeGame();
  compressed.startRun();
  compressed.debug.collectDrop("cloud-gzip");
  compressed.debug.addObstacle("divStack", -1.8);
  compressed.step();
  assert.equal(compressed.debug.getState().collisions, 0);
  assert.ok(compressed.el("game-frame").dataset.effects.includes("compress"));
  assert.equal(compressed.el("pickup-toast").children[0].textContent, "BUFF · TEMPORARY");
  compressed.advance(6100);
  compressed.step();
  assert.ok(!compressed.el("game-frame").dataset.effects.includes("compress"));
});

test("corrupted resize actually enlarges the player's collision box", () => {
  const plain = makeGame();
  plain.startRun();
  plain.debug.addObstacle("divStack", 3.62);
  plain.step();
  assert.equal(plain.debug.getState().collisions, 0);

  const enlarged = makeGame();
  enlarged.startRun();
  enlarged.debug.collectDrop("responsive-bloat");
  enlarged.debug.addObstacle("divStack", 3.62);
  enlarged.step();
  assert.equal(enlarged.debug.getState().collisions, 1);
});

test("jump clears a ground hazard and losing focus releases duck", () => {
  const jumping = makeGame();
  jumping.startRun();
  jumping.pressKey(" ");
  jumping.step(50);
  jumping.step(50);
  jumping.step(50);
  jumping.debug.addObstacle("layoutWall", jumping.debug.getState().distance);
  jumping.step();
  assert.equal(jumping.debug.getState().collisions, 0);

  const blurred = makeGame();
  blurred.startRun();
  blurred.pressKey("s");
  blurred.emitBlur();
  blurred.debug.addObstacle("tagBlock", 0);
  blurred.step();
  assert.equal(blurred.debug.getState().collisions, 1);
});

test("JavaScript pickup gives a second air jump using the same Space key", () => {
  const basic = makeGame();
  basic.startRun();
  basic.pressKey(" ");
  basic.step(100);
  basic.pressKey(" ");
  assert.equal(basic.debug.getState().jumpsUsed, 1);

  const upgraded = makeGame();
  upgraded.startRun();
  upgraded.debug.collectDrop("js-buffer");
  upgraded.pressKey(" ");
  upgraded.step(100);
  upgraded.pressKey(" ");
  assert.equal(upgraded.debug.getState().jumpsUsed, 2);
  assert.ok(upgraded.debug.getState().jumpVelocity < basic.debug.getState().jumpVelocity);
});

test("a fetched response clears an obstacle, while cached frames absorb and recharge", () => {
  const game = makeGame();
  game.startRun();
  game.debug.collectDrop("web2-feed");
  game.debug.addResponse(0);
  game.debug.addObstacle("divStack", 10);
  game.step();
  assert.equal(game.debug.getState().clearedObstacles, 1);
  assert.equal(game.debug.getState().responseCharges, 0);

  game.debug.collectDrop("cloud-cache");
  game.debug.forceCollision();
  assert.equal(game.debug.getState().collisions, 0);
  assert.equal(game.debug.getState().cacheCharge, 0);
  game.step();
  assert.ok(game.el("cache-value").textContent.startsWith("RECHARGE"));
  game.debug.forceCollision();
  assert.equal(game.debug.getState().collisions, 1);
  game.debug.setDistance(900);
  game.step();
  assert.equal(game.debug.getState().cacheCharge, 1);
  assert.equal(game.el("cache-value").textContent, "SHIELD READY");
});

test("the AI forecast shows the next dodge and exposes a hallucinated call", () => {
  const game = makeGame();
  game.startRun();
  game.debug.collectDrop("ai-predict");
  game.debug.addObstacle("tagBlock", 10);
  game.step();
  assert.equal(game.el("prediction-value").textContent, "DUCK");
  game.debug.collectDrop("ai-glitch");
  game.step();
  assert.equal(game.el("prediction-value").textContent, "JUMP?");
});

test("responsive pickup lets S snap an airborne runner back to the ground", () => {
  const game = makeGame();
  game.startRun();
  game.debug.collectDrop("responsive-reflow");
  game.pressKey(" ");
  game.step(100);
  assert.ok(game.debug.getState().jumpY > 0);
  game.pressKey("s");
  assert.ok(game.debug.getState().jumpVelocity >= 1020);
  game.step(100);
  assert.equal(game.debug.getState().jumpY, 0);
});

test("background time counts without granting obstacle-free distance", () => {
  const game = makeGame();
  game.startRun();
  const before = game.debug.getState().distance;
  game.advance(30000);
  game.emitVisibility(true);
  game.emitVisibility(false);
  game.step(16);
  assert.ok(game.debug.getState().elapsed >= 30);
  assert.ok(game.debug.getState().distance - before < 2);
  game.advance(571000);
  game.step(16);
  assert.equal(game.debug.getState().phase, "ended");
  assert.equal(game.el("result-title").textContent, "DNF");
});

