/* fx/horizon.js: Event Horizon (horizon), theme #38, on the TitanFXK kit (Grok, 2026-10-20).
   Built from the shared "blackhole" scene in fx/scenes-nms.js (owner: use existing effects, "bloat it in"): a black hole with
   geodesic-bent light, a Keplerian accretion disk with temperature ramp and relativistic beaming (one side brighter), an Einstein
   ring, and a lensed starfield and nebula behind it. Added for this theme: two layers of infalling dust (fine glints and slow
   embers) drifting in on curl noise, and a heavier post grade (wide bloom, lens aberration, film grain, deep vignette).
   Touch: drag orbits the camera around the hole, hold leans in toward the horizon, tap sends a flare around the disk.
   Quality: the scene reads K.tier() (Low/Medium/High/Ultra/Max; user-chosen, never lowered automatically) for ray steps;
   dust counts scale with the same tier here. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var q = function () { return K.tier ? K.tier() : .85; };
  K.themes.horizon = { stack: [
    { mod: "scene", kind: "blackhole" },
    { mod: "particles", count: .0025 * q(), shape: "dot", size: 1.3, curl: .7, scale: 2.2, speed: .015, life: .05, c1: [1, .85, .65], c2: [.7, .8, 1], alpha: .22, blend: "add", glint: .8, rake: .4 },
    { mod: "particles", count: .0005 * q(), shape: "mote", size: 5, curl: 1.1, scale: 1.4, speed: .02, life: .08, c1: [1, .55, .2], c2: [1, .8, .5], alpha: .35, blend: "add", depth: .6, glint: 1, rake: .6 },
    { mod: "post", bloom: 1.25, threshold: .7, knee: .5, exposure: 1.1, aberr: .35, grain: .03, vig: .6, trails: .1 }
  ],
    // the room: the shared scene pans and zooms (screen heights; a phone is only ~.46 wide); your own drag still orbits the hole
    room: { name: "At the event horizon", yaw: [-.15, .15], pitch: [-.15, .15], move: [-.4, .9], up: [-.06, .06], unit: "screen", sound: "blackhole",
      look: [{ id: "speed", label: "Time", min: .2, max: 3, def: 1 }],
      touch: "Tap: a flare runs around the accretion disk; drag orbits the camera, hold leans in toward the horizon.",
      opening: { dur: 5.2, from: { yaw: .06, pitch: -.05, move: -.4, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3, at: [.5, .5] } } };
})();
