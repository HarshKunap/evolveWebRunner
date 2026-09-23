// EVOLVE — Web Build Lab: UI controller.
(function () {
  "use strict";

  const C = window.EVOLVE_LAB_CONTENT;
  const Core = window.EVOLVE_LAB_CORE;
  const RUNTIME_SRC = window.EVOLVE_RUNTIME_SRC;
  const { STAGES, FILES, SLOTS, ASSETS } = C;
  const BOARD_KEY = "evolve-lab-leaderboard-v2";   // v2: scores out of 100
  const IDLE_NUDGE_MS = 25000;

  const $ = (id) => document.getElementById(id);
  const el = {
    stepper: $("stepper"), clock: $("clock"), score: $("score"), mission: $("mission"),
    buildMode: $("build-mode"), shipMode: $("ship-mode"), tiles: $("tiles"), tabs: $("tabs"), code: $("code"),
    hint: $("hint-btn"), feedback: $("feedback"), ship: $("ship-btn"),
    shipKicker: $("ship-kicker"), shipTitle: $("ship-title"), shipAfter: $("ship-after"), shipLessons: $("ship-lessons"), shipTry: $("ship-try"),
    levelBox: $("level-box"), levelTitle: $("level-title"), levelNumbers: $("level-numbers"), levelFill: $("level-fill"), levelStats: $("level-stats"), duckKey: $("duck-key"),
    next: $("next-btn"), preview: $("preview"), holder: $("frame-holder"), viewport: $("viewport"), flash: $("reload-flash"),
    url: $("url"), urlText: $("url-text"), lock: $("lock"), devices: $("devices"),
    console: $("dt-console"), network: $("dt-network"), netCount: $("net-count"),
    intro: $("intro"), introPath: $("intro-path"), name: $("player-name"), start: $("start-btn"),
    results: $("results"), resUrl: $("res-url"), resStats: $("res-stats"), resStack: $("res-stack"), board: $("leaderboard"),
    again: $("again-btn"), view: $("view-btn"), toast: $("toast")
  };

  let state = null;
  let mode = "intro";            // intro | build | shipped | play | cleared | done
  let activeFile = "index.html";
  let device = "desktop";
  let clockTimer = 0, idleTimer = 0, previewTimer = 0, toastTimer = 0;
  let netCount = 0;
  let levelProgress = null;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmt(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function elapsed() { if (!state || !state.started) return 0; return ((state.finished || performance.now()) - state.started) / 1000; }
  function slug(name) { return (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "web-dev"); }
  function stage() { return STAGES[state.stage]; }

  const HL = {
    html: /(<!--[\s\S]*?-->)|("[^"]*")|(<\/?[a-zA-Z!][\w-]*|\/?>)|([\w-]+(?==))/g,
    css: /(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|(#[0-9a-fA-F]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|rem|fr|vw|%|s|ms)?\b)|(--?[a-zA-Z][\w-]*(?=\s*:)|@[\w-]+)/g,
    js: /(\/\/.*$)|('[^']*'|"[^"]*"|`[^`]*`)|(\b(?:const|let|var|function|async|await|return|if|for|of|new|document)\b)|(\b[a-zA-Z_]\w*(?=\())/gm,
    sh: /(^\$)|("[^"]*")|(\b(?:git|npm)\b)|(\s-{1,2}[\w-]+)/g
  };
  function highlight(text, lang) {
    const re = HL[lang] || HL.js;
    let out = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      out += esc(text.slice(last, m.index));
      const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-k" : "tk-f";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  function toast(text, kind) {
    el.toast.textContent = text;
    el.toast.className = "toast " + (kind || "");
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600);
  }

  function feedback(html, kind) {
    el.feedback.innerHTML = html;
    el.feedback.className = "feedback " + (kind || "");
  }

  // ---------- devtools ----------
  function consoleLog(text, level) {
    const li = document.createElement("li");
    li.className = "dt-" + (level || "log");
    const icon = level === "error" ? "✖" : level === "warn" ? "▲" : level === "ok" ? "✓" : "›";
    li.innerHTML = '<span class="dt-icon">' + icon + "</span>" + esc(text);
    el.console.appendChild(li);
    while (el.console.children.length > 80) el.console.firstChild.remove();
    el.console.scrollTop = el.console.scrollHeight;
  }
  function networkLog(method, url, status, ms) {
    const li = document.createElement("li");
    li.innerHTML = '<span class="net-m">' + esc(method) + '</span><span class="net-u">' + esc(url) + '</span><span class="net-s">' + status +
      ' OK</span><span class="net-t">' + ms + ' ms</span><span class="net-n">mock server</span>';
    el.network.appendChild(li);
    netCount += 1;
    el.netCount.textContent = netCount;
    el.netCount.classList.add("bump");
    setTimeout(() => el.netCount.classList.remove("bump"), 400);
  }
  document.querySelectorAll(".dt-tab").forEach((btn) => btn.addEventListener("click", () => {
    document.querySelectorAll(".dt-tab").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    el.console.hidden = btn.dataset.tab !== "console";
    el.network.hidden = btn.dataset.tab !== "network";
  }));

  // ---------- stepper + mission ----------
  function renderStepper() {
    el.stepper.innerHTML = STAGES.map((s, i) => {
      const status = !state ? "locked" : i < state.stage || (i === state.stage && mode === "done") ? "done" : i === state.stage ? "current" : "locked";
      return '<li class="step ' + status + '" style="--tech:' + s.color + '"><span class="step-n">' + (status === "done" ? "✓" : s.n) +
        '</span><span class="step-t">' + esc(s.tech) + "</span></li>";
    }).join("");
  }

  function renderMission() {
    const s = stage();
    el.mission.style.setProperty("--tech", s.color);
    el.mission.innerHTML = '<div class="mission-top"><span class="tech-badge">LAYER ' + s.n + " / 6 · " + esc(s.tech) + '</span><span class="mission-title">' +
      esc(s.title) + '</span></div><h2>' + esc(s.mission) + '</h2><p>' + esc(s.brief) + "</p>";
  }

  // ---------- toolbox ----------
  function tilePreview(t) {
    if (t.asset) return '<img class="tile-img" src="' + ASSETS[t.asset] + '" alt="">';
    if (t.swatch) return '<span class="tile-swatch" style="background:' + t.swatch + '"></span>';
    if (t.font) return '<span class="tile-font" style="font-family:' + t.font + '">Aa</span>';
    return "";
  }
  function shuffled(tiles, seed) {
    const list = tiles.slice();
    let x = seed * 9301 + 49297;
    for (let i = list.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  function renderTiles() {
    const s = stage();
    const usedIds = new Set(Object.values(state.fills));
    const groupLang = {};
    Object.keys(SLOTS).forEach((id) => { groupLang[SLOTS[id].group] = FILES[SLOTS[id].file].lang; });
    const lang = (t) => groupLang[t.group] || (/^</.test(t.code) ? "html" : /\(/.test(t.code) ? "js" : "css");
    el.tiles.innerHTML = shuffled(s.tiles, s.n).map((t) => {
      const used = usedIds.has(t.id);
      const lockedGroup = !t.choice && used;
      return '<button type="button" class="tile' + (used ? " used" : "") + (t.choice ? " choice" : "") + '" draggable="true" data-tile="' + t.id + '"' +
        (lockedGroup ? ' aria-disabled="true"' : "") + ">" + tilePreview(t) +
        '<code>' + highlight(t.code.replace("{NAME}", state.name), lang(t)) + "</code>" +
        (t.choice ? '<span class="tile-choice">' + esc(t.choice) + "</span>" : "") + "</button>";
    }).join("");
  }

  // ---------- editor ----------
  function currentFiles() { return Core.visibleFiles(state.stage + 1); }
  function stageFiles() {
    const slots = Core.stageSlots(state.stage);
    return Object.keys(FILES).filter((f) => slots.some((id) => SLOTS[id].file === f));
  }

  function renderTabs() {
    const own = stageFiles();
    const empties = Core.stageSlots(state.stage).filter((id) => !state.fills[id]);
    el.tabs.innerHTML = currentFiles().map((f) => {
      const isNew = FILES[f].from === state.stage + 1;
      const todo = mode === "build" ? empties.filter((id) => SLOTS[id].file === f).length : 0;
      return '<button type="button" role="tab" class="tab' + (f === activeFile ? " active" : "") + (own.includes(f) ? " own" : "") + '" data-file="' + f +
        '" aria-selected="' + (f === activeFile) + '">' + esc(f) + (isNew ? ' <i class="new-dot" title="new file"></i>' : "") +
        (todo ? ' <b class="todo" title="empty lines to fill">' + todo + "</b>" : "") + "</button>";
    }).join("");
  }

  function renderCode() {
    const file = activeFile;
    const lang = FILES[file].lang;
    const lines = Core.fileLines(state, file, state.stage + 1, false);
    const current = state.stage + 1;
    let html = "", n = 0, fold = 0;
    const flushFold = () => { if (fold) { html += '<div class="line fold"><span class="ln"></span><span class="lc">⋯ ' + fold + " line" + (fold > 1 ? "s" : "") + " from earlier layers</span></div>"; fold = 0; } };
    const editable = mode === "build";
    const next = Core.currentSlot(state);
    lines.forEach((l) => {
      n += 1;
      const old = l.s < current;
      if (old && l.kind === "given") { fold += 1; return; }
      flushFold();
      if (l.kind === "given") {
        html += '<div class="line' + (old ? " old" : "") + '"><span class="ln">' + n + '</span><span class="lc">' + highlight(l.text, lang) + "</span></div>";
      } else if (l.tile) {
        const mine = l.s === current;
        html += '<div class="line filled' + (mine ? " mine" : " old") + '" data-slot="' + l.slot + '"><span class="ln">' + n + '</span><span class="lc">' +
          esc(l.indent) + highlight(l.text.slice(l.indent.length), lang) + "</span>" +
          (mine && editable ? '<button type="button" class="unfill" data-slot="' + l.slot + '" aria-label="Remove block">×</button>' : "") + "</div>";
      } else {
        const isNext = l.slot === next;
        html += '<div class="line slot-line' + (isNext ? " current" : " locked") + '" data-slot="' + l.slot + '"><span class="ln">' + n + '</span><span class="lc">' + esc(l.indent) +
          '<span class="slot" data-slot="' + l.slot + '">' + (isNext ? "▶ drop " + esc(SLOTS[l.slot].hint) + " here" : esc(SLOTS[l.slot].hint) + " · later") + "</span></span></div>";
      }
    });
    flushFold();
    el.code.innerHTML = html;
    el.code.dataset.lang = lang;
  }

  function focusSlot(slot) {
    if (!slot) return;
    if (SLOTS[slot].file !== activeFile) { activeFile = SLOTS[slot].file; renderTabs(); renderCode(); }
    scrollToSlot(slot);
  }

  function scrollToSlot(slot) {
    const node = el.code.querySelector('[data-slot="' + slot + '"]');
    if (node) node.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function renderBuild() {
    renderStepper(); renderMission(); renderTiles(); renderTabs(); renderCode();
    const done = Core.isStageComplete(state, state.stage);
    const slots = Core.stageSlots(state.stage);
    const filled = slots.filter((id) => state.fills[id]).length;
    el.ship.disabled = !done;
    el.ship.innerHTML = esc(stage().ship) + ' <small>' + filled + "/" + slots.length + "</small>";
    el.ship.classList.toggle("ready", done);
  }

  // ---------- preview ----------
  function refreshPreview(opts) {
    opts = opts || {};
    clearTimeout(previewTimer);
    const board = readBoard();
    const doc = Core.buildDocument(state, { play: !!opts.play, runtimeSrc: RUNTIME_SRC, board });
    el.preview.srcdoc = doc;
    if (opts.flash && !reduceMotion) { el.flash.classList.remove("go"); void el.flash.offsetWidth; el.flash.classList.add("go"); }
  }
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(() => refreshPreview(), 90); }

  function setDevice(d) {
    device = d;
    el.viewport.classList.toggle("phone", d === "phone");
    el.devices.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.device === d)));
  }
  el.devices.addEventListener("click", (e) => { const b = e.target.closest("[data-device]"); if (b) setDevice(b.dataset.device); });

  function setUrl() {
    if (state.shipped >= 5) {
      el.url.classList.add("secure");
      el.lock.textContent = "🔒";
      el.urlText.textContent = "https://" + slug(state.name) + ".evolve.dev";
    } else {
      el.url.classList.remove("secure");
      el.lock.textContent = "ⓘ";
      el.urlText.textContent = "localhost:3000/index.html";
    }
  }

  // ---------- placing blocks ----------
  function markIdle() {
    clearTimeout(idleTimer);
    document.querySelectorAll(".nudge").forEach((n) => n.classList.remove("nudge"));
    if (mode !== "build") return;
    idleTimer = setTimeout(() => showHint(false), IDLE_NUDGE_MS);
  }

  function tryPlace(tileId, slotId) {
    if (mode !== "build") return;
    const tile = Core.tileById(tileId);
    const res = Core.place(state, tileId, slotId);
    const btn = el.tiles.querySelector('[data-tile="' + tileId + '"]');
    markIdle();
    if (!res.ok) {
      if (res.reason === "no-slot") { feedback("That block is already in your code.", "info"); return; }
      if (res.reason === "order") {
        feedback("<b>One line at a time.</b> " + esc(res.why), "info");
        focusSlot(res.slot);
        return;
      }
      state.mistakes += 1;
      state.stagePoints[state.stage].mistakes += 1;
      feedback("<b>✗ −" + Core.POINTS.mistake + " points.</b> " + esc(res.why || "It doesn't belong here."), "bad");
      toast("✗ −" + Core.POINTS.mistake + " points: wrong block for this line", "bad");
      consoleLog("Rejected: " + tile.code.replace("{NAME}", state.name) + " (−" + Core.POINTS.mistake + ")", "warn");
      if (btn && !reduceMotion) { btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake"); }
      el.score.classList.remove("penalty"); void el.score.offsetWidth; el.score.classList.add("penalty");
      updateScore();
      focusSlot(res.slot);
      return;
    }
    if (!res.same && !res.replaced) state.stagePoints[state.stage].slots += 1;
    feedback("<b>✓ " + (res.replaced ? "Swapped. " : "Added. ") + "</b>" + esc(tile.lesson), "good");
    const upNext = Core.currentSlot(state);
    activeFile = SLOTS[upNext || res.slot].file;
    renderBuild();
    scrollToSlot(upNext || res.slot);
    const line = el.code.querySelector('.line[data-slot="' + res.slot + '"]');
    if (line && !reduceMotion) line.classList.add("pop");
    schedulePreview();
    updateScore();
    if (Core.isStageComplete(state, state.stage)) {
      feedback("<b>✓ All blocks in place.</b> Save to upgrade your page.", "good");
      el.ship.focus({ preventScroll: true });
    }
  }

  function showHint(paid) {
    if (mode !== "build") return;
    const h = Core.nextHint(state);
    if (!h) return;
    if (paid) {
      state.hints += 1;
      state.stagePoints[state.stage].hints += 1;
      updateScore();
      feedback("<b>Hint:</b> this line needs " + esc(SLOTS[h.slot].hint) + ". The glowing block fits.", "info");
    }
    activeFile = SLOTS[h.slot].file;
    renderTabs(); renderCode();
    const tile = el.tiles.querySelector('[data-tile="' + h.tile + '"]');
    const slot = el.code.querySelector('.slot[data-slot="' + h.slot + '"]');
    if (tile) tile.classList.add("nudge");
    if (slot) { slot.classList.add("nudge"); scrollToSlot(h.slot); }
  }

  el.tiles.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tile]");
    if (!b || b.getAttribute("aria-disabled") === "true") return;
    tryPlace(b.dataset.tile);
  });
  el.tiles.addEventListener("dragstart", (e) => {
    const b = e.target.closest("[data-tile]");
    if (!b) return;
    e.dataTransfer.setData("text/plain", b.dataset.tile);
    e.dataTransfer.effectAllowed = "copy";
    document.body.classList.add("dragging");
  });
  document.addEventListener("dragend", () => document.body.classList.remove("dragging"));
  el.code.addEventListener("dragover", (e) => { const s = e.target.closest(".slot-line, .filled.mine"); if (s) { e.preventDefault(); s.classList.add("over"); } });
  el.code.addEventListener("dragleave", (e) => { const s = e.target.closest(".slot-line, .filled.mine"); if (s) s.classList.remove("over"); });
  el.code.addEventListener("drop", (e) => {
    const s = e.target.closest(".slot-line, .filled.mine");
    if (!s) return;
    e.preventDefault();
    document.body.classList.remove("dragging");
    tryPlace(e.dataTransfer.getData("text/plain"), s.dataset.slot);
  });
  el.code.addEventListener("click", (e) => {
    const x = e.target.closest(".unfill");
    if (x && mode === "build") {
      Core.removeFill(state, x.dataset.slot);
      feedback("Block removed. Pick another.", "info");
      renderBuild(); schedulePreview(); markIdle();
      return;
    }
    const slot = e.target.closest(".slot");
    if (slot && mode === "build") {
      const next = Core.currentSlot(state);
      feedback(slot.dataset.slot === next ? "Pick a block above that gives this line " + esc(SLOTS[next].hint) + "." : "Lines go in order. Fill the ▶ highlighted line first.", "info");
    }
  });
  el.tabs.addEventListener("click", (e) => {
    const t = e.target.closest("[data-file]");
    if (!t) return;
    activeFile = t.dataset.file;
    renderTabs(); renderCode();
  });
  el.hint.addEventListener("click", () => showHint(true));

  // ---------- ship ----------
  function lessonsFor(i) {
    return Core.stageSlots(i).map((id) => Core.tileById(state.fills[id])).filter(Boolean);
  }

  el.ship.addEventListener("click", () => {
    if (!Core.isStageComplete(state, state.stage) || mode !== "build") return;
    const s = stage();
    const files = stageFiles();
    clearTimeout(idleTimer);
    consoleLog(files.join(" + ") + ": " + Core.stageSlots(state.stage).length + "/" + Core.stageSlots(state.stage).length + " checks passed", "ok");
    if (s.key === "ai") return deploy();
    shipStage();
  });

  function deploy() {
    mode = "shipping";
    el.ship.disabled = true;
    const steps = [
      ["$ npm run deploy", "log"], ["Building 7 files…", "log"], ["Uploading to host…", "log"],
      ["✓ Live at https://" + slug(state.name) + ".evolve.dev (HTTPS)", "ok"]
    ];
    steps.forEach((st, i) => setTimeout(() => consoleLog(st[0], st[1]), i * (reduceMotion ? 50 : 420)));
    setTimeout(() => shipStage(), steps.length * (reduceMotion ? 50 : 420));
  }

  function shipStage() {
    const s = stage();
    state.shipped = state.stage;
    mode = s.play ? "play" : "shipped";
    setUrl();
    if (s.phoneFirst) setDevice("phone");
    refreshPreview({ play: !!s.play, flash: true });
    el.buildMode.hidden = true;
    el.shipMode.hidden = false;
    el.mission.hidden = true;
    el.shipMode.scrollTop = 0;
    el.shipKicker.textContent = "LAYER " + s.n + " · " + s.tech.toUpperCase() + " SHIPPED";
    el.shipTitle.textContent = s.key === "ai" ? "Your site is live" : stageFiles().join(" + ") + " saved";
    el.shipAfter.textContent = s.after;
    el.shipTry.textContent = s.tryIt;
    el.shipLessons.innerHTML = lessonsFor(state.stage).map((t) =>
      '<li><code>' + esc(t.code.replace("{NAME}", state.name)) + "</code><span>" + esc(t.lesson) + "</span></li>").join("");
    el.levelBox.hidden = !s.play;
    if (s.play) {
      levelProgress = { distance: 0, goal: s.play.goal, coins: 0, crashes: 0 };
      el.levelTitle.textContent = "LEVEL " + s.play.level + (s.key === "ai" ? " · FINAL" : "");
      el.duckKey.hidden = state.shipped < 3;
      renderLevel();
      el.next.disabled = true;
      el.next.textContent = "Reach the goal to continue";
    } else {
      el.next.disabled = false;
      el.next.textContent = "Next layer: " + STAGES[state.stage + 1].tech + " →";
    }
    renderStepper();
    updateScore();
    setTimeout(() => { try { el.preview.focus(); el.preview.contentWindow.focus(); } catch (e) { /* ignore */ } }, 250);
  }

  function renderLevel() {
    if (!levelProgress) return;
    const p = levelProgress;
    el.levelNumbers.textContent = Math.floor(Math.min(p.distance, p.goal)) + " / " + p.goal + " m";
    el.levelFill.style.width = Math.min(100, (p.distance / p.goal) * 100) + "%";
    el.levelStats.textContent = p.coins + " coin" + (p.coins === 1 ? "" : "s") + " · " + p.crashes + " crash" + (p.crashes === 1 ? "" : "es");
  }

  function levelComplete(data) {
    if (mode !== "play") return;
    const s = stage();
    const run = { level: data.level, distance: data.distance, coins: data.coins, crashes: data.crashes };
    state.runs.push(run);
    mode = "cleared";
    levelProgress.distance = levelProgress.goal;
    renderLevel();
    toast("Level " + data.level + " cleared ✓", "good");
    el.next.disabled = false;
    el.next.textContent = s.key === "ai" ? "See your results →" : "Build the next layer: " + STAGES[state.stage + 1].tech + " →";
    updateScore();
    renderStepper();
  }

  el.next.addEventListener("click", () => {
    if (mode === "done") { el.results.hidden = false; return; }
    if (mode !== "shipped" && mode !== "cleared") return;
    if (state.stage === STAGES.length - 1) return finish();
    state.stage += 1;
    beginStage();
  });

  function beginStage() {
    mode = "build";
    const s = stage();
    el.buildMode.hidden = false;
    el.shipMode.hidden = true;
    el.mission.hidden = false;
    el.tiles.scrollTop = 0;
    levelProgress = null;
    activeFile = stageFiles()[0];
    if (state.stage >= 4) el.devices.hidden = false;
    if (s.phoneFirst) {
      setDevice("phone");
      consoleLog("Layout overflow: page is 390px wide but columns don't fit", "warn");
    }
    feedback("Fill the <b>▶ highlighted line</b> first, top to bottom. A wrong block costs " + Core.POINTS.mistake + " points." + (s.tiles.some((t) => t.choice) ? " Named blocks are choices: pick the one you like." : ""), "info");
    renderBuild();
    refreshPreview();
    updateScore();
    markIdle();
    el.code.scrollTop = 0;
    const first = Core.stageSlots(state.stage)[0];
    if (first) setTimeout(() => scrollToSlot(first), 60);
  }

  // ---------- messages from the page ----------
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || !d.__lab || e.source !== el.preview.contentWindow) return;
    if (d.type === "console") consoleLog(d.text, d.level);
    else if (d.type === "network") networkLog(d.method, d.url, d.status, d.ms);
    else if (d.type === "noop") {
      const msg = state.shipped >= 1
        ? "Still nothing! CSS changed how the page LOOKS, not how it BEHAVES. Behaviour is JavaScript, coming in layer 3."
        : "Nothing happened. HTML can create a button but can't make it DO anything. That's JavaScript's job (layer 3).";
      toast(msg, "info");
    } else if (d.type === "progress" && levelProgress && mode === "play") {
      levelProgress.distance = d.distance; levelProgress.coins = d.coins; levelProgress.crashes = d.crashes; renderLevel();
    } else if (d.type === "level-complete") levelComplete(d);
    else if (d.type === "crash" && !reduceMotion) { el.viewport.classList.remove("hit"); void el.viewport.offsetWidth; el.viewport.classList.add("hit"); }
  });

  // Forward play keys when focus is outside the page.
  const PLAY_KEYS = [" ", "ArrowUp", "ArrowDown", "w", "W", "s", "S"];
  function forward(e, down) {
    if (mode !== "play" || !PLAY_KEYS.includes(e.key)) return;
    if (e.target && (e.target.tagName === "INPUT")) return;
    e.preventDefault();
    if (e.repeat) return;
    el.preview.contentWindow.postMessage({ __labHost: true, type: "key", key: e.key, down }, "*");
  }
  document.addEventListener("keydown", (e) => forward(e, true));
  document.addEventListener("keyup", (e) => forward(e, false));

  // ---------- score + clock ----------
  function updateScore() {
    if (!state) return;
    el.score.textContent = Core.score(state, elapsed()).total;
  }
  function tick() {
    el.clock.textContent = fmt(elapsed());
    el.clock.classList.toggle("over", elapsed() > 420);
  }

  // ---------- leaderboard ----------
  function readBoard() {
    try { return JSON.parse(localStorage.getItem(BOARD_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveBoard(entry) {
    const list = readBoard().concat(entry).sort(Core.compareEntries).slice(0, 10);
    try { localStorage.setItem(BOARD_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: still show this run */ }
    return list.some((x) => x.createdAt === entry.createdAt) ? list : list.concat(entry);
  }

  // ---------- intro + finish ----------
  el.introPath.innerHTML = STAGES.map((s) => '<li style="--tech:' + s.color + '"><b>' + s.n + "</b><strong>" + esc(s.tech) + "</strong><span>" + esc(s.title) + "</span></li>").join("");

  function startLab() {
    state = Core.createState(el.name.value);
    state.started = performance.now();
    el.intro.hidden = true;
    el.results.hidden = true;
    el.console.innerHTML = ""; el.network.innerHTML = ""; netCount = 0; el.netCount.textContent = "0";
    el.devices.hidden = true;
    setDevice("desktop");
    setUrl();
    clearInterval(clockTimer);
    clockTimer = setInterval(tick, 250);
    consoleLog("New project: " + state.name + ". index.html is empty.", "log");
    beginStage();
  }
  el.start.addEventListener("click", startLab);
  el.name.addEventListener("keydown", (e) => { if (e.key === "Enter") startLab(); });

  function finish() {
    mode = "done";
    state.finished = performance.now();
    clearInterval(clockTimer);
    tick();
    const secs = elapsed();
    const sc = Core.score(state, secs);
    const entry = { name: state.name, score: sc.total, time: Math.round(secs), createdAt: Date.now() };
    const list = saveBoard(entry);
    el.resUrl.textContent = "https://" + slug(state.name) + ".evolve.dev";
    const P = Core.POINTS;
    el.resStats.innerHTML = [
      ["FINISH TIME", fmt(secs), "+" + sc.time + " speed pts"],
      ["CODE", sc.code + " / " + P.codeMax, sc.mistakes + " wrong · " + sc.hints + " hints"],
      ["SPEED", "+" + sc.time + " / " + P.timeMax, "full at " + fmt(P.fastSeconds) + ", 0 at " + fmt(P.slowSeconds)],
      ["TOTAL", sc.total + " / " + P.max, ""]
    ].map((r, i) => '<div class="' + (i === 3 ? "total" : "") + '"><span>' + r[0] + "</span><strong>" + r[1] + "</strong>" +
      (r[2] ? "<small>" + r[2] + "</small>" : "") + "</div>").join("");
    el.resStack.innerHTML = STAGES.map((s, i) => {
      const picks = lessonsFor(i).filter((t) => t.choice).map((t) => t.choice);
      return '<li style="--tech:' + s.color + '"><b>' + esc(s.tech) + "</b><span>" + esc(s.title) +
        (picks.length ? " · <em>" + esc(picks.join(", ")) + "</em>" : "") + "</span></li>";
    }).join("");
    el.board.innerHTML = list.map((x) => '<li class="' + (x.createdAt === entry.createdAt ? "me" : "") + '"><span>' + esc(x.name) + "</span><b>" +
      Number(x.score) + "</b><small>" + fmt(x.time) + "</small></li>").join("");
    el.results.hidden = false;
    renderStepper();
    updateScore();
    el.again.focus({ preventScroll: true });
  }
  el.view.addEventListener("click", () => {
    el.results.hidden = true;
    el.next.disabled = false;
    el.next.textContent = "Show my results again →";
  });
  el.again.addEventListener("click", () => {
    el.results.hidden = true;
    el.intro.hidden = false;
    mode = "intro";
    el.name.focus();
  });

  // Blank page before start.
  el.preview.srcdoc = "<!doctype html><title>Empty</title><body style='font:14px system-ui;color:#888;display:grid;place-items:center;height:90vh;margin:0'>index.html is empty</body>";
  renderStepper();
  setTimeout(() => el.name.focus(), 50);

  // ---------- test hooks (?test=1) ----------
  if (/[?&]test=1\b/.test(location.search)) {
    window.EVOLVE_LAB = {
      get state() { return state; }, get mode() { return mode; },
      start: (name) => { el.name.value = name || "Tester"; startLab(); },
      fillStage: () => { Core.stageSlots(state.stage).forEach((id) => { if (!state.fills[id]) { const h = Core.nextHint(state); tryPlace(h.tile, h.slot); } }); },
      tryPlace, ship: () => el.ship.click(), next: () => el.next.click(),
      clearLevel: () => { try { el.preview.contentWindow.__LAB_TEST__.finish(); } catch (e) { /* not in play */ } }
    };
  }
})();
