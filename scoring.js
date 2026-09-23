(function (root) {
  "use strict";

  const MAX_DISTANCE = 10000;
  const MAX_TIME = 600;

  function scoreRun(distance, elapsedTime) {
    const safeDistance = Math.max(0, Number(distance) || 0);
    const safeTime = Math.max(0, Number(elapsedTime) || 0);
    const finished = safeDistance >= MAX_DISTANCE && safeTime <= MAX_TIME;
    const distanceScore = finished ? MAX_DISTANCE : Math.min(Math.floor(safeDistance), 9999);
    const speedBonus = finished ? Math.floor(((MAX_TIME - safeTime) / MAX_TIME) * 10000) : 0;
    return {
      finished,
      distance: Math.min(safeDistance, MAX_DISTANCE),
      elapsedTime: safeTime,
      distanceScore,
      speedBonus,
      finalScore: distanceScore + speedBonus
    };
  }

  function compareEntries(a, b) {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;
    if (a.finished && a.elapsedTime !== b.elapsedTime) return a.elapsedTime - b.elapsedTime;
    if (!a.finished && a.distance !== b.distance) return b.distance - a.distance;
    if (a.elapsedTime !== b.elapsedTime) return a.elapsedTime - b.elapsedTime;
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  const api = { MAX_DISTANCE, MAX_TIME, scoreRun, compareEntries };
  root.EVOLVE_SCORING = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
