const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { scoreRun, compareEntries } = require("../scoring.js");

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../content.js"), "utf8"), sandbox);
const { eras, obstacles, chips, drops } = sandbox.window.EVOLVE_CONTENT;

test("fast and near-timeout finishes use only the specified speed bonus", () => {
  assert.deepEqual(
    { ...scoreRun(10000, 300) },
    { finished: true, distance: 10000, elapsedTime: 300, distanceScore: 10000, speedBonus: 5000, finalScore: 15000 }
  );
  const late = scoreRun(10000, 599);
  assert.equal(late.finished, true);
  assert.equal(late.speedBonus, 16);
  assert.equal(late.finalScore, 10016);
  assert.equal(scoreRun(10000, 600).finalScore, 10000);
});

test("a DNF near the finish caps at 9,999 and has no speed bonus", () => {
  assert.equal(scoreRun(9999.9, 600).finalScore, 9999);
  assert.equal(scoreRun(9999.9, 600).speedBonus, 0);
  assert.equal(scoreRun(10000, 600.001).finalScore, 9999);
});

test("leaderboard puts every finisher ahead of DNF and breaks ties by time", () => {
  const entries = [
    { ...scoreRun(9999, 600), name: "DNF" },
    { ...scoreRun(10000, 599), name: "SLOW" },
    { ...scoreRun(10000, 300), name: "FAST" },
    { ...scoreRun(9980, 600), name: "DNF2" }
  ];
  entries.sort(compareEntries);
  assert.deepEqual(entries.map(x => x.name), ["FAST", "SLOW", "DNF", "DNF2"]);
  const tie = [
    { finished: true, finalScore: 12000, elapsedTime: 500 },
    { finished: true, finalScore: 12000, elapsedTime: 499 }
  ];
  tie.sort(compareEntries);
  assert.equal(tie[0].elapsedTime, 499);
});

test("course gates, teaching copy, hazards, and skill path are complete", () => {
  assert.deepEqual(Array.from(eras, x => x.at), [0, 0, 1300, 3100, 4900, 6700, 8300]);
  assert.deepEqual(Array.from(chips, x => x.label), [
    "HTML", "CSS", "JavaScript", "APIs", "Responsive Design", "Modern Web"
  ]);
  for (const era of eras) {
    assert.ok(era.message.length > 15);
    assert.ok(era.obstacleTypes.length >= 3);
    for (const key of era.obstacleTypes) {
      const obstacle = obstacles[key];
      assert.ok(obstacle);
      assert.ok(["jump", "duck"].includes(obstacle.kind));
      assert.ok(obstacle.width > 0 && obstacle.height > 0);
    }
  }
  for (const era of eras.slice(1)) {
    const pool = Array.from(drops, drop => drop).filter(drop => drop.era === era.key);
    assert.ok(["bug", "build", "speed"].every(kind => pool.some(drop => drop.kind === kind)));
    for (const drop of pool) {
      assert.ok(drop.id && drop.syntax && drop.lesson && drop.effect && drop.label && drop.gameplay);
      if (drop.kind !== "build") assert.ok(drop.duration > 0);
      if (drop.kind === "bug" || drop.kind === "buff") assert.ok(drop.status);
    }
  }
  assert.equal(new Set(drops.map(drop => drop.id)).size, drops.length);
  const prologue = fs.readFileSync(path.join(__dirname, "../html-prologue.html"), "utf8");
  assert.match(prologue, /<details>/);
  assert.match(prologue, /name="page-color"/);
  assert.match(prologue, /id="working-link"/);
  assert.match(prologue, /id="broken-link"/);
  assert.doesNotMatch(prologue, /<script|<link rel="stylesheet"|<style/i);
});
