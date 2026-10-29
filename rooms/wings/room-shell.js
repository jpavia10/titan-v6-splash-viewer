/* wings/room-shell.js: the theme's room (rule 12 b; docs/design/THEME_FRAMEWORK.md, slot 5). Loaded by wings/room.js on the first
   Step inside (Scene Studio). One shell for every theme: the live world fills the screen and the collection is hidden. You look around
   (drag), move (pinch, the wheel or the Move slider), lift (Height), touch the world (a short tap), tilt the phone, and play with the
   theme's own look controls and sound. A theme on the GPU kit brings its room data (K.themes[id].room: limits, look controls, touch,
   sound, opening); any other theme gets the basic room (its TitanFX effect: strength, film, a moment). Close: ✕, Escape or Back;
   the world goes back to the backdrop view and the effect settings to what they were. */
(function () {
  "use strict";
  var html = document.documentElement, cur = null;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function fmt(x) { return Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(2).replace(/\.?0+$/, "") || "0"; }

  /* a page without the app's audio bridge (the test site) drives the sound engine itself */
  function direct() {
    var T = window.TitanScape; if (!T) return null;
    return { map: {}, take: function (id) { try { if (T.unlock) T.unlock(); } catch (e) { /* ignore */ } T.play(id); return Promise.resolve(T); },
      release: function () { T.stop(); }, set: function (k, v) { T.setParam(k, v); }, layers: function () { return T.layers(); }, setLayer: function (id, g) { T.setLayer(id, g); } };
  }
  function open(lib) {
    if (cur) return cur;
    var id = html.dataset.atmo, K = window.TitanFXK, d = K && K.debug ? K.debug() : {}, R = d.id === id && K.room ? K.room(id) : null;
    var FX = window.TitanFX, fx0 = FX && FX.state ? FX.state() : null, scape = window.TitanScapeApp || direct(), took = false, before = document.activeElement;
    var v = { yaw: 0, pitch: 0, move: 0, up: 0, look: {} }, tilt = { yaw: 0, pitch: 0, b0: null, g0: null, on: false }, playing = null;
    if (R) (R.look || []).forEach(function (c) { v.look[c.id] = c.def; });

    var box = el("div", "troom"); box.id = "troom"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", lib.label(id) + ": the room");
    var top = el("div", "troom-top"), nm = el("div", "troom-name"); nm.appendChild(el("b", "", lib.label(id)));
    nm.appendChild(el("span", "", R ? R.name : "Inside the theme")); top.appendChild(nm);
    var x = el("button", "troom-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Leave the room"); top.appendChild(x);
    var hint = el("p", "troom-hint", (R && R.touch ? R.touch + " " : "") + (R ? "Drag to look around, pinch to move." : "Tap for a moment of the effect."));
    var title = el("div", "troom-title"); title.setAttribute("aria-hidden", "true"); title.textContent = lib.label(id);
    var bar = el("div", "troom-bar"), panel = el("div", "troom-panel"); panel.hidden = true;
    box.appendChild(top); box.appendChild(title); box.appendChild(hint); box.appendChild(panel); box.appendChild(bar);

    /* ---------- the view ---------- */
    function push() {
      if (!R) return;
      var s = K.setView({ mode: "room", yaw: v.yaw + tilt.yaw, pitch: v.pitch + tilt.pitch, move: v.move, up: v.up, look: v.look });
      if (!tilt.yaw && !tilt.pitch) { v.yaw = s.yaw; v.pitch = s.pitch; }          // a drag past a limit does not pile up
      v.move = s.move; v.up = s.up;
      try { if (window.TitanScape && TitanScape.face) TitanScape.face(s.yaw, s.pitch); } catch (e) { /* no sound yet */ }
      box.style.setProperty("--tx", (s.yaw / Math.PI).toFixed(3)); box.style.setProperty("--ty", (s.pitch * 2).toFixed(3));
      sync();
    }

    /* ---------- gestures: one finger looks, two fingers pinch to move, a short tap reaches the world ---------- */
    var pts = {}, down = null, pinch0 = 0, move0 = 0;
    function onPanel(e) { return panel.contains(e.target) || bar.contains(e.target) || top.contains(e.target); }
    box.addEventListener("pointerdown", function (e) {
      if (onPanel(e)) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }; try { box.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      var ids = Object.keys(pts);
      if (ids.length === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), yaw: v.yaw, pitch: v.pitch, far: false };
      else if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); move0 = v.move; if (down) down.far = true; }
      hint.style.opacity = "0";
    });
    box.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length >= 2 && R) { var a = pts[ids[0]], b = pts[ids[1]], dd = Math.hypot(a.x - b.x, a.y - b.y);
        var span = (R.move[1] - R.move[0]) || 1; v.move = move0 + (dd - pinch0) / Math.min(innerWidth, innerHeight) * span * .8; push(); return; }
      if (!down || !R) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) down.far = true;
      v.yaw = down.yaw - dx / innerWidth * 2.4; v.pitch = down.pitch + dy / innerHeight * 1.4; push();
    });
    function up(e) {
      if (!pts[e.pointerId]) return; delete pts[e.pointerId];
      if (down && !down.far && !Object.keys(pts).length && performance.now() - down.t < 400) {
        if (R) K.tap(e.clientX / innerWidth, 1 - e.clientY / innerHeight); else if (FX && FX.moment) FX.moment();
      }
      if (!Object.keys(pts).length) down = null;
    }
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("wheel", function (e) { if (!R || onPanel(e)) return; e.preventDefault(); v.move -= e.deltaY * .004 * ((R.move[1] - R.move[0]) || 1) / 4; push(); }, { passive: false });

    /* ---------- the phone's tilt adds a little look on top of the drag ---------- */
    function onTilt(e) { if (!R || e.beta == null) return; if (tilt.b0 == null) { tilt.b0 = e.beta; tilt.g0 = e.gamma; }
      tilt.yaw = -Math.max(-25, Math.min(25, e.gamma - tilt.g0)) * .008; tilt.pitch = Math.max(-25, Math.min(25, e.beta - tilt.b0)) * .006; push(); }
    function tiltOn() { if (tilt.on) return; tilt.on = true; addEventListener("deviceorientation", onTilt); }
    var DOE = window.DeviceOrientationEvent, needAsk = DOE && typeof DOE.requestPermission === "function";
    if (R && DOE && !needAsk && matchMedia("(pointer: coarse)").matches) tiltOn();

    /* ---------- panels: Look, Sound, Opening ---------- */
    var rows = [];
    function slider(label, min, max, step, get, set) {
      var r = el("label", "troom-row"), s = el("input"), o = el("output");
      s.type = "range"; s.min = min; s.max = max; s.step = step; s.value = get(); o.textContent = fmt(+s.value);
      s.addEventListener("input", function () { set(+s.value); o.textContent = fmt(+s.value); });
      r.appendChild(el("span", "", label)); r.appendChild(s); r.appendChild(o); rows.push({ s: s, o: o, get: get }); return r;
    }
    function sync() { rows.forEach(function (r) { if (document.activeElement !== r.s) { r.s.value = r.get(); r.o.textContent = fmt(+r.get()); } }); }
    function btn(label, fn) { var b = el("button", "", label); b.type = "button"; b.addEventListener("click", fn); return b; }
    var tabs = {};
    function tab(name, build) {
      var b = el("button", "", name); b.type = "button"; b.setAttribute("aria-pressed", "false"); bar.appendChild(b); tabs[name] = b;
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute("aria-pressed", "false"); });
        panel.innerHTML = ""; rows = []; panel.hidden = !on; if (!on) return;
        b.setAttribute("aria-pressed", "true"); build(panel);
      });
    }
    tab("Look", function (p) {
      if (R) {
        (R.look || []).forEach(function (c) { p.appendChild(slider(c.label, c.min, c.max, (c.max - c.min) / 100, function () { return v.look[c.id]; },
          function (x) { v.look[c.id] = x; push(); if (c.scape && scape && took) scape.set(c.scape, x); })); });
        var u = R.unit ? " (" + R.unit + ")" : "";
        p.appendChild(slider("Move" + u, R.move[0], R.move[1], (R.move[1] - R.move[0]) / 100, function () { return v.move; }, function (x) { v.move = x; push(); }));
        p.appendChild(slider("Height" + u, R.up[0], R.up[1], ((R.up[1] - R.up[0]) || 1) / 100, function () { return v.up; }, function (x) { v.up = x; push(); }));
        var bs = el("div", "troom-btns");
        bs.appendChild(btn("Back to the start", function () { v.yaw = v.pitch = v.move = v.up = 0; (R.look || []).forEach(function (c) { v.look[c.id] = c.def; }); push(); }));
        if (needAsk && !tilt.on) bs.appendChild(btn("Use the phone's tilt", function () { DOE.requestPermission().then(function (s) { if (s === "granted") tiltOn(); }).catch(function () {}); }));
        p.appendChild(bs);
      } else if (FX && fx0) {
        p.appendChild(slider("Effect strength", 0, 1, .01, function () { return FX.state().intensity; }, function (x) { FX.setIntensity(x); }));
        if (fx0.film != null) p.appendChild(slider("Film", 0, 1, .01, function () { return FX.state().film; }, function (x) { FX.setFilm(x); }));
        var b2 = el("div", "troom-btns"); b2.appendChild(btn("A moment", function () { if (FX.moment) FX.moment(); })); p.appendChild(b2);
        p.appendChild(el("p", "troom-note", "This theme's own world is still to come; this is its effect on its own."));
      }
    });
    tab("Sound", function (p) {
      if (!scape || !(R && R.sound || scape.map[id])) { p.appendChild(el("p", "troom-note", "This theme has no soundscape yet.")); return; }
      function list() {
        (scape.layers() || []).forEach(function (L) { p.appendChild(slider(L.label || L.id, 0, 2, .02, function () { var a = scape.layers().filter(function (y) { return y.id === L.id; })[0]; return a ? a.gain : 1; },
          function (g) { scape.setLayer(L.id, g); })); });
      }
      if (took) return list();
      var bs = el("div", "troom-btns"); p.appendChild(bs);
      bs.appendChild(btn("▶ Play the room's sound", function () {
        took = true; scape.take(R && R.sound || scape.map[id]).then(function () {
          if (R) (R.look || []).forEach(function (c) { if (c.scape) scape.set(c.scape, v.look[c.id]); });
          push(); bs.remove(); setTimeout(list, 400);
        }).catch(function () { took = false; bs.replaceChildren(el("p", "troom-note", "Sound could not start here.")); });
      }));
    });
    if (R && R.opening && lib.motion() !== "off") tab("Opening", function (p) {
      p.appendChild(el("p", "troom-note", "The opening of this theme, on this same world."));
      var bs = el("div", "troom-btns"); p.appendChild(bs);
      bs.appendChild(btn("▶ Play the opening", function () {
        panel.hidden = true; tabs.Opening.setAttribute("aria-pressed", "false"); title.classList.remove("on");
        if (playing) playing.stop();
        playing = lib.path(R.opening, "room", function () { title.classList.add("on"); }, function () {
          playing = null; var s = window.TitanFXK.view; v.yaw = s.yaw; v.pitch = s.pitch; v.move = s.move; v.up = s.up; setTimeout(function () { title.classList.remove("on"); }, 1800); });
      }));
    });

    /* ---------- open / close ---------- */
    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }
    function onPop() { if (cur) close(true); }
    function close(fromPop) {
      if (!cur) return; cur = null;
      if (playing) playing.stop();
      removeEventListener("keydown", onKey, true); removeEventListener("popstate", onPop); removeEventListener("deviceorientation", onTilt);
      if (R && K.resetView) K.resetView();
      if (FX && fx0) { try { FX.setIntensity(fx0.intensity); if (fx0.film != null) FX.setFilm(fx0.film); FX.setTextSafe(.85); } catch (e) { /* ignore */ } }
      if (took && scape) scape.release();
      html.classList.remove("tr-room"); if (box.parentNode) box.parentNode.removeChild(box);
      if (!fromPop && history.state && history.state.troom) history.back();
      try { if (before && before.focus) before.focus(); } catch (e) { /* ignore */ }
    }
    document.body.appendChild(box); html.classList.add("tr-room");
    if (FX && FX.setTextSafe) FX.setTextSafe(0);                           // nothing to keep readable: the whole effect, undimmed
    addEventListener("keydown", onKey, true);
    try { history.pushState({ troom: 1 }, "", location.href); addEventListener("popstate", onPop); } catch (e) { /* ignore */ }
    push(); x.addEventListener("click", function () { close(); }); x.focus();
    cur = { id: id, kit: !!R, close: function () { close(); }, get view() { return JSON.parse(JSON.stringify(v)); }, el: box,
      set: function (o) { Object.keys(o || {}).forEach(function (k) { if (k === "look") Object.keys(o.look).forEach(function (j) { v.look[j] = o.look[j]; }); else v[k] = o[k]; }); push(); return K && K.view; } };
    return cur;
  }
  window.TitanRoomShell = { open: open, current: function () { return cur; } };
})();
