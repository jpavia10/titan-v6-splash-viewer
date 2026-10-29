/* fx/themes.js: which shared effects each theme uses, and how (Grok theme-rebuild worker). Keyed by the registry id
   (wings/themes/manifest.js); comments name the theme by its display name. Every entry is a stack drawn back to front. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var T = K.themes;
  /* Neon Vault (neon): a rain-slick neon-noir street at 2 a.m. Tubes on a facade buzz and flicker, their light smears down the wet
     asphalt, rain rings break the puddles, fog drifts through lit by the signs, rain falls in two depths; touch = a lit splash. */
  T.neon = { stack: [
    { mod: "atmos", top: [.03, .018, .06], bottom: [.008, .006, .016], signs: 1.25, wet: 1.2, horizon: .34, rain: 1,
      signC: [[1, .22, .66], [.15, .88, 1], [.62, .35, 1], [1, .62, .2]], fog: .25, fogC: [.05, .035, .08], vig: .4, grain: 0, touchGlow: .8, touchC: [.3, .9, 1] },
    /* v2: real raymarched smoke between the signs and the camera, lit by a hot-pink sign light that follows your drag */
    { mod: "volume", steps: 40, density: .55, scale: 2.4, speed: .09, color: [.75, .7, 1], light: [1, .3, .7], lightAt: [.3, .62], lightPow: 1.3, follow: true, ambient: [.02, .03, .06], low: .7, res: .5 },
    { mod: "particles", count: .14, shape: "streak", size: 10, gravity: 1.3, drift: [-.14, 0], curl: .3, scale: 1, speed: .1, life: .5, spawn: "top",
      c1: [.6, .8, 1], c2: [1, .55, .9], alpha: .1, blend: "add", depth: .9, rake: .25 },
    { mod: "particles", count: .02, shape: "mote", size: 5, gravity: .02, curl: 1, scale: 1.5, speed: .03, life: .05,
      c1: [.2, .9, 1], c2: [1, .3, .7], alpha: .25, blend: "add", depth: 1, glint: .5 },
    { mod: "post", bloom: 1.25, threshold: .55, knee: .4, exposure: 1.15, aberr: .45, grain: .03, vig: .45, trails: .35 }
  ] };
})();
/* "fxk": an empty TitanFX preset for themes whose whole scene is drawn by TitanFXK (the registry needs every theme's fx to exist).
   It paints nothing and holds still, so the engine's overlay costs ~nothing on top of the fx/ scene. */
document.addEventListener("DOMContentLoaded", function () {
  var FX = window.TitanFX; if (FX && FX.register && !(FX.presets && FX.presets().indexOf("fxk") >= 0))
    FX.register("fxk", { layer: "back", still: 1, safe: 1, fps: 1, glsl: "", passes: [{ frag: "vec4 fx(vec2 fc){ return vec4(0.); }" }] });
});
