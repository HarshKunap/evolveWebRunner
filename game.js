(function () {
  "use strict";

  const content = window.EVOLVE_CONTENT;
  const scoring = window.EVOLVE_SCORING;
  if (!content || !scoring) throw new Error("EVOLVE content or scoring data is missing.");
  if (content.eras.length !== 7 || content.chips.length !== 6 || !Array.isArray(content.drops) ||
      content.eras.some((era, i) => era.at !== [0, 0, 1300, 3100, 4900, 6700, 8300][i] ||
        era.obstacleTypes.some(type => !content.obstacles[type]))) {
    throw new Error("EVOLVE course data is invalid.");
  }

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const ui = {
    frame: $("game-frame"), skills: $("skill-path"), pace: $("pace-value"),
    prologue: $("html-prologue"), htmlPage: $("html-page"), prologueTimer: $("prologue-timer"),
    prologueStatus: $("prologue-status"), pageWorld: $("page-world"),
    worldTheme: document.querySelector(".world-theme"),
    worldInteraction: document.querySelector(".world-interaction"),
    worldFeed: document.querySelector(".world-feed"), feedValue: $("feed-value"),
    worldReflow: document.querySelector(".world-reflow"),
    worldCache: document.querySelector(".world-cache"), cacheValue: $("cache-value"),
    worldPredict: document.querySelector(".world-predict"), prediction: $("prediction-value"),
    buildItems: $("build-items"), pickupToast: $("pickup-toast"), effectStatus: $("effect-status"),
    dropRecap: $("drop-recap"),
    start: $("start-screen"), end: $("end-screen"), startButton: $("start-button"),
    replayButton: $("replay-button"), playerName: $("player-name"), sound: $("sound-toggle"),
    distance: $("distance-value"), time: $("time-value"), era: $("era-value"), score: $("score-value"),
    progressFill: $("progress-fill"), progressText: $("progress-text"),
    gate: $("gate-banner"), gateKicker: $("gate-kicker"), gateTitle: $("gate-title"),
    gateMessage: $("gate-message"), gateChip: $("gate-chip"), crash: $("crash-banner"),
    status: $("status-message"), resultTitle: $("result-title"), resultDescription: $("result-description"),
    resultDistance: $("result-distance"), resultTime: $("result-time"), resultTimeLabel: $("result-time-label"),
    resultBonus: $("result-bonus"), resultScore: $("result-score"), chips: $("chips-recap"),
    leaderboard: $("leaderboard-list")
  };
  const W = canvas.width, H = canvas.height, GROUND = 486, PLAYER_X = 178, SCALE = 12;
  const PLAYER_W = 34, STAND_H = 44, DUCK_H = 26;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const STORAGE_KEY = "evolve-web-runner-leaderboard-v1";
  let state = null;
  let audioContext = null;
  let soundOn = false;
  let frameId = 0;
  let lastFrame = 0;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixColor(a, b, t) {
    const x = hexRgb(a), y = hexRgb(b);
    return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",") + ")";
  }
  function rgba(hex, alpha) {
    return "rgba(" + hexRgb(hex).join(",") + "," + alpha + ")";
  }
  function eraIndexAt(distance) {
    for (let i = content.eras.length - 1; i >= 0; i--) {
      if (distance >= content.eras[i].at) return i;
    }
    return 0;
  }
  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  }
  function baseSpeed(distance) {
    return 36 + 42 * clamp(distance / scoring.MAX_DISTANCE, 0, 1);
  }
  function speedAt(distance, now) {
    const base = baseSpeed(distance);
    const boosted = state && now < state.boostUntil;
    const bug = state && now < state.bugUntil ? state.activeBug : null;
    const drag = bug === "latency" ? 0.78 : (bug === "clutter" || bug === "glitch") ? 0.9 : 1;
    return base * (boosted ? 1.3 : 1) * drag;
  }
  function renderSkillPath() {
    ui.skills.innerHTML = "";
    content.chips.forEach((chip, index) => {
      const item = document.createElement("span");
      const earned = index < (state?.earnedChips || 0);
      const current = earned && index === Math.min(state.eraIndex, content.chips.length - 1);
      item.className = "skill-chip " + (earned ? "earned" : "locked") +
        (current ? " current" : "") +
        (index === 5 && state?.eraIndex === 6 ? " evolved" : "");
      const number = document.createElement("span");
      number.className = "skill-index";
      number.textContent = String(index + 1);
      const label = document.createElement("span");
      label.className = "skill-label";
      label.textContent = chip.label;
      item.append(number, label);
      item.style.setProperty("--chip-color", chip.color);
      ui.skills.append(item);
    });
  }
  function random() {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }
  function beep(frequency, duration, shape = "sine", volume = 0.045) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Sound is optional. */ }
  }

  function showGate(index, now) {
    const era = content.eras[index];
    const chip = index < 6 ? content.chips[index] : content.chips[5];
    ui.gateKicker.textContent = index === 0 ? "STARTING POINT" : "NEW ERA UNLOCKED";
    ui.gateTitle.textContent = era.title;
    ui.gateMessage.textContent = era.message;
    ui.gateChip.textContent = index === 6 ? "MODERN WEB ✦ EVOLVED" : "SKILL CHIP + " + chip.label.toUpperCase();
    ui.gate.style.setProperty("--gate-accent", era.accent);
    ui.frame.dataset.era = era.key;
    updateBuildVisuals();
    renderSkillPath();
    ui.gate.hidden = false;
    state.gateUntil = now + 1700;
    state.gateFlashUntil = reducedMotion.matches ? 0 : now + 260;
    ui.status.textContent = era.title + ". " + era.message +
      (index === 6 ? " Modern Web skill evolved." : " Skill chip: " + chip.label);
    if (index > 0) beep(420 + index * 55, 0.16, "triangle", 0.035);
  }

  function awardGates(now) {
    const target = eraIndexAt(state.distance);
    if (target <= state.eraIndex) return;
    for (let i = state.eraIndex + 1; i <= target; i++) {
      state.previousEra = state.eraIndex;
      state.eraIndex = i;
      state.transitionAt = now;
      state.earnedChips = Math.min(6, i + 1);
      showGate(i, now);
    }
  }

  function makeDropOpportunities() {
    const opportunities = [];
    for (let i = 1; i < content.eras.length; i++) {
      const start = content.eras[i].at;
      const end = content.eras[i + 1]?.at ?? scoring.MAX_DISTANCE;
      const pool = content.drops.filter(drop => drop.era === content.eras[i].key);
      const core = pool.filter(drop => drop.slot == null);
      pool.forEach(drop => {
        const fraction = drop.slot ?? (core.indexOf(drop) + 1) / (core.length + 1);
        opportunities.push({ ...drop, at: start + (end - start) * fraction,
          collected: false, missed: false });
      });
    }
    return opportunities;
  }

  function updateBuildVisuals() {
    const build = state?.build || new Set();
    ui.frame.dataset.build = [...build].join(" ");
    ui.frame.dataset.theme = state?.colorChoice || "blue";
    ui.worldTheme.hidden = !build.has("theme");
    ui.worldInteraction.hidden = !build.has("doubleJump");
    ui.worldFeed.hidden = !build.has("feed");
    ui.worldReflow.hidden = !build.has("reflow");
    ui.worldCache.hidden = !build.has("cache");
    ui.worldPredict.hidden = !build.has("predict");
    ui.buildItems.innerHTML = "";
    const acquired = state?.drops.filter(drop => drop.collected && drop.kind === "build") || [];
    if (!acquired.length) {
      const empty = document.createElement("span");
      empty.className = "build-item empty";
      empty.textContent = "NO TOOLS YET";
      ui.buildItems.append(empty);
    } else {
      acquired.forEach(drop => {
        const item = document.createElement("span");
        item.className = "build-item";
        item.textContent = "✓ " + drop.label;
        item.title = drop.syntax + " — " + drop.lesson;
        ui.buildItems.append(item);
      });
    }
  }

  function updateWorldHints() {
    const next = nearestObstacle(state?.distance ?? 0);
    const hazard = next && content.obstacles[next.type];
    if (state.build.has("feed")) ui.feedValue.textContent =
      (state.responseCharges ? "200 ×" + state.responseCharges : "200 INBOUND") +
      (hazard ? " · NEXT " + hazard.label : "");
    if (state.build.has("cache")) ui.cacheValue.textContent = state.cacheCharge
      ? "SHIELD READY" : "RECHARGE " + Math.ceil(Math.max(0, state.nextCacheRecharge - state.distance)) + " M";
    if (state.build.has("predict") && hazard) {
      const predicted = hazard.kind === "jump" ? "JUMP" : "DUCK";
      ui.prediction.textContent = state.activeBug === "glitch"
        ? (predicted === "JUMP" ? "DUCK?" : "JUMP?") : predicted;
    }
  }

  function nearestObstacle(afterDistance) {
    return state?.obstacles.reduce((nearest, obstacle) =>
      !obstacle.hit && !obstacle.cleared && obstacle.at > afterDistance &&
      (!nearest || obstacle.at < nearest.at) ? obstacle : nearest, null);
  }

  function responseBox(response) {
    return { x: PLAYER_X + (response.at - state.distance) * SCALE,
      y: response.high ? GROUND - 96 : GROUND - 51, w: 36, h: 30 };
  }

  function spawnResponses() {
    if (!state.build.has("feed")) return;
    while (state.nextResponseAt < state.distance + 105 && state.nextResponseAt < scoring.MAX_DISTANCE - 30) {
      const at = state.nextResponseAt;
      const nearHazard = state.obstacles.some(obstacle => Math.abs(obstacle.at - at) < 22);
      if (!nearHazard) state.responses.push({ at, high: state.responseCount++ % 2 === 1, caught: false });
      state.nextResponseAt += 310;
    }
    state.responses = state.responses.filter(response => response.at > state.distance - 12);
  }

  function checkResponses(now) {
    const player = playerBox();
    for (const response of state.responses) {
      if (response.caught || !intersects(player, responseBox(response))) continue;
      response.caught = true;
      state.responseCharges = Math.min(2, state.responseCharges + 1);
      state.responseBurstUntil = now + 420;
      ui.status.textContent = "HTTP 200 received. One incoming obstacle will be cleared.";
      beep(820, 0.09, "triangle", 0.025);
    }
    if (state.responseCharges > 0) {
      const target = nearestObstacle(state.distance + 1);
      if (target && target.at < state.distance + 19) {
        target.cleared = true;
        state.responseCharges--;
        state.responseBurstUntil = now + 360;
        state.responseTarget = target.at;
        ui.status.textContent = "Live response cleared " + content.obstacles[target.type].label + ".";
        beep(1010, 0.08, "sawtooth", 0.02);
      }
    }
  }

  function dropBox(drop) {
    return { x: PLAYER_X + (drop.at - state.distance) * SCALE,
      y: drop.kind === "speed" ? GROUND - 48 : GROUND - 92, w: 54, h: 34 };
  }

  function collectDrop(drop, now) {
    drop.collected = true;
    if (drop.kind === "build") {
      state.build.add(drop.effect);
      state.buildFlashUntil = now + 1700;
      if (drop.effect === "feed") state.nextResponseAt = state.distance + 165;
      if (drop.effect === "cache") {
        state.cacheCharge = 1;
        state.nextCacheRecharge = state.distance + 850;
      }
    }
    if (drop.kind === "speed") state.boostUntil = now + (drop.duration || 5000);
    if (drop.kind === "buff" && drop.effect === "compress") {
      state.compressUntil = now + (drop.duration || 6000);
      state.compressBurstUntil = now + 650;
    }
    if (drop.kind === "bug") {
      state.activeBug = drop.effect;
      state.activeBugDrop = drop.id;
      state.bugUntil = now + (drop.duration || 4000);
      state.bugsCaught.push(drop.id);
    }
    ui.pickupToast.innerHTML = "";
    const heading = document.createElement("strong");
    heading.textContent = drop.kind === "build" ? "BUILD · PERMANENT" :
      drop.kind === "bug" ? "NERF · TEMPORARY" : "BUFF · TEMPORARY";
    const detail = document.createElement("span");
    detail.textContent = drop.gameplay || drop.label;
    const syntax = document.createElement("code");
    syntax.textContent = drop.syntax;
    ui.pickupToast.append(heading, detail, syntax);
    ui.pickupToast.dataset.kind = drop.kind;
    ui.pickupToast.hidden = false;
    state.toastUntil = now + (drop.kind === "build" ? 3300 : 2800);
    ui.status.textContent = heading.textContent + ". " + detail.textContent + ". " + drop.syntax;
    updateBuildVisuals();
    beep(drop.kind === "bug" ? 190 : drop.kind === "speed" || drop.kind === "buff" ? 700 : 510,
      0.1, drop.kind === "bug" ? "sawtooth" : "triangle", 0.03);
  }

  function checkDropCollisions(now) {
    const player = playerBox();
    for (const drop of state.drops) {
      if (drop.collected || drop.missed) continue;
      if (drop.at < state.distance - 7) {
        drop.missed = true;
        continue;
      }
      if (intersects(player, dropBox(drop))) collectDrop(drop, now);
    }
  }

  function updateEffectStatus(now) {
    ui.effectStatus.innerHTML = "";
    const active = [];
    if (now < state.boostUntil) {
      const chip = document.createElement("span");
      chip.dataset.kind = "speed";
      chip.textContent = "↑ BUFF · SPEED +30% · " + Math.ceil((state.boostUntil - now) / 1000) + "s";
      ui.effectStatus.append(chip);
      active.push("speed");
    }
    if (now < state.compressUntil) {
      const chip = document.createElement("span");
      chip.dataset.kind = "buff";
      chip.textContent = "↑ BUFF · GZIP BLOCKS −45% · " + Math.ceil((state.compressUntil - now) / 1000) + "s";
      ui.effectStatus.append(chip);
      active.push("compress");
    }
    if (now < state.bugUntil) {
      const chip = document.createElement("span");
      chip.dataset.kind = "bug";
      const bug = content.drops.find(drop => drop.id === state.activeBugDrop);
      chip.textContent = "↓ NERF · " + (bug?.status || state.activeBug.toUpperCase()) + " · " +
        Math.ceil((state.bugUntil - now) / 1000) + "s";
      ui.effectStatus.append(chip);
      active.push("nerf");
    }
    ui.effectStatus.hidden = ui.effectStatus.children.length === 0;
    ui.frame.dataset.effects = active.join(" ");
    if (now >= state.toastUntil) ui.pickupToast.hidden = true;
  }

  function spawnObstacles() {
    while (state.nextSpawn < state.distance + 105 && state.nextSpawn < scoring.MAX_DISTANCE - 9) {
      let at = state.nextSpawn;
      const eraIndex = eraIndexAt(at);
      const era = content.eras[eraIndex];
      const type = era.obstacleTypes[Math.floor(random() * era.obstacleTypes.length)];
      const kind = content.obstacles[type].kind;
      const boostedSection = state.drops.some(drop => drop.kind === "speed" && at >= drop.at &&
        at < drop.at + 5 * baseSpeed(drop.at) * 1.3);
      if (state.lastSpawn) {
        const minSeconds = state.lastSpawn.kind === "jump" && kind === "jump" ? 0.9
          : state.lastSpawn.kind !== kind ? 0.85 : 0.72;
        at = Math.max(at, state.lastSpawn.at + baseSpeed(at) * minSeconds *
          (boostedSection ? 1.3 : 1));
      }
      const nearGate = content.eras.some(gate => gate.at > 0 && Math.abs(gate.at - at) < 50);
      const nearDrop = state.drops.some(drop => Math.abs(drop.at - at) <
        baseSpeed(drop.at) * (drop.kind === "speed" ? 1.15 : 0.8));
      if (!nearGate && !nearDrop) {
        state.obstacles.push({ at, type, hit: false, id: state.obstacleCount++ });
        state.lastSpawn = { at, kind };
      }
      const progress = at / scoring.MAX_DISTANCE;
      const secondsBetween = 1.03 - 0.24 * progress + random() * 0.17;
      const boostCorridor = state.drops.some(drop => drop.kind === "speed" && at >= drop.at &&
        at < drop.at + 5 * baseSpeed(drop.at) * 1.3);
      state.nextSpawn = Math.max(state.nextSpawn + 1,
        at + baseSpeed(at) * secondsBetween * (boostCorridor ? 1.1 : 1));
    }
    state.obstacles = state.obstacles.filter(o => o.at > state.distance - 22);
  }

  function playerBox() {
    const ducking = state.duck && state.jumpY === 0 && performance.now() >= state.stunUntil;
    const scale = (state.build.has("reflow") ? 0.78 : 1) *
      (state.activeBug === "bloat" ? 1.17 : 1);
    const height = (ducking ? DUCK_H : STAND_H) * scale;
    const width = PLAYER_W * scale;
    return { x: PLAYER_X + (PLAYER_W - width) / 2,
      y: GROUND - height - state.jumpY, w: width, h: height };
  }
  function obstacleBox(obstacle) {
    const data = content.obstacles[obstacle.type];
    const x = PLAYER_X + (obstacle.at - state.distance) * SCALE;
    // Duck hazards hang down to 32px above ground: ducking clears them, jumping cannot.
    const height = data.kind === "duck" ? Math.max(data.height, 84) : data.height;
    const y = data.kind === "jump" ? GROUND - height : GROUND - 32 - height;
    const width = data.width * (state.build.has("theme") ? 0.82 : 1) *
      (performance.now() < state.compressUntil ? 0.55 : 1);
    return { x, y, w: width, h: height };
  }
  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
      a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function collide(now, obstacle) {
    obstacle.hit = true;
    if (state.cacheCharge > 0) {
      state.cacheCharge = 0;
      state.nextCacheRecharge = state.distance + 850;
      state.invulnerableUntil = now + 900;
      state.cacheBurstUntil = now + 550;
      ui.status.textContent = "Cached frame restored. Hit absorbed.";
      beep(590, 0.18, "triangle", 0.04);
      return;
    }
    state.collisions++;
    state.crashStreak = state.distance - state.lastCollisionDistance < 300
      ? Math.min(4, state.crashStreak + 1) : 0;
    state.lastCollisionDistance = state.distance;
    state.stunUntil = now + 1200 + state.crashStreak * 900;
    state.invulnerableUntil = now + 1250;
    state.jumpVelocity = 0;
    state.jumpY = 0;
    state.jumpsUsed = 0;
    ui.crash.hidden = false;
    ui.crash.textContent = "ERROR 404: MOMENTUM LOST" +
      (state.crashStreak ? " · CHAIN ×" + (state.crashStreak + 1) : "");
    ui.status.textContent = "ERROR 404: MOMENTUM LOST. Crash chain " + (state.crashStreak + 1) + ".";
    beep(140, 0.22, "sawtooth", 0.04);
  }
  function checkCollisions(now) {
    if (now < state.invulnerableUntil) return;
    const player = playerBox();
    for (const obstacle of state.obstacles) {
      if (!obstacle.hit && !obstacle.cleared && intersects(player, obstacleBox(obstacle))) {
        collide(now, obstacle);
        break;
      }
    }
  }

  function update(now, dt) {
    state.elapsed = Math.max(0, (now - state.startedAt) / 1000);
    if (state.elapsed > scoring.MAX_TIME) {
      state.elapsed = scoring.MAX_TIME;
      endRun(false);
      return;
    }
    if (state.activeBug && now >= state.bugUntil) {
      state.activeBug = null;
      state.activeBugDrop = null;
      state.bugUntil = 0;
    }
    ui.frame.dataset.bug = state.activeBug || "";
    const speed = speedAt(state.distance, now);
    const stunFactor = now < state.stunUntil ? 0.08 : 1;
    state.speed = speed * stunFactor;
    state.distance = Math.min(scoring.MAX_DISTANCE, state.distance + speed * stunFactor * dt);
    if (state.jumpY > 0 || state.jumpVelocity < 0) {
      state.jumpY = Math.max(0, state.jumpY - state.jumpVelocity * dt);
      state.jumpVelocity += 2200 * dt;
      if (state.jumpY === 0) {
        state.jumpVelocity = 0;
        state.jumpsUsed = 0;
      }
    }
    if (state.build.has("cache") && state.cacheCharge === 0 && state.distance >= state.nextCacheRecharge) {
      state.cacheCharge = 1;
      state.nextCacheRecharge = state.distance + 850;
      state.cacheBurstUntil = now + 550;
    }
    awardGates(now);
    spawnObstacles();
    spawnResponses();
    checkDropCollisions(now);
    checkResponses(now);
    checkCollisions(now);
    updateWorldHints();
    updateEffectStatus(now);
    if (now >= state.stunUntil) ui.crash.hidden = true;
    if (now >= state.gateUntil) ui.gate.hidden = true;
    if (state.distance >= scoring.MAX_DISTANCE) {
      endRun(true);
      return;
    }
    if (state.elapsed >= scoring.MAX_TIME) {
      endRun(false);
      return;
    }
    updateHud();
  }

  function updateHud() {
    const distance = Math.min(Math.floor(state.distance), 10000);
    ui.distance.innerHTML = distance.toLocaleString() + ' <small>/ 10,000 M</small>';
    ui.time.textContent = formatClock(Math.ceil(scoring.MAX_TIME - state.elapsed));
    ui.era.textContent = content.eras[state.eraIndex].key.toUpperCase();
    ui.pace.textContent = "PACE " + state.speed.toFixed(1) + " M/S";
    ui.score.textContent = Math.min(distance, 9999).toLocaleString();
    const percent = state.distance / scoring.MAX_DISTANCE * 100;
    ui.progressFill.style.width = percent.toFixed(2) + "%";
    ui.progressText.textContent = Math.floor(percent) + "% OF THE WEB EXPLORED";
  }

  function updatePrologue(now) {
    const elapsed = (now - state.prologueStartedAt) / 1000;
    ui.prologueTimer.textContent = String(Math.max(0, Math.ceil(10 - elapsed)));
    if (elapsed >= 10 || (elapsed >= 4 && state.prologueAdvanceRequested)) {
      startScoredRun(now);
    }
  }

  function roundRect(x, y, w, h, radius, fill, stroke, lineWidth = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function draw(now) {
    const current = content.eras[state ? state.eraIndex : 0];
    const previous = content.eras[state ? state.previousEra : 0];
    const bareHtml = current.key === "html";
    const transition = state && !reducedMotion.matches ? clamp((now - state.transitionAt) / 850, 0, 1) : 1;
    const top = mixColor(previous.key === "html" ? "#ffffff" : previous.bgTop,
      bareHtml ? "#ffffff" : current.bgTop, transition);
    const bottom = mixColor(previous.key === "html" ? "#ffffff" : previous.bgBottom,
      bareHtml ? "#ffffff" : current.bgBottom, transition);
    const accent = bareHtml ? "#0000ee" : state?.build.has("theme")
      ? (state.colorChoice === "orange" ? "#ef6a2c" : "#3488ff") : current.accent;
    const groundColor = bareHtml ? "#f4f4f4" : current.ground;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    if (bareHtml) {
      ctx.fillStyle = "#111111";
      ctx.font = "bold 28px Times New Roman, serif";
      ctx.fillText("My first page", 42, 88);
      ctx.font = "16px Times New Roman, serif";
      ctx.fillText("A place for ideas.", 42, 120);
      ctx.strokeStyle = "#777777";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(42, 144); ctx.lineTo(360, 144); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillText("Read more", 42, 173);
      ctx.beginPath(); ctx.moveTo(42, 176); ctx.lineTo(113, 176); ctx.strokeStyle = accent; ctx.stroke();
    } else {
      // Layout, colour, and motion become part of the world after the CSS gate.
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(accent, current.key === "ai" || current.key === "js" ? 0.13 : 0.1);
      const shift = state ? (state.distance * SCALE * 0.16) % 80 : 0;
      for (let x = -80 + shift; x < W + 80; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND); ctx.stroke();
      }
      for (let y = 80; y < GROUND; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.fillStyle = rgba(accent, 0.08);
      ctx.font = "800 180px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(current.key.toUpperCase(), W + 15, 280);
      ctx.textAlign = "left";
    }

    // Distance markers and a quiet finish line.
    if (state) {
      ctx.font = "600 12px ui-monospace, monospace";
      for (let mark = Math.ceil((state.distance - 15) / 100) * 100; mark < state.distance + 100; mark += 100) {
        if (mark < 0 || mark > 10000) continue;
        const x = PLAYER_X + (mark - state.distance) * SCALE;
        if (x < 0 || x > W) continue;
        ctx.fillStyle = rgba(accent, 0.7);
        ctx.fillRect(x, GROUND + 8, 2, 10);
        ctx.fillText(mark.toLocaleString() + " M", x + 8, GROUND + 19);
      }
      const finishX = PLAYER_X + (10000 - state.distance) * SCALE;
      if (finishX > -20 && finishX < W + 20) {
        ctx.fillStyle = accent;
        ctx.fillRect(finishX, 110, 5, GROUND - 110);
        ctx.font = "800 20px ui-monospace, monospace";
        ctx.fillText("DEPLOY", finishX + 14, 138);
      }
    }

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = bareHtml ? "#111111" : accent;
    ctx.fillRect(0, GROUND, W, bareHtml ? 2 : 4);
    if (!bareHtml) {
      ctx.fillStyle = rgba(accent, 0.18);
      for (let x = 0; x < W; x += 44) ctx.fillRect(x, GROUND + 35, 23, 2);
    }

    if (!state || state.phase !== "running") return;
    if (state.build.has("theme")) {
      const offset = (state.distance * SCALE) % 72;
      ctx.strokeStyle = rgba(accent, 0.34);
      ctx.lineWidth = 2;
      for (let x = -72 - offset; x < W + 72; x += 72) {
        ctx.beginPath(); ctx.moveTo(x, GROUND - 121); ctx.lineTo(x, GROUND + 36); ctx.stroke();
      }
      ctx.fillStyle = rgba(accent, 0.08);
      ctx.fillRect(0, GROUND - 121, W, 121);
    }
    for (const obstacle of state.obstacles) {
      const data = content.obstacles[obstacle.type];
      const box = obstacleBox(obstacle);
      if (box.x < -90 || box.x > W + 30) continue;
      ctx.globalAlpha = obstacle.cleared ? 0.1 : obstacle.hit ? 0.28 : 1;
      const compressed = now < state.compressUntil;
      roundRect(box.x, box.y, box.w, box.h, bareHtml ? 0 : 5,
        compressed ? mixColor(data.color, "#63d8ff", 0.55) :
          state.build.has("theme") ? mixColor(data.color, accent, 0.35) : data.color,
        compressed ? "#b8ecff" : state.build.has("theme") ? "#ffffff" : rgba("#ffffff", 0.55),
        state.build.has("theme") ? 2 : 1);
      ctx.fillStyle = data.kind === "duck" ? "#101525" : "#ffffff";
      ctx.font = "700 " + (state.build.has("reflow") ? 13 : 11) + "px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.beginPath(); ctx.rect(box.x + 2, box.y, box.w - 4, box.h); ctx.clip();
      ctx.fillText(data.label, box.x + box.w / 2, box.y + box.h / 2);
      ctx.restore();
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = 1;
    }

    for (const response of state.responses) {
      if (response.caught) continue;
      const box = responseBox(response);
      if (box.x < -50 || box.x > W + 30) continue;
      ctx.shadowColor = "#25a4ff";
      ctx.shadowBlur = reducedMotion.matches ? 0 : 18;
      roundRect(box.x, box.y, box.w, box.h, 6, "#126bb8", "#b8ecff", 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("200", box.x + box.w / 2, box.y + 20);
      ctx.textAlign = "left";
    }

    for (const drop of state.drops) {
      if (drop.collected || drop.missed) continue;
      const box = dropBox(drop);
      if (box.x < -65 || box.x > W + 20) continue;
      const color = drop.kind === "speed" || drop.kind === "buff" ? "#f2d14c"
        : drop.kind === "bug" ? "#b69bea" : "#54e3c1";
      ctx.save();
      ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-18, -18, 36, 36);
      ctx.strokeStyle = drop.kind === "bug" ? "#6c5e8c" : "#ffffff";
      ctx.lineWidth = drop.kind === "bug" ? 3 : 2;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.restore();
      const legend = drop.kind === "build" ? "BUILD" : drop.kind === "bug" ? "?" : "BUFF";
      roundRect(box.x - 6, box.y - 23, 66, 17, 3, "#101525", color, 1);
      ctx.fillStyle = color;
      ctx.font = "900 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(legend, box.x + box.w / 2, box.y - 10);
      ctx.fillStyle = "#101525";
      ctx.font = "900 19px ui-monospace, monospace";
      ctx.fillText(drop.kind === "build" ? "+" : drop.kind === "bug" ? "?" : "↑",
        box.x + box.w / 2, box.y + 24);
      ctx.textAlign = "left";
    }

    if (state.activeBug === "clip") {
      ctx.fillStyle = "rgba(11, 15, 31, 0.85)";
      ctx.fillRect(W - 200, 0, 200, GROUND + 12);
      ctx.fillStyle = "#d7c5ff";
      ctx.font = "700 12px ui-monospace, monospace";
      ctx.fillText("OVERFLOW CLIPPED", W - 185, 36);
    }
    if (state.activeBug === "clutter") {
      ctx.fillStyle = "rgba(24, 15, 46, 0.88)";
      roundRect(W - 355, 155, 270, 68, 5, "#372950", "#b69bea");
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 16px ui-monospace, monospace";
      ctx.fillText("● NOTIFICATION STORM", W - 337, 194);
    }
    if (state.activeBug === "glitch") {
      roundRect(W - 360, 155, 275, 68, 5, "#443051", "#d0a9ed");
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 15px ui-monospace, monospace";
      ctx.fillText(state.activeBugDrop === "ai-glitch" ? "PREDICTION: CLEAR?" : "ALERT: PAGE BLOCKED?", W - 342, 194);
    }
    if (state.activeBug === "bloat") {
      ctx.fillStyle = "#f7c4d2";
      ctx.font = "900 15px ui-monospace, monospace";
      ctx.fillText("HITBOX +17%", PLAYER_X - 30, GROUND - 128 - state.jumpY);
    }

    if (state.build.has("predict")) {
      const next = nearestObstacle(state.distance);
      if (next) {
        const data = content.obstacles[next.type];
        const ghostX = PLAYER_X + 372;
        const ghostLead = next.at - state.distance - 372 / SCALE;
        const wrong = state.activeBug === "glitch";
        const advisedJump = wrong ? data.kind !== "jump" : data.kind === "jump";
        const ghostY = advisedJump && ghostLead < baseSpeed(state.distance) * 0.7 && ghostLead > -5
          ? 52 * Math.sin(Math.PI * clamp(1 - ghostLead / (baseSpeed(state.distance) * 0.7), 0, 1)) : 0;
        const ghostH = advisedJump ? 44 : 24;
        ctx.setLineDash([5, 4]);
        roundRect(ghostX, GROUND - ghostH - ghostY, 31, ghostH, 6,
          rgba("#ff5cf0", 0.16), "#ff5cf0", 2);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffb8f8";
        ctx.font = "800 12px ui-monospace, monospace";
        ctx.fillText(advisedJump ? "JUMP" : "DUCK", ghostX - 4, GROUND - 61 - ghostY);
      }
    }

    const box = playerBox();
    const stunned = now < state.stunUntil;
    if (!stunned || reducedMotion.matches || Math.floor(now / 100) % 2 === 0) {
      ctx.fillStyle = rgba(accent, 0.2);
      ctx.beginPath(); ctx.ellipse(PLAYER_X + PLAYER_W / 2, GROUND + 7, 29, 6, 0, 0, Math.PI * 2); ctx.fill();
      if (now < state.boostUntil) {
        ctx.fillStyle = rgba("#f2d14c", 0.65);
        for (let i = 1; i <= 4; i++) ctx.fillRect(box.x - 15 * i, box.y + 6 + i * 6, 10 + i * 5, 3);
      }
      roundRect(box.x, box.y, box.w, box.h, 7, stunned ? "#f45b66" : "#f8fafc",
        bareHtml ? "#111111" : groundColor, 3);
      roundRect(box.x + 6, box.y + 7, box.w - 12, 12, 3, "#142033", null);
      ctx.fillStyle = accent;
      ctx.fillRect(box.x + 10, box.y + 12, 5, 3);
      ctx.fillRect(box.x + 20, box.y + 12, 5, 3);
      if (!state.duck && state.jumpY === 0) {
        const stride = Math.sin(now / 90) * 3;
        ctx.fillStyle = "#142033";
        ctx.fillRect(box.x + 5, GROUND - 2, 9, 5 + stride);
        ctx.fillRect(box.x + 20, GROUND - 2, 9, 5 - stride);
      }
      if (state.build.has("doubleJump") && state.jumpY > 0 && state.jumpsUsed < 2) {
        ctx.strokeStyle = "#f7df1e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(box.x + box.w / 2, box.y + box.h / 2, 31, 0, Math.PI * 2); ctx.stroke();
      }
      if (state.responseCharges > 0) {
        ctx.fillStyle = "#25a4ff";
        ctx.font = "900 14px ui-monospace, monospace";
        ctx.fillText("200 ×" + state.responseCharges, box.x - 7, box.y - 17);
      }
      if (state.cacheCharge > 0) {
        ctx.strokeStyle = "#54e3c1"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2 + 10,
          box.h / 2 + 10, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (state.activeBug === "bloat") {
        ctx.strokeStyle = "#f45b66"; ctx.lineWidth = 3;
        ctx.strokeRect(box.x - 3, box.y - 3, box.w + 6, box.h + 6);
      }
    }
    if (state.build.has("reflow")) {
      ctx.fillStyle = "rgba(8, 5, 16, 0.92)";
      ctx.fillRect(0, 0, 72, H);
      ctx.fillRect(1016, 0, W - 1016, H);
      ctx.strokeStyle = "#c9a6e6"; ctx.lineWidth = 4;
      ctx.strokeRect(72, 5, 944, H - 10);
      ctx.fillStyle = "#f2e6fb"; ctx.font = "800 14px ui-monospace, monospace";
      ctx.fillText("@media · PHONE VIEW", 1026, 86);
      ctx.fillText("S ↓ AIR SNAP", 1026, 112);
    }
    if (now < state.responseBurstUntil) {
      ctx.fillStyle = rgba("#25a4ff", 0.22 * (state.responseBurstUntil - now) / 420);
      ctx.fillRect(0, GROUND - 130, W, 140);
      const targetX = PLAYER_X + (state.responseTarget - state.distance) * SCALE;
      if (targetX > PLAYER_X && targetX < W) {
        ctx.strokeStyle = "#b8ecff"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(PLAYER_X + 18, GROUND - 38);
        ctx.lineTo(targetX, GROUND - 62); ctx.stroke();
      }
    }
    if (now < state.doubleJumpBurstUntil) {
      ctx.strokeStyle = rgba("#f7df1e", (state.doubleJumpBurstUntil - now) / 260);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(PLAYER_X + PLAYER_W / 2, GROUND - state.jumpY - 25, 48, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (now < state.reflowBurstUntil) {
      ctx.fillStyle = rgba("#c9a6e6", 0.26 * (state.reflowBurstUntil - now) / 320);
      ctx.fillRect(72, GROUND - 110, 944, 110);
    }
    if (now < state.compressBurstUntil) {
      ctx.fillStyle = rgba("#63d8ff", 0.19 * (state.compressBurstUntil - now) / 650);
      ctx.fillRect(0, GROUND - 125, W, 130);
      ctx.fillStyle = "#b8ecff";
      ctx.font = "900 23px ui-monospace, monospace";
      ctx.fillText("GZIP · BLOCKS −45%", 400, GROUND - 155);
    }
    if (now < state.cacheBurstUntil) {
      ctx.fillStyle = rgba("#54e3c1", 0.2 * (state.cacheBurstUntil - now) / 550);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#b6f0dc"; ctx.font = "900 22px ui-monospace, monospace";
      ctx.fillText("CACHED FRAME", 425, 190);
    }
    if (now < state.buildFlashUntil) {
      ctx.fillStyle = rgba(accent, 0.12 * (state.buildFlashUntil - now) / 1700);
      ctx.fillRect(0, 0, W, H);
    }
    if (now < state.gateFlashUntil) {
      ctx.fillStyle = rgba(accent, 0.14 * (state.gateFlashUntil - now) / 260);
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    if (!state || state.phase === "ended") return;
    const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
    lastFrame = now;
    if (state.phase === "prologue") updatePrologue(now);
    else update(now, dt);
    draw(now);
    if (state.phase !== "ended") frameId = requestAnimationFrame(loop);
  }

  function bindPrologueFrame() {
    const doc = ui.htmlPage.contentDocument;
    if (!doc) return;
    doc.addEventListener("change", event => {
      if (state?.phase === "prologue" && event.target.name === "page-color") {
        state.colorChoice = event.target.value === "orange" ? "orange" : "blue";
        ui.prologueStatus.textContent = "Saved " + state.colorChoice + ". Catch a CSS style drop to use it.";
      }
    });
    doc.addEventListener("click", event => {
      if (state?.phase !== "prologue") return;
      const link = event.target.closest?.("a");
      if (!link) return;
      if (link.id === "broken-link") {
        event.preventDefault();
        ui.prologueStatus.textContent = "404: target missing. The href points nowhere in this document.";
      } else if (link.id === "working-link") {
        state.prologueAdvanceRequested = true;
        ui.prologueStatus.textContent = "Link followed. CSS is loading into your page…";
      }
    });
    doc.addEventListener("toggle", event => {
      if (state?.phase === "prologue" && event.target.tagName === "DETAILS" && event.target.open) {
        ui.prologueStatus.textContent = "The details element opens with HTML alone — no JavaScript needed.";
      }
    }, true);
  }

  function startScoredRun(now) {
    if (!state || state.phase !== "prologue") return;
    state.phase = "running";
    state.startedAt = now;
    state.elapsed = 0;
    state.eraIndex = 1;
    state.previousEra = 0;
    state.transitionAt = now;
    state.earnedChips = 2;
    state.speed = baseSpeed(0);
    ui.prologue.hidden = true;
    showGate(1, now);
    spawnObstacles();
    updateHud();
    canvas.focus({ preventScroll: true });
  }

  function beginRun() {
    cancelAnimationFrame(frameId);
    const now = performance.now();
    state = {
      phase: "prologue", name: (ui.playerName.value.trim() || "WEB DEV").slice(0, 16),
      startedAt: 0, prologueStartedAt: now, prologueAdvanceRequested: false,
      colorChoice: "blue", elapsed: 0, distance: 0, eraIndex: 0, previousEra: 0,
      transitionAt: now, gateUntil: 0, gateFlashUntil: 0, earnedChips: 1,
      seed: 324923, nextSpawn: 46, lastSpawn: null, obstacleCount: 0, obstacles: [],
      drops: [], build: new Set(), bugsCaught: [], boostUntil: 0, compressUntil: 0,
      compressBurstUntil: 0, bugUntil: 0, activeBug: null,
      activeBugDrop: null,
      toastUntil: 0, buildFlashUntil: 0, speed: baseSpeed(0),
      jumpY: 0, jumpVelocity: 0, jumpsUsed: 0, duck: false, stunUntil: 0,
      invulnerableUntil: 0, collisions: 0, responses: [], responseCount: 0,
      crashStreak: 0, lastCollisionDistance: -Infinity,
      nextResponseAt: Infinity, responseCharges: 0, responseBurstUntil: 0,
      responseTarget: 0, cacheCharge: 0, cacheBurstUntil: 0, nextCacheRecharge: Infinity,
      reflowBurstUntil: 0, doubleJumpBurstUntil: 0
    };
    state.drops = makeDropOpportunities();
    ui.start.hidden = true;
    ui.end.hidden = true;
    ui.crash.hidden = true;
    ui.gate.hidden = true;
    ui.prologue.hidden = false;
    ui.pickupToast.hidden = true;
    ui.effectStatus.hidden = true;
    ui.prologueTimer.textContent = "10";
    ui.prologueStatus.textContent = "Choose a color, open the details, or follow a link. CSS arrives soon.";
    ui.frame.dataset.era = "html";
    ui.frame.dataset.bug = "";
    ui.frame.dataset.effects = "";
    ui.htmlPage.src = "html-prologue.html?run=" + Math.floor(now);
    renderSkillPath();
    updateBuildVisuals();
    updateHud();
    lastFrame = now;
    draw(now);
    frameId = requestAnimationFrame(loop);
  }

  function readLeaderboard() {
    try {
      const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(entries) ? entries.filter(x => x && typeof x.finalScore === "number") : [];
    } catch (_) { return []; }
  }
  function saveLeaderboard(entry) {
    const list = readLeaderboard();
    list.push(entry);
    list.sort(scoring.compareEntries);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20))); } catch (_) { /* Local storage is optional. */ }
    return list.slice(0, 8);
  }
  function renderLeaderboard(list) {
    ui.leaderboard.innerHTML = "";
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "YOUR RUN SETS THE PACE";
      ui.leaderboard.append(li);
      return;
    }
    list.forEach((entry, index) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");
      const name = document.createElement("strong");
      const score = document.createElement("b");
      rank.textContent = String(index + 1).padStart(2, "0");
      name.textContent = entry.name || "WEB DEV";
      score.textContent = entry.finalScore.toLocaleString() + (entry.finished ? " ✓" : " DNF");
      li.append(rank, name, score);
      ui.leaderboard.append(li);
    });
  }
  function endRun(won) {
    if (!state || state.phase !== "running") return;
    state.phase = "ended";
    cancelAnimationFrame(frameId);
    ui.gate.hidden = true;
    ui.crash.hidden = true;
    ui.prologue.hidden = true;
    ui.pickupToast.hidden = true;
    ui.effectStatus.hidden = true;
    const result = scoring.scoreRun(won ? 10000 : state.distance, state.elapsed);
    ui.distance.innerHTML = Math.floor(result.distance).toLocaleString() +
      ' <small>/ 10,000 M</small>';
    ui.score.textContent = result.distanceScore.toLocaleString();
    ui.resultTitle.textContent = result.finished ? "DEPLOYED ✓" : "DNF";
    ui.resultDescription.innerHTML = result.finished
      ? "You travelled through the evolution of the web.<br>The next evolution is what you build."
      : "Time ran out on this run.<br>The next evolution is what you build.";
    ui.resultDistance.textContent = Math.floor(result.distance).toLocaleString() + " m";
    ui.resultTimeLabel.textContent = result.finished ? "FINISH TIME" : "RUN TIME";
    ui.resultTime.textContent = formatClock(result.elapsedTime);
    ui.resultBonus.textContent = "+" + result.speedBonus.toLocaleString();
    ui.resultScore.textContent = result.finalScore.toLocaleString();
    ui.chips.innerHTML = "";
    content.chips.forEach((chip, i) => {
      const item = document.createElement("span");
      item.className = "chip" + (i < state.earnedChips ? " earned" : "");
      item.textContent = chip.label;
      if (i < state.earnedChips) item.style.setProperty("--chip-color", chip.color);
      ui.chips.append(item);
    });
    ui.dropRecap.innerHTML = "";
    for (const drop of state.drops.filter(item => item.kind === "build")) {
      const item = document.createElement("div");
      item.className = "recap-drop";
      item.dataset.kind = "build";
      item.dataset.status = drop.collected ? "collected" : "missed";
      const status = document.createElement("strong");
      status.textContent = drop.collected ? "BUILT" : "MISSED";
      const syntax = document.createElement("code");
      syntax.textContent = drop.syntax;
      const lesson = document.createElement("p");
      lesson.textContent = drop.lesson;
      item.append(status, syntax, lesson);
      ui.dropRecap.append(item);
    }
    for (const drop of state.drops.filter(item => item.kind === "buff" && item.collected)) {
      const item = document.createElement("div");
      item.className = "recap-drop";
      item.dataset.kind = "buff";
      const status = document.createElement("strong");
      status.textContent = "BUFF USED";
      const syntax = document.createElement("code");
      syntax.textContent = drop.syntax;
      const lesson = document.createElement("p");
      lesson.textContent = drop.lesson;
      item.append(status, syntax, lesson);
      ui.dropRecap.append(item);
    }
    for (const id of state.bugsCaught) {
      const drop = content.drops.find(item => item.id === id);
      if (!drop) continue;
      const item = document.createElement("div");
      item.className = "recap-drop";
      item.dataset.kind = "bug";
      const status = document.createElement("strong");
      status.textContent = "BUG";
      const syntax = document.createElement("code");
      syntax.textContent = drop.syntax;
      const lesson = document.createElement("p");
      lesson.textContent = drop.lesson;
      item.append(status, syntax, lesson);
      ui.dropRecap.append(item);
    }
    const entry = { ...result, name: state.name, createdAt: Date.now() };
    renderLeaderboard(saveLeaderboard(entry));
    ui.end.hidden = false;
    ui.replayButton.focus();
    ui.status.textContent = result.finished
      ? "Deployed. Final score " + result.finalScore + "."
      : "Did not finish. Final score " + result.finalScore + ".";
    if (result.finished) { beep(620, 0.18, "triangle"); setTimeout(() => beep(830, 0.26, "triangle"), 120); }
    draw(performance.now());
  }

  function jump() {
    if (!state || state.phase !== "running" || performance.now() < state.stunUntil) return;
    if (state.jumpY > 0 || state.jumpVelocity !== 0) {
      if (state.build.has("doubleJump") && state.jumpsUsed < 2) {
        state.duck = false;
        state.jumpsUsed = 2;
        state.jumpVelocity = -660;
        state.doubleJumpBurstUntil = performance.now() + 260;
        beep(650, 0.1, "square", 0.026);
      }
      return;
    }
    state.duck = false;
    state.jumpVelocity = -660;
    state.jumpsUsed = 1;
    beep(380, 0.08, "square", 0.022);
  }
  function keyDown(event) {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "w", "s"].includes(key) && state?.phase === "running") event.preventDefault();
    if (key === " " || key === "w" || key === "arrowup") {
      if (!event.repeat) jump();
    } else if (key === "s" || key === "arrowdown") {
      if (state?.phase === "running") {
        state.duck = true;
        if (state.build.has("reflow") && state.jumpY > 0) {
          state.jumpVelocity = Math.max(state.jumpVelocity, 1020);
          state.reflowBurstUntil = performance.now() + 320;
          beep(240, 0.07, "triangle", 0.02);
        }
      }
    } else if (key === "enter" && (!state || state.phase === "ended")) {
      beginRun();
    }
  }
  function keyUp(event) {
    const key = event.key.toLowerCase();
    if ((key === "s" || key === "arrowdown") && state) state.duck = false;
  }
  ui.startButton.addEventListener("click", beginRun);
  ui.replayButton.addEventListener("click", beginRun);
  ui.htmlPage.addEventListener("load", bindPrologueFrame);
  ui.sound.addEventListener("click", () => {
    soundOn = !soundOn;
    ui.sound.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    ui.sound.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    ui.sound.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) beep(660, 0.08);
  });
  canvas.addEventListener("pointerdown", jump);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", () => { if (state) state.duck = false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state) state.duck = false;
    if ((state?.phase === "running" || state?.phase === "prologue") && !document.hidden) {
      const now = performance.now();
      if (state.phase === "running" && (now - state.startedAt) / 1000 >= scoring.MAX_TIME) {
        state.elapsed = scoring.MAX_TIME;
        endRun(false);
      } else {
        cancelAnimationFrame(frameId);
        lastFrame = now;
        frameId = requestAnimationFrame(loop);
      }
    }
  });
  renderSkillPath();
  updateBuildVisuals();
  draw(performance.now());

  // Opt-in controls for deterministic browser testing; absent from normal play.
  if (new URLSearchParams(location.search).has("test")) {
    window.EVOLVE_DEBUG = {
      getState: () => state && ({ phase: state.phase, distance: state.distance, elapsed: state.elapsed,
        eraIndex: state.eraIndex, earnedChips: state.earnedChips, collisions: state.collisions,
        speed: state.speed, build: [...state.build], colorChoice: state.colorChoice,
        activeBug: state.activeBug, boostUntil: state.boostUntil,
        compressUntil: state.compressUntil,
        jumpY: state.jumpY, jumpVelocity: state.jumpVelocity, jumpsUsed: state.jumpsUsed,
        responseCharges: state.responseCharges, responseCount: state.responseCount,
        cacheCharge: state.cacheCharge, clearedObstacles: state.obstacles.filter(o => o.cleared).length,
        collectedDrops: state.drops.filter(drop => drop.collected).map(drop => drop.id) }),
      completePrologue: () => { if (state?.phase === "prologue") startScoredRun(performance.now()); },
      setColor: color => { if (state?.phase === "prologue") state.colorChoice = color === "orange" ? "orange" : "blue"; },
      setDistance: distance => { if (state?.phase === "running") {
        state.distance = clamp(distance, 0, scoring.MAX_DISTANCE - 0.01);
        awardGates(performance.now()); spawnObstacles(); updateHud();
      } },
      setElapsed: seconds => { if (state?.phase === "running") {
        state.startedAt = performance.now() - clamp(seconds, 0, scoring.MAX_TIME) * 1000;
        state.elapsed = seconds; updateHud();
      } },
      collectDrop: id => { if (state?.phase === "running") {
        const drop = state.drops.find(item => item.id === id);
        if (drop && !drop.collected && !drop.missed) collectDrop(drop, performance.now());
      } },
      missDrop: id => { if (state?.phase === "running") {
        const drop = state.drops.find(item => item.id === id);
        if (drop && !drop.collected) drop.missed = true;
      } },
      forceCollision: () => { if (state?.phase === "running") collide(performance.now(), { hit: false }); },
      addObstacle: (type, at) => { if (state?.phase === "running" && content.obstacles[type]) {
        state.obstacles.push({ at: at ?? state.distance, type, hit: false, id: state.obstacleCount++ });
      } },
      addResponse: (at, high = false) => { if (state?.phase === "running") {
        state.responses.push({ at: at ?? state.distance, high, caught: false });
      } },
      finish: () => { if (state?.phase === "running") {
        state.distance = 10000; state.elapsed = (performance.now() - state.startedAt) / 1000; endRun(true);
      } },
      timeout: () => { if (state?.phase === "running") { state.elapsed = scoring.MAX_TIME; endRun(false); } },
      clearLeaderboard: () => localStorage.removeItem(STORAGE_KEY)
    };
  }
})();
