/* wings/room.js: the opening and the room on the theme's own world (rule 12, docs/design/THEME_FRAMEWORK.md).
   This small part loads at boot: OPENINGS (the themes whose opening plays on their GPU world), engineOpening() for splash.js, and the
   loader for the room itself (wings/room-shell.js + styles/room-shell.css, fetched on the first Step inside in Scene Studio).
   The world is the one running behind the app (fx/kit.js TitanFXK): the opening moves its camera through K.setView and touches it with
   K.tap, then hands the same running world to the app as the backdrop. No second canvas, loop or clock. */
(function () {
  "use strict";
  var html = document.documentElement;
  /* a theme is listed here once its opening path (K.themes[id].room.opening) has been looked at on a phone and a desktop */
  var OPENINGS = { supercell: 1, tourbillon: 1, silverscreen: 1, darkroom: 1, canopy: 1, glasshouse: 1, orbit: 1, sahel: 1, nocturne: 1, zen: 1,
    saltflat: 1, lightwell: 1, obsidian: 1, kintsugi: 1, rift: 1, lumen: 1, horizon: 1 };   // ferro: too dark to judge at Low, looked at again later
  function K() { return window.TitanFXK; }
  function motion() {
    var m = html.dataset.motion; if (m === "calm" || m === "off") return m;
    try { if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return "calm"; } catch (e) { /* ignore */ }
    return "full";
  }
  function label(id) { var W = window.TITAN_WORLDS || [], w = W.filter(function (x) { return x.id === id; })[0]; return w ? w.name : id; }
  function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function lerp(a, b, e) { var o = {}; ["yaw", "pitch", "move", "up"].forEach(function (k) { var x = a && a[k] || 0, y = b && b[k] || 0; o[k] = x + (y - x) * e; }); return o; }

  /* a camera path on the running world: O = { dur, from, to, hit, at }. The view goes from -> to over dur seconds (eased), a touch lands
     at screen point `at` after `hit` seconds, onTitle runs at 55 %, onEnd at the end. seek(t, hold) jumps (hold = stay there: tests). */
  function path(O, mode, onTitle, onEnd) {
    var t0 = performance.now(), raf = 0, hit = false, titled = false, done = false, held = false;
    function at(t) {
      var k = Math.max(0, Math.min(1, t / O.dur)), v = lerp(O.from, O.to, ease(k)); v.mode = mode; K().setView(v);
      if (!hit && t >= (O.hit || 0)) { hit = true; if (O.at) K().tap(O.at[0], O.at[1]); }
      if (!titled && t >= O.dur * .55) { titled = true; if (onTitle) onTitle(); }
      if (k >= 1 && !held && !done) { done = true; if (onEnd) onEnd(); return false; }
      return !done;
    }
    function tick(now) { raf = 0; if (held || done) return; if (at((now - t0) / 1000)) raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return {
      seek: function (t, hold) { t0 = performance.now() - t * 1000; held = !!hold; if (t < (O.hit || 0)) hit = false; at(t); if (!held && !raf && !done) raf = requestAnimationFrame(tick); },
      stop: function () { done = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
      get t() { return (performance.now() - t0) / 1000; }
    };
  }

  /* The launch opening (splash.js motion path, when hasOpening(theme)): black at once, the splash goes transparent over the live world,
     the camera path plays, the name comes up, then done() and the app fades in over the same world. If the world is not drawing within
     5 s (slow line, no WebGL2), fallback() runs the theme's separate opening scene instead. */
  var op = null;
  function engineOpening(root, id, done, fallback) {
    var k = null, stopped = false, p = null, w0 = performance.now();
    function cls(on) { html.classList.toggle("ts-engine", on); root.classList.toggle("ts-engine", on); }
    cls(true);
    var dark = document.createElement("div"); dark.className = "ts-engine-dark"; root.appendChild(dark);
    var title = document.createElement("div"); title.className = "ts-engine-title"; title.setAttribute("aria-hidden", "true"); title.textContent = label(id); root.appendChild(title);
    window.__tsFilmUntil = performance.now() + 17000;          // the splash's 7.4 s cap waits for this opening (it ends itself)
    function ready() { k = K(); var d = k && k.debug && k.debug(), R = k && k.room && k.room(id); return !!(d && d.id === id && d.frames > 2 && R && R.opening); }
    function undo() { cls(false); [dark, title].forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); }); }
    function back() { if (k && k.resetView) k.resetView(); html.classList.remove("ts-engine"); root.classList.remove("ts-engine"); setTimeout(function () { html.classList.remove("ts-engine-fade"); }, 1100); }
    (function wait() {
      if (stopped) return;
      if (ready()) return start();
      if (performance.now() - w0 > 5000) { undo(); window.__tsFilmUntil = 0; op = null; stopped = true; fallback(); return; }
      setTimeout(wait, 80);
    })();
    function start() {
      var O = k.room(id).opening; window.__tsFilmUntil = performance.now() + (O.dur + 4) * 1000;
      requestAnimationFrame(function () { dark.style.opacity = "0"; });
      p = path(O, "opening", function () { title.classList.add("on"); }, function () { setTimeout(handoff, 700); });
    }
    function handoff() { if (stopped) return; html.classList.add("ts-engine-fade"); requestAnimationFrame(function () { if (stopped) return; back(); done(); }); }
    op = { id: id, feature: function () {}, get started() { return !!p; },
      seek: function (t, hold) { if (p) p.seek(t, hold); },
      stop: function () { if (stopped) return; stopped = true; if (p) p.stop(); back(); undo(); op = null; } };
    return op;
  }
  /* splash.js asks this before fx/kit.js has loaded (the kit comes at the end of the page), so only the list, the motion level and
     WebGL2 are checked here; engineOpening waits for the world itself */
  function hasOpening(id) { return !!(OPENINGS[id] && motion() === "full" && window.WebGL2RenderingContext); }

  /* ============================== the room (wings/room-shell.js, loaded on first use) ============================== */
  var loading = null;
  function shell() {
    if (window.TitanRoomShell) return Promise.resolve(window.TitanRoomShell);
    if (!loading) loading = new Promise(function (res, rej) {
      var s = document.querySelector('script[src*="wings/room.js"]'), q = s && /\?v=[^&]+/.exec(s.src), v = q ? q[0] : "";
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "styles/room-shell.css" + v; document.head.appendChild(l);
      var sc = document.createElement("script"); sc.src = "wings/room-shell.js" + v;
      sc.onload = function () { res(window.TitanRoomShell); }; sc.onerror = function (e) { loading = null; rej(e); }; document.head.appendChild(sc); });
    return loading;
  }
  function open() { return shell().then(function (S) { return S.open({ path: path, label: label, motion: motion }); }); }

  window.TitanRoom = {
    OPENINGS: OPENINGS, hasOpening: hasOpening, engineOpening: engineOpening, path: path, open: open,
    close: function () { var c = window.TitanRoomShell && window.TitanRoomShell.current(); if (c) c.close(); },
    current: function () { return window.TitanRoomShell ? window.TitanRoomShell.current() : null; },
    op: function () { return op; }
  };
})();
