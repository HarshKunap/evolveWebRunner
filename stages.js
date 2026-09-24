// EVOLVE — Web Build Lab: content model (data only).
// Six layers. Each layer adds real code to the player's page. Slots accept one block "group".
// Lines tagged s:N appear once layer N is reached. HTML and CSS files are rendered literally.
(function (root) {
  "use strict";

  function svg(markup) { return "data:image/svg+xml;utf8," + encodeURIComponent(markup); }

  const ASSETS = {
    bot: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56' width='56' height='56'><line x1='28' y1='5' x2='28' y2='12' stroke='#1b1b24' stroke-width='3'/><circle cx='28' cy='5' r='3.5' fill='#e94e1b'/><rect x='11' y='12' width='34' height='24' rx='7' fill='#5b8def' stroke='#1b1b24' stroke-width='2.5'/><circle cx='21' cy='24' r='4.5' fill='#fff'/><circle cx='35' cy='24' r='4.5' fill='#fff'/><circle cx='22' cy='24' r='2' fill='#1b1b24'/><circle cx='36' cy='24' r='2' fill='#1b1b24'/><rect x='15' y='37' width='26' height='12' rx='3' fill='#3656b8' stroke='#1b1b24' stroke-width='2.5'/><rect x='17' y='49' width='7' height='7' rx='1' fill='#1b1b24'/><rect x='32' y='49' width='7' height='7' rx='1' fill='#1b1b24'/></svg>"),
    cat: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56' width='56' height='56'><path d='M44 44 Q54 38 50 28' fill='none' stroke='#1b1b24' stroke-width='3' stroke-linecap='round'/><ellipse cx='27' cy='44' rx='15' ry='10' fill='#f2b705' stroke='#1b1b24' stroke-width='2.5'/><path d='M12 17 L15 4 L24 12 Z' fill='#f2b705' stroke='#1b1b24' stroke-width='2.5' stroke-linejoin='round'/><path d='M42 17 L39 4 L30 12 Z' fill='#f2b705' stroke='#1b1b24' stroke-width='2.5' stroke-linejoin='round'/><ellipse cx='27' cy='22' rx='16' ry='12' fill='#f2b705' stroke='#1b1b24' stroke-width='2.5'/><circle cx='21' cy='21' r='2.5' fill='#1b1b24'/><circle cx='33' cy='21' r='2.5' fill='#1b1b24'/><path d='M25 27 L27 29 L29 27' fill='none' stroke='#1b1b24' stroke-width='2'/></svg>"),
    dev: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56' width='56' height='56'><path d='M13 54 V36 Q13 26 28 26 Q43 26 43 36 V54 Z' fill='#e94e1b' stroke='#1b1b24' stroke-width='2.5'/><text x='28' y='45' font-family='monospace' font-size='10' font-weight='700' text-anchor='middle' fill='#fff'>&lt;/&gt;</text><circle cx='28' cy='15' r='11' fill='#f3c9a0' stroke='#1b1b24' stroke-width='2.5'/><path d='M17 13 Q28 0 39 13 Q33 8 17 13 Z' fill='#1b1b24'/><circle cx='24' cy='16' r='1.8' fill='#1b1b24'/><circle cx='32' cy='16' r='1.8' fill='#1b1b24'/></svg>")
  };

  // ---------- Master project files ----------
  // { s: layer, t: given text }  or  { s: layer, slot: id }
  const FILES = {
    "index.html": { lang: "html", from: 1, lines: [
      { s: 1, t: "<!DOCTYPE html>" },
      { s: 1, t: "<html lang=\"en\">" },
      { s: 1, t: "<head>" },
      { s: 1, t: "  <meta charset=\"utf-8\">" },
      { s: 5, slot: "viewport" },
      { s: 1, t: "  <title>My Web Runner</title>" },
      { s: 2, t: "  <link rel=\"stylesheet\" href=\"style.css\">" },
      { s: 5, t: "  <link rel=\"stylesheet\" href=\"responsive.css\">" },
      { s: 1, t: "</head>" },
      { s: 1, t: "<body>" },
      { s: 2, t: "  <header class=\"site-header\">" },
      { s: 1, slot: "heading" },
      { s: 1, slot: "text" },
      { s: 2, t: "  </header>" },
      { s: 2, t: "  <main class=\"layout\">" },
      { s: 2, t: "    <section class=\"card\">" },
      { s: 2, t: "      <div class=\"stage\">" },
      { s: 1, slot: "area" },
      { s: 1, slot: "runner" },
      { s: 2, t: "      </div>" },
      { s: 1, slot: "button" },
      { s: 5, t: "      <div class=\"touch\"><button data-act=\"jump\">Jump</button><button data-act=\"duck\">Duck</button></div>" },
      { s: 3, t: "      <p id=\"score\">0 m</p>" },
      { s: 2, t: "    </section>" },
      { s: 2, t: "    <aside class=\"card side\">" },
      { s: 2, t: "      <h2>About this page</h2>" },
      { s: 2, t: "      <p>Built live at Enigma Reboot, one web layer at a time.</p>" },
      { s: 4, t: "      <section id=\"feed\"><p class=\"skeleton\">Loading…</p></section>" },
      { s: 2, t: "    </aside>" },
      { s: 2, t: "  </main>" },
      { s: 3, t: "  <script src=\"game.js\"><\/script>" },
      { s: 4, t: "  <script src=\"api.js\"><\/script>" },
      { s: 6, t: "  <script src=\"ai.js\"><\/script>" },
      { s: 1, t: "</body>" },
      { s: 1, t: "</html>" }
    ] },

    "style.css": { lang: "css", from: 2, lines: [
      { s: 2, t: "/* style.css: how your page looks */" },
      { s: 2, t: ":root {" },
      { s: 2, slot: "accent" },
      { s: 2, t: "}" },
      { s: 2, t: "body {" },
      { s: 2, slot: "bg" },
      { s: 2, slot: "font" },
      { s: 2, t: "  margin: 0;" },
      { s: 2, t: "}" },
      { s: 2, t: ".site-header { padding: 22px 32px; border-bottom: 4px solid var(--accent); }" },
      { s: 2, t: "h1 { margin: 0; font-size: 2.2rem; color: var(--accent); }" },
      { s: 2, t: ".site-header p { margin: 6px 0 0; opacity: .75; }" },
      { s: 2, t: ".layout {" },
      { s: 2, slot: "layout" },
      { s: 2, t: "  gap: 20px; padding: 22px 32px;" },
      { s: 2, t: "}" },
      { s: 2, t: ".card { background: rgba(127,127,127,.13); border-radius: 16px; padding: 16px; min-width: 0; }" },
      { s: 2, t: ".side h2 { margin: 0 0 6px; font-size: 1.1rem; }" },
      { s: 2, t: ".stage { position: relative; overflow: hidden; }" },
      { s: 2, t: "#game {" },
      { s: 2, slot: "gamebox" },
      { s: 2, t: "  position: relative; overflow: hidden;" },
      { s: 2, t: "  background: linear-gradient(to top, var(--accent) 0 4px, rgba(127,127,127,.2) 4px 36px, transparent 36px);" },
      { s: 2, t: "}" },
      { s: 2, t: "#runner { position: absolute; left: 48px; bottom: 36px; width: 56px; }" },
      { s: 2, t: "#play { margin-top: 12px; padding: 10px 22px; border: 0; border-radius: 999px; background: var(--accent); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }" },
      { s: 3, t: ".block { position: absolute; left: 0; display: grid; place-items: center; border-radius: 6px; background: var(--accent); color: #fff; font: 700 11px ui-monospace, monospace; }" },
      { s: 3, t: ".msg { position: absolute; inset: 0 0 36px; display: grid; place-items: center; font-weight: 700; text-align: center; }" },
      { s: 3, t: "#score { margin: 10px 0 0; font-weight: 700; }" },
      { s: 4, t: ".block.high { background: transparent; border: 2px dashed var(--accent); color: inherit; }" },
      { s: 4, t: ".coin { position: absolute; left: 0; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #f2b705; color: #1b1b24; font: 700 10px ui-monospace, monospace; }" },
      { s: 4, t: "#feed ol, #feed ul { margin: 8px 0 0; padding-left: 20px; } #feed li { margin: 5px 0; }" },
      { s: 4, t: ".skeleton { opacity: .5; } .live { color: var(--accent); font-weight: 700; }" },
      { s: 6, t: ".ai-hint { position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -6px); white-space: nowrap; padding: 2px 6px; border-radius: 6px; background: #ff5cf0; color: #1b1b24; font: 700 10px ui-monospace, monospace; }" },
      { s: 6, t: ".badge { display: inline-block; margin-left: 10px; padding: 3px 10px; border-radius: 999px; background: var(--accent); color: #fff; font-size: .8rem; vertical-align: middle; }" }
    ] },

    "game.js": { lang: "js", from: 3, lines: [
      { s: 3, t: "// game.js: make the page react" },
      { s: 3, t: "const game = document.querySelector('#game');" },
      { s: 3, t: "const runner = document.querySelector('#runner');" },
      { s: 3, t: "const playBtn = document.querySelector('#play');" },
      { s: 3, t: "" },
      { s: 3, t: "function loop(time) {" },
      { s: 3, t: "  moveBlocks(time);   // slide every .block left" },
      { s: 3, slot: "loop" },
      { s: 3, t: "}" },
      { s: 3, slot: "spawn" },
      { s: 3, slot: "input" },
      { s: 3, t: "function moveBlocks(time) {" },
      { s: 3, t: "  for (const block of blocks) {" },
      { s: 3, slot: "collide" },
      { s: 3, t: "  }" },
      { s: 3, t: "}" },
      { s: 3, slot: "start" }
    ] },

    "api.js": { lang: "js", from: 4, lines: [
      { s: 4, t: "// api.js: load live data from a server" },
      { s: 4, t: "async function loadLevel() {" },
      { s: 4, slot: "fetch" },
      { s: 4, slot: "json" },
      { s: 4, t: "  addBlocks(level.blocks);   // overhead bars + bonus coins" },
      { s: 4, t: "}" },
      { s: 4, slot: "duck" },
      { s: 4, slot: "feed" },
      { s: 4, t: "loadLevel();" }
    ] },

    "responsive.css": { lang: "css", from: 5, lines: [
      { s: 5, t: "/* responsive.css: one page, every screen */" },
      { s: 5, t: ".touch { display: none; gap: 10px; margin-top: 10px; }" },
      { s: 5, t: ".touch button { flex: 1; padding: 14px; border: 0; border-radius: 12px; background: var(--accent); color: #fff; font: inherit; font-weight: 700; }" },
      { s: 5, t: "@media (max-width: 600px) {" },
      { s: 5, slot: "stack" },
      { s: 5, slot: "type" },
      { s: 5, slot: "touch" },
      { s: 5, t: "  .site-header, .layout { padding: 14px; }" },
      { s: 5, t: "  #game { height: 170px; }" },
      { s: 5, t: "}" }
    ] },

    "ai.js": { lang: "js", from: 6, lines: [
      { s: 6, t: "// ai.js: smart hints, with people still in charge" },
      { s: 6, t: "async function coach(block) {" },
      { s: 6, slot: "predict" },
      { s: 6, slot: "guard" },
      { s: 6, t: "  showHint(hint);" },
      { s: 6, t: "}" },
      { s: 6, slot: "save" }
    ] },

    "terminal": { lang: "sh", from: 6, lines: [
      { s: 6, t: "$ git add . && git commit -m \"my web runner\"" },
      { s: 6, slot: "deploy" }
    ] }
  };

  // Slot definitions: which block group fits, how it is indented.
  const SLOTS = {
    heading:  { file: "index.html", group: "heading", indent: "    ", hint: "a heading" },
    text:     { file: "index.html", group: "text",    indent: "    ", hint: "a paragraph" },
    area:     { file: "index.html", group: "area",    indent: "        ", hint: "the game area" },
    runner:   { file: "index.html", group: "runner",  indent: "        ", hint: "your character image" },
    button:   { file: "index.html", group: "button",  indent: "      ", hint: "a button" },
    accent:   { file: "style.css", group: "accent", indent: "  ", hint: "an accent colour" },
    bg:       { file: "style.css", group: "bg",     indent: "  ", hint: "a background theme" },
    font:     { file: "style.css", group: "font",   indent: "  ", hint: "a font" },
    layout:   { file: "style.css", group: "layout", indent: "  ", hint: "a layout" },
    gamebox:  { file: "style.css", group: "gamebox", indent: "  ", hint: "a size for #game" },
    loop:     { file: "game.js", group: "loop",    indent: "  ", hint: "the animation loop" },
    spawn:    { file: "game.js", group: "spawn",   indent: "", hint: "a block spawner" },
    input:    { file: "game.js", group: "input",   indent: "", hint: "a keyboard listener" },
    collide:  { file: "game.js", group: "collide", indent: "    ", hint: "a collision check" },
    start:    { file: "game.js", group: "start",   indent: "", hint: "a click handler" },
    fetch:    { file: "api.js", group: "fetch", indent: "  ", hint: "a network request" },
    json:     { file: "api.js", group: "json",  indent: "  ", hint: "JSON parsing" },
    duck:     { file: "api.js", group: "duck",  indent: "", hint: "a duck listener" },
    feed:     { file: "api.js", group: "feed",  indent: "", hint: "a live feed" },
    viewport: { file: "index.html", group: "viewport", indent: "  ", hint: "the viewport tag" },
    stack:    { file: "responsive.css", group: "stack", indent: "  ", hint: "a one-column rule" },
    type:     { file: "responsive.css", group: "type",  indent: "  ", hint: "fluid type" },
    touch:    { file: "responsive.css", group: "touch", indent: "  ", hint: "touch controls" },
    predict:  { file: "ai.js", group: "predict", indent: "  ", hint: "an AI prediction" },
    guard:    { file: "ai.js", group: "guard",   indent: "  ", hint: "a confidence check" },
    save:     { file: "ai.js", group: "save",    indent: "", hint: "save the best score" },
    deploy:   { file: "terminal", group: "deploy", indent: "", hint: "the deploy command" }
  };

  // ---------- The six layers ----------
  const STAGES = [
    {
      key: "html", n: 1, tech: "HTML", color: "#e34f26", title: "Structure",
      mission: "Give your page a skeleton.",
      brief: "HTML says WHAT is on a page: a heading, some text, an image, a button. Snap in the elements your game page needs. Pick your character!",
      ship: "Save index.html",
      after: "Your page exists! It's plain: default font, no layout, and the game area is invisible because it's empty.",
      tryIt: "Click ▶ Play in the preview.",
      tiles: [
        { id: "h1", group: "heading", code: "<h1>{NAME}'s Web Runner</h1>", lesson: "<h1> is the main heading of a page." },
        { id: "p", group: "text", code: "<p>Built one web layer at a time.</p>", lesson: "<p> is a paragraph of text." },
        { id: "game", group: "area", code: "<div id=\"game\"></div>", lesson: "An empty <div> box for the game. Its id lets CSS and JS find it later." },
        { id: "bot", group: "runner", choice: "Bot", asset: "bot", code: "<img id=\"runner\" src=\"bot.svg\" alt=\"Bot\">", lesson: "<img> shows a picture. You chose the Bot." },
        { id: "cat", group: "runner", choice: "Cat", asset: "cat", code: "<img id=\"runner\" src=\"cat.svg\" alt=\"Cat\">", lesson: "<img> shows a picture. You chose the Cat." },
        { id: "dev", group: "runner", choice: "Dev", asset: "dev", code: "<img id=\"runner\" src=\"dev.svg\" alt=\"Dev\">", lesson: "<img> shows a picture. You chose the Dev." },
        { id: "btn", group: "button", code: "<button id=\"play\">▶ Play</button>", lesson: "<button> makes a clickable button. Making it DO something needs JavaScript." },
        { id: "x-color", group: "x", decoy: true, code: "color: tomato;", why: "That's CSS, a style rule. HTML only describes structure. You'll style things in the next layer." },
        { id: "x-click", group: "x", decoy: true, code: "playBtn.addEventListener('click', start)", why: "That's JavaScript behaviour. A page needs structure before it can have behaviour." }
      ]
    },
    {
      key: "css", n: 2, tech: "CSS", color: "#2965f1", title: "Style",
      mission: "Make it look like a real website.",
      brief: "CSS says HOW things look: colours, fonts, layout, size. Your choices here become your game's theme. We also wrapped your HTML in <header> and <main> so CSS has areas to style.",
      ship: "Save style.css",
      after: "Same HTML, brand new look. Your colours and font now style the page, and the game area has a size and a ground line.",
      tryIt: "It looks ready, but it's still static. Try ▶ Play again.",
      tiles: [
        { id: "ac-coral", group: "accent", choice: "Coral", swatch: "#e94e1b", code: "--accent: #e94e1b;", lesson: "A CSS variable. Everything using var(--accent) turns coral." },
        { id: "ac-blue", group: "accent", choice: "Electric", swatch: "#2965f1", code: "--accent: #2965f1;", lesson: "A CSS variable. Everything using var(--accent) turns blue." },
        { id: "ac-green", group: "accent", choice: "Mint", swatch: "#12a860", code: "--accent: #12a860;", lesson: "A CSS variable. Everything using var(--accent) turns green." },
        { id: "bg-night", group: "bg", choice: "Midnight", swatch: "#0b1020", code: "background: #0b1020; color: #e8ecf8;", lesson: "Sets the page background and text colour." },
        { id: "bg-paper", group: "bg", choice: "Paper", swatch: "#f6f1e7", code: "background: #f6f1e7; color: #1a1a22;", lesson: "Sets the page background and text colour." },
        { id: "bg-ocean", group: "bg", choice: "Ocean", swatch: "linear-gradient(160deg,#06283d,#1363df)", code: "background: linear-gradient(160deg, #06283d, #1363df); color: #eaf6ff;", lesson: "A gradient background, drawn by the browser." },
        { id: "f-sans", group: "font", choice: "Clean", font: "system-ui, sans-serif", code: "font-family: system-ui, sans-serif;", lesson: "Uses the device's clean system font." },
        { id: "f-mono", group: "font", choice: "Code", font: "ui-monospace, monospace", code: "font-family: ui-monospace, 'Courier New', monospace;", lesson: "A monospace font: every letter is the same width." },
        { id: "f-serif", group: "font", choice: "Classic", font: "Georgia, serif", code: "font-family: Georgia, serif;", lesson: "A serif font, like a newspaper." },
        { id: "grid", group: "layout", code: "display: grid; grid-template-columns: 2fr 1fr;", lesson: "CSS Grid splits the page into two columns: game and sidebar." },
        { id: "size", group: "gamebox", code: "height: 240px; border-radius: 14px;", lesson: "Gives the empty #game box a real height, so it's finally visible." },
        { id: "x-font", group: "x", decoy: true, code: "<font color=\"red\">", why: "<font> is old HTML that was removed from the standard. Today styling belongs in CSS." },
        { id: "x-js", group: "x", decoy: true, code: "setInterval(spawnBlock, 1400);", why: "That's JavaScript timing. CSS can't create new elements. That's the next layer." }
      ]
    },
    {
      key: "js", n: 3, tech: "JavaScript", color: "#f7df1e", title: "Behaviour",
      mission: "Bring the page to life.",
      brief: "JavaScript says WHAT HAPPENS: when you click, when you press a key, every frame. Wire up the loop, the obstacles, the controls and the Play button.",
      ship: "Save game.js",
      after: "The page reacts now! JS creates <div class=\"block\"> obstacles, moves them, and listens to your keyboard.",
      tryIt: "Press SPACE (or click ▶ Play) to start. Jump the blocks and reach the goal to unlock the next layer. Each crash costs 1 point.",
      play: { level: 1, goal: 320, speed: 300, spawnMs: 1500, labels: ["<div>", "<p>", "404", "<br>", "<img>"] },
      tiles: [
        { id: "raf", group: "loop", code: "requestAnimationFrame(loop);", lesson: "Asks the browser to run loop() again before the next repaint, about 60 times a second." },
        { id: "sp-chill", group: "spawn", choice: "Chill", code: "setInterval(spawnBlock, 1600);", lesson: "Creates a new block every 1.6 s. Relaxed pace." },
        { id: "sp-spicy", group: "spawn", choice: "Spicy", code: "setInterval(spawnBlock, 1150);", lesson: "Creates a new block every 1.15 s. A tougher run." },
        { id: "k-single", group: "input", choice: "Jump", code: "document.addEventListener('keydown', jump);", lesson: "Listens for key presses and calls jump()." },
        { id: "k-double", group: "input", choice: "Double jump", code: "document.addEventListener('keydown', doubleJump);", lesson: "Listens for key presses. Press again mid-air to jump twice." },
        { id: "hit", group: "collide", code: "if (overlaps(runner, block)) crash();", lesson: "Compares two element boxes. If they overlap, you crash." },
        { id: "click", group: "start", code: "playBtn.addEventListener('click', start);", lesson: "Finally! The Play button runs start() when clicked." },
        { id: "x-kf", group: "x", decoy: true, code: "@keyframes jump { to { top: 0 } }", why: "CSS animations can move things, but they can't listen to your keyboard. Reacting to input needs JavaScript." },
        { id: "x-fetch", group: "x", decoy: true, code: "await fetch('/api/level-2')", why: "Good instinct, that's the next layer. First the game has to run on its own." }
      ]
    },
    {
      key: "api", n: 4, tech: "APIs", color: "#25a4ff", title: "Connected",
      mission: "Pull live content from a server.",
      brief: "An API lets your page ask a server for data. fetch() sends the request; .json() reads the reply. Level 2 arrives from the server with overhead bars you need to duck.",
      ship: "Save api.js",
      after: "Your page talks to a server now (a mock one here). Watch the Network tab: new level data and a live feed arrived.",
      tryIt: "Level 2: jump the blocks, DUCK (↓ or S) under the dashed bars, and jump for the +2 coins (bonus points, up to +10).",
      play: { level: 2, goal: 420, speed: 320, spawnMs: 1350, labels: ["{json}", "GET", "<ul>", "500"], highLabels: ["<nav>", "menu"] },
      tiles: [
        { id: "fetch", group: "fetch", code: "const res = await fetch('/api/level-2');", lesson: "fetch() sends an HTTP GET request to the server and waits for the reply." },
        { id: "json", group: "json", code: "const level = await res.json();", lesson: "Turns the server's JSON text into a JavaScript object." },
        { id: "duck", group: "duck", code: "document.addEventListener('keydown', e => e.key === 'ArrowDown' && duck());", lesson: "A new key listener: ↓ makes you duck." },
        { id: "feed-board", group: "feed", choice: "Leaderboard", code: "fetch('/api/leaderboard').then(r => r.json()).then(showBoard);", lesson: "A second request fills your sidebar with a live leaderboard." },
        { id: "feed-news", group: "feed", choice: "Dev news", code: "fetch('/api/dev-news').then(r => r.json()).then(showNews);", lesson: "A second request fills your sidebar with web-history headlines." },
        { id: "x-iframe", group: "x", decoy: true, code: "<iframe src=\"level-2.html\">", why: "An iframe embeds a whole page, but it doesn't hand your code any data. To get data, request it with fetch()." },
        { id: "x-local", group: "x", decoy: true, code: "localStorage.getItem('level-2')", why: "localStorage only holds data saved in THIS browser. New levels live on a server, so you fetch them." }
      ]
    },
    {
      key: "responsive", n: 5, tech: "Responsive", color: "#a45ee5", title: "Every screen",
      mission: "Fix your page for phones.",
      brief: "Uh oh, here's your page on a phone: squished columns, no way to tap. A viewport tag and @media rules let one page adapt to any screen.",
      ship: "Save responsive.css",
      after: "Same page, rearranged for a phone. One column, fluid text, and touch buttons that only appear on small screens.",
      tryIt: "Level 3 runs on the phone. Tap Jump/Duck, or keep using the keyboard.",
      phoneFirst: true,
      play: { level: 3, goal: 380, speed: 280, spawnMs: 1400, labels: ["@media", "px", "sm", "md"], highLabels: ["<nav>", "≡"] },
      tiles: [
        { id: "meta", group: "viewport", code: "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", lesson: "Tells phones to use their real screen width instead of pretending to be a desktop." },
        { id: "stack", group: "stack", code: ".layout { grid-template-columns: 1fr; }", lesson: "On small screens, stack the game and sidebar in one column." },
        { id: "clamp", group: "type", code: "h1 { font-size: clamp(1.4rem, 7vw, 2rem); }", lesson: "clamp() lets the heading shrink and grow with the screen, within limits." },
        { id: "touch", group: "touch", code: ".touch { display: flex; }", lesson: "Shows the tap buttons, but only inside this phone-sized @media rule." },
        { id: "x-fixed", group: "x", decoy: true, code: ".layout { width: 1280px; }", why: "A fixed pixel width is exactly what breaks on phones. The page would scroll sideways." },
        { id: "x-msite", group: "x", decoy: true, code: "location = 'https://m.mysite.com'", why: "Separate mobile sites (m.example.com) were the old fix. Responsive CSS adapts ONE page to every screen." }
      ]
    },
    {
      key: "ai", n: 6, tech: "AI + Deploy", color: "#ff5cf0", title: "Ship it",
      mission: "Add an AI coach, then put your site online.",
      brief: "AI can predict what's coming, but it can be wrong, so people add checks. Then one command deploys your site to a real URL.",
      ship: "Deploy",
      after: "Deployed! Your page has an HTTPS address, an AI coach that only speaks when confident, and your best score saved in the browser.",
      tryIt: "Final level, live in production. Follow the pink AI hints and reach the goal.",
      play: { level: 4, goal: 440, speed: 340, spawnMs: 1300, labels: ["??", "AI", "<div/>", "{…}"], highLabels: ["<nav>", "prompt"] },
      tiles: [
        { id: "predict", group: "predict", code: "const hint = await ai.predict(block);", lesson: "Asks a (mock) AI model whether the next block needs a jump or a duck." },
        { id: "guard", group: "guard", code: "if (hint.confidence < 0.6) return;", lesson: "If the AI isn't sure, say nothing. A person decided that rule, not the AI." },
        { id: "save", group: "save", code: "localStorage.setItem('best', score);", lesson: "Saves your best score in this browser, so it's still there after a refresh." },
        { id: "deploy", group: "deploy", code: "$ npm run deploy", lesson: "Builds the site and uploads it to a host. It gets a public HTTPS address." },
        { id: "x-eval", group: "x", decoy: true, code: "eval(aiResponse);", why: "Never run AI output as code without checking it. People review what AI produces." },
        { id: "x-alert", group: "x", decoy: true, code: "alert('Deployed!');", why: "alert() only pops up a box on your screen. It doesn't put your site on the internet." }
      ]
    }
  ];

  const NEWS = [
    "1991: the first web page goes live at CERN.",
    "1996: CSS level 1 becomes a W3C recommendation.",
    "1995: JavaScript is created in 10 days at Netscape.",
    "2015: fetch() starts replacing XMLHttpRequest.",
    "2017: CSS Grid ships in all major browsers."
  ];

  const api = { ASSETS, FILES, SLOTS, STAGES, NEWS };
  root.EVOLVE_LAB_CONTENT = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
