/* Titan Reliquary rooms: the shell around a theme's live world (Claude, 2026-10-29; plan: notes/agents/depth-upgrade.md in the app repo).
   The world is the app's own (fx/kit.js + fx/{id}.js, copied by tools/rooms/sync_test_site.sh). The shell only moves its camera
   (TitanFXK.view: yaw, pitch, move, up), sets its look controls (view.look), passes short taps to it (TitanFXK.tap) and turns the
   soundscape's listener with the camera (TitanScape.face), so the sounds stay where they are in the room.
   Drag = look, pinch or scroll = move, tap = touch the world, tilt the phone = look (optional). */
(function () {
  "use strict";
  var K = window.TitanFXK, TS = window.TitanScape, root = document.documentElement, W = root.dataset.atmo;
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = { supercell: "Supercell", tourbillon: "Tourbillon", silverscreen: "Silver Screen", obsidian: "Obsidian Sun" };
  var V = K.view; V.mode = "room";
  var R = null, cam = { yaw: 0, pitch: 0, move: 0, up: 0 }, vel = { yaw: 0, pitch: 0 }, tilt = { yaw: 0, pitch: 0, b0: null, g0: null };
  var store = (function () { try { return JSON.parse(localStorage.getItem("tr_room_" + W) || "{}"); } catch (e) { return {}; } })();
  store.look = store.look || {};
  function save() { try { localStorage.setItem("tr_room_" + W, JSON.stringify(store)); } catch (e) { /* private mode */ } }
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var tier = (function () { try { return localStorage.getItem("tr_quality") || "high"; } catch (e) { return "high"; } })();

  $("rname").textContent = $("dname").textContent = NAMES[W] || W;

  /* ---------- the world's room data (arrives with the lazy-loaded world script) ---------- */
  (function wait() {
    var th = K.themes[W];
    if (!th || !th.room) { setTimeout(wait, 80); return; }
    R = th.room; $("dtheme").textContent = R.name || "Theme room"; $("dtouch").textContent = R.touch || "";
    (R.look || []).forEach(function (L) { V.look[L.id] = store.look[L.id] == null ? L.def : store.look[L.id]; });
    if (!R.opening) $("open").hidden = $("enter-open").hidden = true;
  })();

  /* ---------- sound ---------- */
  var soundOn = !(TS && TS.muted), started = false;
  function startSound() { if (!TS || !R || !R.sound || started) return; started = true; TS.unlock(); TS.play(R.sound);
    (R.look || []).forEach(function (L) { if (L.scape) TS.setParam(L.scape, V.look[L.id]); }); }
  $("snd").onclick = function () { soundOn = !soundOn; if (TS) { TS.setMuted(!soundOn); if (soundOn) startSound(); }
    this.setAttribute("aria-pressed", String(soundOn)); this.textContent = soundOn ? "Sound on" : "Sound off"; };
  if (!TS) $("snd").hidden = true; else if (!soundOn) { $("snd").setAttribute("aria-pressed", "false"); $("snd").textContent = "Sound off"; }

  /* ---------- the door ---------- */
  function enter(withOpening) { $("door").classList.add("out"); if (soundOn) startSound(); if (withOpening) opening(); else hint(); }
  $("enter").onclick = function () { enter(false); }; $("enter-open").onclick = function () { enter(true); };
  var hintT = 0;
  function hint() { if (store.seen) return; store.seen = 1; save(); var h = $("hint");
    h.textContent = "Drag to look around · pinch or scroll to move · " + (R && R.touch ? R.touch.split(":")[0].toLowerCase() : "tap to touch it");
    h.classList.add("on"); clearTimeout(hintT); hintT = setTimeout(function () { h.classList.remove("on"); }, 5200); }

  /* ---------- input: drag looks, pinch moves, a short tap touches the world ---------- */
  var pts = {}, drag = null, pinch = null, lastMove = 0;
  var T = $("touch");
  function range(k, d) { return R && R[k] || d; }
  T.addEventListener("pointerdown", function (e) { e.stopPropagation(); T.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length === 1) drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: 0 };
    if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: cam.move }; drag = null; } });
  T.addEventListener("pointermove", function (e) { e.stopPropagation(); var p = pts[e.pointerId]; if (!p) return; p.x = e.clientX; p.y = e.clientY;
    var ids = Object.keys(pts);
    if (pinch && ids.length >= 2) { var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), M = range("move", [-2, 6]);
      cam.move = clamp(pinch.m + (d - pinch.d) / Math.min(innerWidth, innerHeight) * (M[1] - M[0]) * .8, M[0], M[1]); return; }
    if (!drag || opening.on) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y, s = 2.4 / Math.max(innerWidth, innerHeight); drag.x = e.clientX; drag.y = e.clientY;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
    cam.yaw -= dx * s; cam.pitch += dy * s * .8; vel.yaw = -dx * s; vel.pitch = dy * s * .8; lastMove = performance.now(); });
  function up(e) { e.stopPropagation(); var d = drag; delete pts[e.pointerId];
    if (Object.keys(pts).length < 2) pinch = null;
    if (d && d.moved < 9 && performance.now() - d.t < 400) { if (opening.on) { opening.skip(); return; } K.tap(e.clientX / innerWidth, 1 - e.clientY / innerHeight); vel.yaw = vel.pitch = 0; }
    if (performance.now() - lastMove > 60) vel.yaw = vel.pitch = 0;
    drag = null; }
  T.addEventListener("pointerup", up); T.addEventListener("pointercancel", up);
  T.addEventListener("wheel", function (e) { e.preventDefault(); var M = range("move", [-2, 6]); cam.move = clamp(cam.move - e.deltaY * .0025 * (M[1] - M[0]) / 4, M[0], M[1]); }, { passive: false });
  addEventListener("keydown", function (e) { var k = e.key, s = .06, M = range("move", [-2, 6]);
    if (k === "ArrowLeft") cam.yaw -= s; else if (k === "ArrowRight") cam.yaw += s; else if (k === "ArrowUp") cam.pitch += s * .7; else if (k === "ArrowDown") cam.pitch -= s * .7;
    else if (k === "+" || k === "=") cam.move = clamp(cam.move + .4, M[0], M[1]); else if (k === "-") cam.move = clamp(cam.move - .4, M[0], M[1]); });

  /* tilt the phone to look (Android: no prompt; iOS asks once, from a tap) */
  function onTilt(e) { if (!store.tilt || e.beta == null) return; if (tilt.b0 == null) { tilt.b0 = e.beta; tilt.g0 = e.gamma; }
    tilt.yaw = clamp((e.gamma - tilt.g0) * Math.PI / 180 * .7, -.4, .4); tilt.pitch = clamp(-(e.beta - tilt.b0) * Math.PI / 180 * .5, -.25, .25); }
  addEventListener("deviceorientation", onTilt);
  function setTilt(on) { store.tilt = on ? 1 : 0; save(); tilt.b0 = null; tilt.yaw = tilt.pitch = 0;
    if (on && window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(function () { /* refused */ }); }

  /* ---------- the opening: the same world, a camera move, a touch, the name ---------- */
  function opening() { if (!R || !R.opening || opening.on) return; var O = R.opening, t0 = performance.now(), hit = false;
    opening.on = true; document.body.classList.add("opening"); $("panel").hidden = true; dockState(null); vel.yaw = vel.pitch = 0;
    var dark = $("dark"); dark.style.transition = "none"; dark.style.opacity = "1"; dark.getBoundingClientRect(); dark.style.transition = ""; dark.style.opacity = "0";
    var ease = function (x) { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
    var held = null;
    opening.step = function (now) { var t = held == null ? (now - t0) / 1000 : held, k = ease(t / O.dur);
      ["yaw", "pitch", "move", "up"].forEach(function (n) { cam[n] = O.from[n] + (O.to[n] - O.from[n]) * k; });
      if (!hit && t >= O.hit) { hit = true; K.tap(O.at[0], O.at[1]); setTimeout(function () { $("title").classList.add("on"); }, 260); }
      if (t > O.dur + 2.2) opening.end(); };
    opening.end = function () { opening.on = false; opening.step = null; $("title").classList.remove("on"); document.body.classList.remove("opening"); hint(); };
    opening.seek = function (t, hold) { t0 = performance.now() - t * 1000; held = hold ? t : null; };   // for tests: hold freezes the opening's clock
    opening.skip = function () { ["yaw", "pitch", "move", "up"].forEach(function (n) { cam[n] = O.to[n]; }); opening.end(); }; }
  $("open").onclick = function () { opening(); };

  /* ---------- panels ---------- */
  var P = $("panel"), open = null;
  function dockState(id) { open = id; document.querySelectorAll("#dock [data-p]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.p === id)); }); }
  function slider(label, val, min, max, step, fmt, on) { var r = document.createElement("div"), id = "s" + Math.random().toString(36).slice(2, 8);
    r.className = "row"; r.innerHTML = '<label for="' + id + '"></label><output></output><input id="' + id + '" type="range">';
    r.querySelector("label").textContent = label; var i = r.querySelector("input"), o = r.querySelector("output");
    i.min = min; i.max = max; i.step = step; i.value = val; o.textContent = fmt(+val);
    i.oninput = function () { o.textContent = fmt(+i.value); on(+i.value); }; return r; }
  var pct = function (v) { return Math.round(v * 100) + " %"; };
  function chip(label, pressed, on) { var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", String(!!pressed)); b.onclick = on; return b; }
  function show(id) {
    if (open === id || !R) { P.hidden = true; dockState(null); return; }
    dockState(id); P.innerHTML = ""; P.hidden = false; var h = document.createElement("h2"), p = document.createElement("p"); P.appendChild(h); P.appendChild(p);
    if (id === "look") { h.textContent = "Look"; p.textContent = "The room's own controls. They are kept for next time.";
      var seg = document.createElement("div"); seg.className = "seg";
      seg.appendChild(chip("Move with the phone", store.tilt, function () { setTilt(!store.tilt); this.setAttribute("aria-pressed", String(!!store.tilt)); }));
      seg.appendChild(chip("Back to the view", false, function () { cam.yaw = cam.pitch = cam.move = 0; cam.up = 0; vel.yaw = vel.pitch = 0; }));
      seg.appendChild(chip("Defaults", false, function () { (R.look || []).forEach(function (L) { V.look[L.id] = L.def; delete store.look[L.id]; if (L.scape && TS && started) TS.setParam(L.scape, L.def); }); save(); open = null; show("look"); }));
      P.appendChild(seg);
      (R.look || []).forEach(function (L) { P.appendChild(slider(L.label, V.look[L.id], L.min, L.max, (L.max - L.min) / 100, pct, function (v) {
        V.look[L.id] = v; store.look[L.id] = v; save(); if (L.scape && TS && started) TS.setParam(L.scape, v); })); });
      if (R.up) P.appendChild(slider("Height", cam.up, R.up[0], R.up[1], (R.up[1] - R.up[0]) / 100, function (v) { return v.toFixed(1) + (R.unit ? " " + R.unit : ""); }, function (v) { cam.up = v; }));
    }
    if (id === "sound") { h.textContent = "Sound"; p.textContent = TS ? "Every sound has its place in the room: turn and it stays where it is." : "No sound engine.";
      if (!TS) return; if (!started && soundOn) startSound();
      P.appendChild(slider("Volume", TS.volume, 0, 1, .01, pct, function (v) { TS.setVolume(v); }));
      setTimeout(function () { TS.layers().forEach(function (L) { P.appendChild(slider(L.label, L.gain == null ? 1 : L.gain, 0, 2, .01, pct, function (v) { TS.setLayer(L.id, v); })); }); }, 60); }
    if (id === "quality") { h.textContent = "Quality"; p.textContent = "Higher looks better and works the phone harder. The page reloads to switch.";
      var s2 = document.createElement("div"); s2.className = "seg";
      ["low", "medium", "high", "max"].forEach(function (q) { s2.appendChild(chip(q[0].toUpperCase() + q.slice(1), q === tier, function () {
        try { localStorage.setItem("tr_quality", q); } catch (e) { /* private mode */ } location.reload(); })); });
      P.appendChild(s2); }
  }
  document.querySelectorAll("#dock [data-p]").forEach(function (b) { b.onclick = function () { show(b.dataset.p); }; });
  function dockH() { root.style.setProperty("--dock-h", $("dock").getBoundingClientRect().height + "px"); }
  dockH(); addEventListener("resize", dockH);

  /* ---------- the loop: inertia, limits, the view, the listener, the planes ---------- */
  var fps = 60, last = performance.now(), faceAt = 0, st = $("stat");
  (function loop(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; fps = fps * .95 + (1 / Math.max(dt, 1e-3)) * .05;
    if (opening.step) opening.step(now);
    else if (!drag) { cam.yaw += vel.yaw; cam.pitch += vel.pitch; vel.yaw *= .92; vel.pitch *= .92; }
    var Y = range("yaw", [-1, 1]), Pi = range("pitch", [-.2, .5]);
    if (!opening.on) { cam.yaw = clamp(cam.yaw, Y[0], Y[1]); cam.pitch = clamp(cam.pitch, Pi[0], Pi[1]); }
    V.yaw = cam.yaw + tilt.yaw; V.pitch = clamp(cam.pitch + tilt.pitch, Pi[0] - .1, Pi[1] + .1); V.move = cam.move; V.up = cam.up;
    if (TS && started && now - faceAt > 50) { faceAt = now; TS.face(V.yaw, V.pitch); }
    root.style.setProperty("--px", (V.yaw / Math.max(.3, Y[1])).toFixed(3)); root.style.setProperty("--py", (V.pitch / Math.max(.3, Pi[1])).toFixed(3));
    if ((now / 500 | 0) !== ((now - dt * 1000) / 500 | 0)) st.textContent = tier.toUpperCase() + " · " + Math.round(fps) + " fps";
    requestAnimationFrame(loop);
  })(performance.now());

  window.TitanRoom = { cam: cam, opening: opening, show: show };   // for tests
})();
