// EVOLVE — Web Build Lab: the engine that runs INSIDE the player's page (preview iframe).
// lab-core injects it as a string, with window.__LAB__ holding what the player has built.
// The game is plain DOM: the runner is the player's <img>, obstacles are <div class="block">.
(function (root) {
  "use strict";

  function RUNTIME() {
    var cfg = window.__LAB__ || {};
    var $ = function (s) { return document.querySelector(s); };
    function post(msg) { msg.__lab = true; try { parent.postMessage(msg, "*"); } catch (e) { /* preview only */ } }
    function log(text, level) { post({ type: "console", text: text, level: level || "log" }); }
    function net(url, status, ms) { post({ type: "network", method: "GET", url: url, status: status, ms: ms }); }

    var playBtn = $("#play");

    // Before JavaScript exists, the button is inert. The lab only observes the click.
    if (!cfg.js) {
      if (playBtn) playBtn.addEventListener("click", function () {
        log("click on <button#play>: no event listener attached", "warn");
        post({ type: "noop" });
      });
      return;
    }

    var game = $("#game"), runner = $("#runner"), scoreEl = $("#score");
    if (!game || !runner) { log("Missing #game or #runner", "error"); return; }

    var GROUND = 36, RX = 48, RW = 56, STAND = 50, DUCKH = 26;
    var st = {
      running: false, done: false, dist: 0, y: 0, vy: 0, air: 0, duck: false, stunUntil: 0,
      blocks: [], coins: [], nextSpawn: 0, crashes: 0, coinsGot: 0, last: 0, keysDown: {}
    };
    var seed = 7 + (cfg.level || 0) * 13;
    function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function pick(list) { return list[Math.floor(rand() * list.length)]; }

    runner.style.transformOrigin = "50% 100%";
    runner.style.transition = "none";

    var msg = document.createElement("div");
    msg.className = "msg";
    game.appendChild(msg);
    function say(text) { msg.textContent = text; msg.style.display = text ? "grid" : "none"; }

    function points() {
      return Math.max(0, Math.floor(st.dist) + st.coinsGot * 2 - st.crashes * 40);
    }
    function updateScore() {
      if (scoreEl) scoreEl.textContent = Math.floor(Math.min(st.dist, cfg.goal)) + " / " + cfg.goal + " m  ·  " + st.coinsGot + " coin" + (st.coinsGot === 1 ? "" : "s") + "  ·  " + st.crashes + " crash" + (st.crashes === 1 ? "" : "es");
      post({ type: "progress", distance: st.dist, goal: cfg.goal, coins: st.coinsGot, crashes: st.crashes });
    }

    // ---------- Live feed (APIs layer) ----------
    if (cfg.feed) {
      var feed = $("#feed");
      var t0 = performance.now();
      setTimeout(function () {
        if (!feed) return;
        var url = cfg.feed === "news" ? "/api/dev-news" : "/api/leaderboard";
        var ms = Math.round(performance.now() - t0);
        net(url, 200, ms);
        var list = document.createElement(cfg.feed === "news" ? "ul" : "ol");
        var rows = cfg.feed === "news" ? cfg.news : cfg.board.slice(0, 5).map(function (r) { return r.name + " · " + r.score; });
        if (!rows.length) rows = ["Be the first on the board!"];
        rows.forEach(function (text) { var li = document.createElement("li"); li.textContent = text; list.appendChild(li); });
        feed.innerHTML = "";
        var head = document.createElement("p");
        head.innerHTML = '<span class="live">● LIVE</span> ' + (cfg.feed === "news" ? "Dev news" : "Top runners");
        head.style.margin = "12px 0 0";
        feed.appendChild(head);
        feed.appendChild(list);
        log("showing " + rows.length + " items from " + url);
      }, 650);
    }

    if (cfg.deployed) {
      var h1 = $("h1");
      if (h1) { var b = document.createElement("span"); b.className = "badge"; b.textContent = "● LIVE"; h1.appendChild(b); }
    }

    var best = 0;
    if (cfg.save) {
      try { best = Number(localStorage.getItem(cfg.bestKey)) || 0; } catch (e) { best = 0; }
      if (scoreEl && best) log("localStorage best = " + best);
    }

    if (!cfg.level) { say("Built ✓"); return; }

    if (cfg.level >= 2) net("/api/level-" + cfg.level, 200, 80 + Math.round(rand() * 60));
    say("Press SPACE or ▶ Play to start");
    updateScore();

    // ---------- Actions ----------
    function start() {
      if (st.running || st.done) return;
      st.running = true; st.last = performance.now(); st.nextSpawn = 0.6;
      say("");
      var top = game.getBoundingClientRect().top;
      if (top < 0 || top + game.offsetHeight + 120 > window.innerHeight) window.scrollTo(0, window.scrollY + top - 8);
      log("start(): level " + cfg.level + ", goal " + cfg.goal + " m");
      post({ type: "level-start", level: cfg.level });
      requestAnimationFrame(loop);
    }
    // Jump arc fitted to the game box: same air time everywhere, lower peak on short (phone) boxes,
    // so the runner never leaves #game.
    var AIR = 0.713;
    function headroom() { return Math.max(60, (game.clientHeight || 240) - GROUND - STAND - 6); }
    function arc() {
      var apex = Math.min(146, headroom());
      var v = 4 * apex / AIR;
      return { v: v, g: 2 * v / AIR, v2: v * 0.85 };
    }
    function jump() {
      if (!st.running) { start(); return; }
      if (st.done) return;
      var a = arc();
      if (st.y <= 0.01) { st.vy = a.v; st.air = 1; }
      else if (cfg.doubleJump && st.air === 1) { st.vy = a.v2; st.air = 2; }
    }
    function duck(down) {
      if (!cfg.duck) { if (down) log("ArrowDown pressed, but no listener handles it yet", "warn"); return; }
      st.duck = !!down;
      if (down && st.y > 0) st.vy = Math.min(st.vy, -900);
    }

    function key(k, down) {
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W" || k === "Spacebar") { if (down && !st.keysDown.jump) jump(); st.keysDown.jump = down; return true; }
      if (k === "ArrowDown" || k === "s" || k === "S") { duck(down); return true; }
      return false;
    }
    document.addEventListener("keydown", function (e) { if (key(e.key, true)) e.preventDefault(); });
    document.addEventListener("keyup", function (e) { key(e.key, false); });
    window.addEventListener("message", function (e) {
      var d = e.data || {};
      if (d.__labHost && d.type === "key") key(d.key, d.down);
      if (d.__labHost && d.type === "start") start();
    });
    if (playBtn) playBtn.addEventListener("click", function () { start(); playBtn.blur(); });
    if (cfg.touch) {
      Array.prototype.forEach.call(document.querySelectorAll(".touch button"), function (btn) {
        var act = btn.getAttribute("data-act");
        btn.addEventListener("pointerdown", function (e) { e.preventDefault(); if (act === "jump") jump(); else duck(true); });
        btn.addEventListener("pointerup", function () { if (act === "duck") duck(false); });
        btn.addEventListener("pointerleave", function () { if (act === "duck") duck(false); });
      });
    }

    // ---------- World ----------
    function width() { return game.clientWidth || 600; }

    function spawn() {
      var W = width();
      var lastBlock = st.blocks[st.blocks.length - 1];
      if (lastBlock && lastBlock.x > W - 250) { st.nextSpawn = 0.15; return; }
      var high = cfg.duck && cfg.highLabels.length && rand() < 0.35;
      var el = document.createElement("div");
      var b = { x: W + 10, high: high, hinted: false, el: el };
      if (high) { b.w = 70; b.h = 22; b.bottom = GROUND + 32; el.className = "block high"; el.textContent = pick(cfg.highLabels); }
      else { b.w = 30 + Math.round(rand() * 26); b.h = 30 + Math.round(rand() * 18); b.bottom = GROUND; el.className = "block"; el.textContent = pick(cfg.labels); }
      el.style.width = b.w + "px"; el.style.height = b.h + "px"; el.style.bottom = b.bottom + "px";
      game.appendChild(el);
      st.blocks.push(b);
      if (cfg.coins && rand() < 0.35) {
        var c = document.createElement("div");
        c.className = "coin"; c.textContent = "+2";
        var cy = GROUND + 78 + Math.round(rand() * 14);   // in the air: jump to grab it
        var coin = { x: W + 10 + b.w + 110, y: cy, el: c };
        c.style.bottom = cy + "px";
        game.appendChild(c);
        st.coins.push(coin);
      }
      var ms = cfg.spawnMs * (0.8 + rand() * 0.5);
      st.nextSpawn = ms / 1000;
    }

    function runnerBox() {
      var h = st.duck ? DUCKH : STAND;
      return { x1: RX + 12, x2: RX + RW - 12, y1: GROUND + st.y, y2: GROUND + st.y + h };
    }
    function overlaps(a, b) { return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1; }

    function crash(b, now) {
      st.crashes += 1;
      st.stunUntil = now + 700;
      b.el.style.opacity = "0.25";
      b.dead = true;
      log("Uncaught CrashError: runner hit " + b.el.textContent.replace(/AI:.*$/, ""), "error");
      post({ type: "crash" });
    }

    function coach(b) {
      b.hinted = true;
      var confidence = 0.45 + rand() * 0.53;
      var right = b.high ? "DUCK" : "JUMP";
      var guess = confidence < 0.6 && rand() < 0.5 ? (right === "JUMP" ? "DUCK" : "JUMP") : right;
      if (confidence < 0.6) { log("ai.predict → " + guess + " (" + Math.round(confidence * 100) + "%): hidden by confidence check", "warn"); return; }
      var tag = document.createElement("span");
      tag.className = "ai-hint";
      tag.textContent = "AI: " + guess + " " + Math.round(confidence * 100) + "%";
      b.el.appendChild(tag);
    }

    function finish() {
      st.done = true; st.running = false;
      st.blocks.forEach(function (b) { b.el.remove(); });
      st.coins.forEach(function (c) { c.el.remove(); });
      runner.style.transform = "none";
      var pts = points();
      if (cfg.save) {
        if (pts > best) { best = pts; try { localStorage.setItem(cfg.bestKey, String(best)); } catch (e) { /* storage blocked */ } }
        log("localStorage.setItem('best', " + best + ")");
      }
      say("Level clear ✓");
      updateScore();
      log("level " + cfg.level + " complete: " + Math.floor(st.dist) + " m, " + st.coinsGot + " coins, " + st.crashes + " crashes");
      post({ type: "level-complete", level: cfg.level, distance: Math.min(st.dist, cfg.goal), coins: st.coinsGot, crashes: st.crashes, best: best });
    }

    function loop(now) {
      if (!st.running) return;
      var dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      var stunned = now < st.stunUntil;
      var progress = st.dist / cfg.goal;
      var speed = cfg.speed * (1 + 0.18 * progress) * (stunned ? 0.45 : 1);

      // physics
      if (st.y > 0 || st.vy > 0) {
        var room = headroom();
        st.vy -= arc().g * dt;
        st.y = Math.max(0, st.y + st.vy * dt);
        if (st.y > room) { st.y = room; st.vy = Math.min(st.vy, 0); }   // ceiling: stay inside the box
        if (st.y === 0) { st.vy = 0; st.air = 0; }
      }
      st.dist += speed * dt / 20;

      // spawn + move
      st.nextSpawn -= dt;
      if (st.nextSpawn <= 0 && st.dist < cfg.goal - 15) spawn();
      var box = runnerBox();
      for (var i = st.blocks.length - 1; i >= 0; i--) {
        var b = st.blocks[i];
        b.x -= speed * dt;
        b.el.style.transform = "translateX(" + b.x + "px)";
        if (cfg.ai && !b.hinted && b.x < width() * 0.75) coach(b);
        if (!b.dead && !stunned && overlaps(box, { x1: b.x + 3, x2: b.x + b.w - 3, y1: b.bottom, y2: b.bottom + b.h })) crash(b, now);
        if (b.x < -b.w - 20) { b.el.remove(); st.blocks.splice(i, 1); }
      }
      for (var j = st.coins.length - 1; j >= 0; j--) {
        var c = st.coins[j];
        c.x -= speed * dt;
        c.el.style.transform = "translateX(" + c.x + "px)";
        if (overlaps(box, { x1: c.x, x2: c.x + 30, y1: c.y, y2: c.y + 30 })) {
          st.coinsGot += 1; c.el.remove(); st.coins.splice(j, 1);
          post({ type: "coin" });
          continue;
        }
        if (c.x < -40) { c.el.remove(); st.coins.splice(j, 1); }
      }

      // draw runner
      var blink = stunned && Math.floor(now / 90) % 2 === 0;
      runner.style.opacity = blink ? "0.35" : "1";
      runner.style.transform = "translateY(" + (-st.y) + "px) scaleY(" + (st.duck ? 0.52 : 1) + ")";

      if (Math.floor(now / 100) !== Math.floor((now - dt * 1000) / 100)) updateScore();
      if (st.dist >= cfg.goal) { finish(); return; }
      requestAnimationFrame(loop);
    }

    // test hook for the lab's automated checks
    window.__LAB_TEST__ = { finish: function () { st.dist = cfg.goal; if (!st.running) { st.running = true; } finish(); }, state: st };
  }

  root.EVOLVE_RUNTIME = RUNTIME;
  root.EVOLVE_RUNTIME_SRC = RUNTIME.toString();
  if (typeof module !== "undefined" && module.exports) module.exports = { RUNTIME: RUNTIME, SRC: RUNTIME.toString() };
})(typeof window !== "undefined" ? window : globalThis);
