// EVOLVE — content model. Data only; no engine behavior.
// Consumed by game.js via window.EVOLVE_CONTENT.
(function () {
  const eras = [
    {
      at: 0,
      key: 'html',
      title: 'HTML — The First Page',
      message: 'HTML gave the web its structure.',
      accent: '#e34f26',
      bgTop: '#f5efe6',
      bgBottom: '#e8dcc4',
      ground: '#3a3226',
      obstacleTypes: ['brokenLink', 'missingImage', 'tagBlock']
    },
    {
      at: 0,
      key: 'css',
      title: 'CSS — The Style Gate',
      message: 'CSS gave the web its look and layout.',
      accent: '#2965f1',
      bgTop: '#dfe9ff',
      bgBottom: '#a9c3ff',
      ground: '#2a3454',
      obstacleTypes: ['divStack', 'cascadePanel', 'layoutWall']
    },
    {
      at: 1300,
      key: 'js',
      title: 'JavaScript — The DOM Awakens',
      message: 'JavaScript made pages react.',
      accent: '#f7df1e',
      bgTop: '#1c1c22',
      bgBottom: '#3a3410',
      ground: '#0f0f14',
      obstacleTypes: ['movingButton', 'popup', 'glitchNode']
    },
    {
      at: 3100,
      key: 'web2',
      title: 'Web 2.0 — Connected Web',
      message: 'Apps began connecting people, content, and data.',
      accent: '#25a4ff',
      bgTop: '#eaf6ff',
      bgBottom: '#b9def7',
      ground: '#1e3a52',
      obstacleTypes: ['feedCard', 'notification', 'loadingBar']
    },
    {
      at: 4900,
      key: 'responsive',
      title: 'Responsive Web — Mobile Shift',
      message: 'Responsive design made the web work everywhere.',
      accent: '#8e44ad',
      bgTop: '#f2e6fb',
      bgBottom: '#c9a6e6',
      ground: '#2d1a3a',
      obstacleTypes: ['viewportSlab', 'phonePanel', 'mediaBreak']
    },
    {
      at: 6700,
      key: 'cloud',
      title: 'Cloud & Web Apps',
      message: 'The web became a platform for real-time apps.',
      accent: '#00b894',
      bgTop: '#e6fff7',
      bgBottom: '#9ee5cf',
      ground: '#0e2a24',
      obstacleTypes: ['apiPacket', 'dashboard', 'latencyBar']
    },
    {
      at: 8300,
      key: 'ai',
      title: 'AI Web — What Comes Next',
      message: 'AI is changing how we build, but people still shape the web.',
      accent: '#ff5cf0',
      bgTop: '#120821',
      bgBottom: '#3a0f4a',
      ground: '#08040f',
      obstacleTypes: ['ghostUI', 'predictionHazard', 'duplicator']
    }
  ];

  // Canvas assumes player ~44px tall standing, ~26px tall ducking, ground line fixed.
  // 'jump' obstacles sit on the ground; player must clear height.
  // 'duck' obstacles float overhead; player must slide under.
  const obstacles = {
    // HTML
    brokenLink:      { kind: 'jump', label: '<a>',    width: 22, height: 34, color: '#1a4fd6' },
    missingImage:    { kind: 'jump', label: '[img]',  width: 40, height: 40, color: '#8a8a8a' },
    tagBlock:        { kind: 'duck', label: '</>',    width: 46, height: 22, color: '#e34f26' },

    // CSS
    divStack:        { kind: 'jump', label: 'div',    width: 34, height: 46, color: '#2965f1' },
    cascadePanel:    { kind: 'duck', label: '{ }',    width: 60, height: 24, color: '#7aa8ff' },
    layoutWall:      { kind: 'jump', label: 'flex',   width: 28, height: 54, color: '#0a3bb8' },

    // JavaScript
    movingButton:    { kind: 'jump', label: 'click',  width: 44, height: 30, color: '#f7df1e' },
    popup:           { kind: 'duck', label: 'alert!', width: 58, height: 28, color: '#f2b90f' },
    glitchNode:      { kind: 'jump', label: '{}',     width: 26, height: 44, color: '#c9a800' },

    // Web 2.0
    feedCard:        { kind: 'jump', label: 'post',   width: 42, height: 42, color: '#25a4ff' },
    notification:    { kind: 'duck', label: '●1',     width: 34, height: 26, color: '#ff3b3b' },
    loadingBar:      { kind: 'jump', label: '▓▓▓',    width: 56, height: 20, color: '#1e79c9' },

    // Responsive
    viewportSlab:    { kind: 'jump', label: 'sm',     width: 26, height: 50, color: '#8e44ad' },
    phonePanel:      { kind: 'jump', label: '▯',      width: 30, height: 56, color: '#5b2e78' },
    mediaBreak:      { kind: 'duck', label: '@media', width: 68, height: 22, color: '#c9a6e6' },

    // Cloud
    apiPacket:       { kind: 'jump', label: '{ }',    width: 30, height: 30, color: '#00b894' },
    dashboard:       { kind: 'jump', label: '▤',      width: 48, height: 44, color: '#0e7a63' },
    latencyBar:      { kind: 'duck', label: '~ms',    width: 62, height: 20, color: '#3ddcb5' },

    // AI
    ghostUI:         { kind: 'jump', label: '◇',      width: 36, height: 40, color: '#ff5cf0' },
    predictionHazard:{ kind: 'duck', label: '??',     width: 44, height: 26, color: '#b93df0' },
    duplicator:      { kind: 'jump', label: '◆◆',     width: 40, height: 46, color: '#7a1fa8' }
  };

  const chips = [
    { key: 'html',       label: 'HTML',              awardedAt: 0,    color: '#e34f26' },
    { key: 'css',        label: 'CSS',               awardedAt: 0,    color: '#2965f1' },
    { key: 'js',         label: 'JavaScript',        awardedAt: 1300, color: '#f7df1e' },
    { key: 'apis',       label: 'APIs',              awardedAt: 3100, color: '#25a4ff' },
    { key: 'responsive', label: 'Responsive Design', awardedAt: 4900, color: '#8e44ad' },
    { key: 'modern',     label: 'Modern Web',        awardedAt: 6700, color: '#00b894' }
  ];

  // Drop catalog. Each scored era offers at least one build, speed, and bug; some have extra choices.
  // effect ids are dispatched by the engine; drop text is never executed.
  const drops = [
    // CSS
    {
      id: 'css-theme',
      era: 'css',
      kind: 'build',
      syntax: 'display: grid; color: var(--brand)',
      gameplay: 'BLOCKS 18% NARROWER',
      lesson: 'CSS Grid lays out the lane and your prologue color paints it. Styled blocks become narrower and easier to clear.',
      effect: 'theme',
      label: 'Page world'
    },
    {
      id: 'css-boost',
      era: 'css',
      kind: 'speed',
      syntax: 'animation-duration: .7s',
      gameplay: 'SPEED +30% FOR 5S',
      status: 'SPEED +30%',
      lesson: 'animation-duration controls how quickly a CSS animation completes.',
      effect: 'boost',
      duration: 5000,
      label: 'Fast animation'
    },
    {
      id: 'css-clip',
      era: 'css',
      kind: 'bug',
      syntax: 'overflow: hidden',
      gameplay: 'VIEW CLIPPED FOR 4S',
      status: 'VIEW CLIPPED',
      lesson: 'Clipping overflow hides anything that spills past a box — including useful previews.',
      effect: 'clip',
      duration: 4000,
      label: 'overflow: hidden'
    },

    // JavaScript
    {
      id: 'js-buffer',
      era: 'js',
      kind: 'build',
      syntax: "addEventListener('keydown', fn)",
      gameplay: 'SPACE AGAIN = DOUBLE JUMP',
      lesson: 'JS event listeners run on every key press. Press Space again in mid-air to trigger a second jump.',
      effect: 'doubleJump',
      label: 'Double jump'
    },
    {
      id: 'js-boost',
      era: 'js',
      kind: 'speed',
      syntax: 'requestAnimationFrame(step)',
      gameplay: 'SPEED +30% FOR 5S',
      status: 'SPEED +30%',
      lesson: 'rAF schedules work in sync with the display refresh for smoother motion.',
      effect: 'boost',
      duration: 5000,
      label: 'Animation frame'
    },
    {
      id: 'js-glitch',
      era: 'js',
      kind: 'bug',
      syntax: "alert('!')",
      gameplay: 'ALERT OVERLAY + PACE -10% FOR 4S',
      status: 'BLOCKING ALERT · PACE -10%',
      lesson: 'A synchronous alert freezes the page until it is dismissed.',
      effect: 'glitch',
      duration: 4000,
      label: 'Blocking alert'
    },

    // Web 2.0
    {
      id: 'web2-feed',
      era: 'web2',
      kind: 'build',
      syntax: "fetch('/feed')",
      gameplay: 'CATCH BLUE 200S TO CLEAR BLOCKS',
      lesson: 'fetch requests server data without reloading. Catch a 200 response packet to charge a pulse that clears the next obstacle.',
      effect: 'feed',
      label: 'Live responses'
    },
    {
      id: 'web2-boost',
      era: 'web2',
      kind: 'speed',
      syntax: '<script async src>',
      gameplay: 'SPEED +30% FOR 5S',
      status: 'SPEED +30%',
      lesson: 'async scripts download alongside HTML parsing and execute when ready.',
      effect: 'boost',
      duration: 5000,
      label: 'Async script'
    },
    {
      id: 'web2-clutter',
      era: 'web2',
      kind: 'bug',
      syntax: 'Notification.requestPermission()',
      gameplay: 'NOTIFICATIONS BLOCK VIEW FOR 4S',
      status: 'NOTIFICATIONS BLOCK VIEW',
      lesson: 'A permission prompt on arrival is a classic notification-clutter anti-pattern.',
      effect: 'clutter',
      duration: 4000,
      label: 'Notification spam'
    },

    // Responsive
    {
      id: 'responsive-reflow',
      era: 'responsive',
      kind: 'build',
      syntax: '@media (max-width: 640px)',
      gameplay: 'SMALLER PLAYER + S AIR SNAP',
      lesson: 'Media queries reflow the page at narrow widths. The runner shrinks into a phone viewport; press S in mid-air to snap down.',
      effect: 'reflow',
      label: 'Phone layout'
    },
    {
      id: 'responsive-boost',
      era: 'responsive',
      kind: 'speed',
      syntax: 'loading="lazy"',
      gameplay: 'SPEED +30% FOR 5S',
      status: 'SPEED +30%',
      lesson: 'Lazy-loading defers off-screen images so the first view paints faster.',
      effect: 'boost',
      duration: 5000,
      label: 'Lazy images'
    },
    {
      id: 'responsive-clip',
      era: 'responsive',
      kind: 'bug',
      syntax: 'overflow-x: scroll',
      gameplay: 'VIEW CLIPPED FOR 4S',
      status: 'VIEW CLIPPED',
      lesson: 'overflow-x: scroll forces a horizontal scrollbar even when content fits.',
      effect: 'clip',
      duration: 4000,
      label: 'Sideways scroll'
    },
    {
      id: 'responsive-bloat',
      era: 'responsive',
      kind: 'bug',
      slot: 0.85,
      syntax: 'transform: scale(1.17)',
      gameplay: 'HITBOX +17% FOR 5S',
      status: 'OVERSIZED HITBOX',
      lesson: "In CSS, transform: scale(1.17) enlarges the painted pixels but doesn't change the element's layout box. In this run it's a game metaphor: the collision box actually grows, so blocks that used to be a hair's-breadth clear now clip you.",
      effect: 'bloat',
      duration: 5000,
      label: 'Oversized layout'
    },

    // Cloud
    {
      id: 'cloud-cache',
      era: 'cloud',
      kind: 'build',
      syntax: 'cache.put(request, response)',
      gameplay: 'SHIELD ABSORBS NEXT HIT',
      lesson: 'The Cache API stores responses for reuse. Your next collision is absorbed as a CACHED FRAME; the shield recharges after 850 m.',
      effect: 'cache',
      label: 'Cached frame'
    },
    {
      id: 'cloud-boost',
      era: 'cloud',
      kind: 'speed',
      syntax: '<link rel="preconnect">',
      gameplay: 'SPEED +30% FOR 5S',
      status: 'SPEED +30%',
      lesson: 'preconnect warms up DNS, TCP, and TLS before the request is made.',
      effect: 'boost',
      duration: 5000,
      label: 'Preconnect'
    },
    {
      id: 'cloud-latency',
      era: 'cloud',
      kind: 'bug',
      syntax: '504 Gateway Timeout',
      gameplay: 'PACE -22% FOR 4S',
      status: 'PACE -22%',
      lesson: 'An upstream that never answers surfaces to the user as a stalled page.',
      effect: 'latency',
      duration: 4000,
      label: 'Upstream timeout'
    },
    {
      id: 'cloud-gzip',
      era: 'cloud',
      kind: 'buff',
      slot: 0.85,
      syntax: 'Content-Encoding: gzip',
      gameplay: 'BLOCKS 45% NARROWER FOR 6S',
      status: 'GZIP · BLOCKS -45%',
      lesson: 'Content-Encoding: gzip compresses an HTTP response body on the server so the client downloads far fewer bytes and decompresses on the fly — a common speed win. Here it becomes a game metaphor: obstacles temporarily squeeze narrower, easier to clear.',
      effect: 'compress',
      duration: 6000,
      label: 'gzip response'
    },

    // AI
    {
      id: 'ai-predict',
      era: 'ai',
      kind: 'build',
      syntax: "fetch('/api/predict')",
      gameplay: 'GHOST SHOWS NEXT DODGE',
      lesson: 'A model API returns a guess. A ghost runner scouts the next JUMP or DUCK — trust with care, hallucinations happen.',
      effect: 'predict',
      label: 'Future ghost'
    },
    {
      id: 'ai-boost',
      era: 'ai',
      kind: 'speed',
      syntax: '<link rel="prefetch">',
      gameplay: 'SPEED +30% FOR 5S',
      status: 'SPEED +30%',
      lesson: 'Prefetch pulls a likely-next resource during idle time so it feels instant.',
      effect: 'boost',
      duration: 5000,
      label: 'Speculative prefetch'
    },
    {
      id: 'ai-glitch',
      era: 'ai',
      kind: 'bug',
      syntax: '{"prediction":"clear"}',
      gameplay: 'FALSE HINTS + SLOWDOWN FOR 4S',
      status: 'FALSE HINTS + SLOWDOWN',
      lesson: 'Models can produce confident, wrong output; UI should mark generated content.',
      effect: 'glitch',
      duration: 4000,
      label: 'Hallucination'
    }
  ];

  window.EVOLVE_CONTENT = { eras, obstacles, chips, drops };
})();
