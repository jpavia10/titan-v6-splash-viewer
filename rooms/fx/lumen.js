/* fx/lumen.js: Lumen Circuit (lumen), theme #35, on the TitanFXK kit (Grok theme-37-50 worker, 2026-10-20; file owner).
   Owner: "Tron VIBE: a dark grid world, light-cycle trails, glowing circuitry edges and a synth score", 100% original.
   A real 3D scene, not a flat backdrop: a perspective camera glides low over an endless mirror-black grid plain toward a horizon of
   glowing ridgelines. Light runners (8 AI + yours) race the grid lanes, turning 90 degrees at intersections, each leaving a wall
   of light behind it. The walls are real geometry, rebuilt every frame from a CPU lane simulation, drawn additively with a hot top
   edge, translucent body and scan shimmer, and mirrored in the glossy floor (a second pass, y flipped, dimmed, rippled). The
   runners' heads throw coloured light pools on the floor (8 point lights in the floor shader). HDR into fx/post.js
   (bloom, aberration, ACES).
   Signature move: touch to launch YOUR runner (amber) onto the lane under your finger; swipe left/right to turn it 90 degrees;
   hold to boost (faster, hotter trail, the camera leans). Reduced motion: the kit draws one still frame. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function persp(f, a, n, fa) { var t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]; }
  function lookMatrix(e, c, u) {
    var z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]], l = Math.hypot(z[0], z[1], z[2]); z = z.map(function (v) { return v / l; });
    var x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; l = Math.hypot(x[0], x[1], x[2]); x = x.map(function (v) { return v / l; });
    var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
  }
  function mul(a, b) { var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function inv(m) {   // general 4x4 inverse (for the floor shader's camera rays)
    var a = m, o = new Array(16), b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6],
      b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    var d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
    return o;
  }
  /* Quality tier (owner: Low / Medium / High / Max, chosen by the user, never lowered automatically). Reads the app-wide setting
     (window.TitanQuality.tier() when present, else localStorage "tr_quality"); Lite mode means Low; default High. */
  K.lumenTier = function () {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  };
  K.lumenMath = { persp: persp, look: lookMatrix, mul: mul, inv: inv };

  var FLOOR = "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "uniform mat4 uInv; uniform vec3 uEye; uniform vec2 uRes; uniform float uT, uBoost; uniform vec4 uL[13]; uniform vec3 uLC[13]; uniform vec3 uGridC, uSkyC;",
    "float sq(float x){ return x*x; }",
    "float ridge(float x){ return .55*fbm(vec2(x*.09, 3.1)) + .35*abs(sin(x*.21+1.3))*fbm(vec2(x*.3,7.)); }",
    "void main(){ vec2 ndc = gl_FragCoord.xy/uRes*2.-1.; vec4 w = uInv*vec4(ndc, 1., 1.); vec3 rd = normalize(w.xyz/w.w - uEye);",
    "  vec3 col;",
    "  if (rd.y >= -.0005) {",   // sky: deep void, horizon glow, a ring of glowing ridgelines and a slow data aurora
    "    float el = rd.y, az = atan(rd.x, rd.z)*12.;",
    "    col = uSkyC*.02 + uSkyC*.35*exp(-el*22.) + vec3(.02,.01,.05)*smoothstep(.0,.6,el);",
    "    float r = ridge(az+uEye.z*.02)*.12; float edge = exp(-abs(el-r)*900.); float under = step(el, r);",
    "    col = mix(col, vec3(.004,.006,.012), under*.92); col += uGridC*edge*2.6 + uGridC*exp(-abs(el-r)*120.)*.25*(1.-under);",
    "    float bands = smoothstep(.04,.0,abs(fract(az*.5+uT*.02)-.5))*smoothstep(.0,.3,el-r)*exp(-el*6.)*.25; col += uSkyC*bands;",
    "    o = vec4(col,1.); return; }",
    "  float t = -uEye.y/rd.y; vec3 p = uEye+rd*t;",
    "  vec2 g = p.xz; vec2 f = abs(fract(g)-.5); vec2 fw = fwidth(g)*1.1;",
    "  float L = 1.-min(smoothstep(.5-fw.x*1.5,.5,f.x)*0.+smoothstep(fw.x, 0., .5-f.x), 1.);",
    "  float lx = smoothstep(fw.x*1.2, 0., .5-f.x), lz = smoothstep(fw.y*1.2, 0., .5-f.y); float line = max(lx, lz);",
    "  vec2 g8 = p.xz/8.; vec2 f8 = abs(fract(g8)-.5); vec2 fw8 = fwidth(g8)*1.2; float major = max(smoothstep(fw8.x,0.,.5-f8.x), smoothstep(fw8.y,0.,.5-f8.y));",
    "  float dist = t; float fade = exp(-dist*.035);",
    "  col = vec3(.003,.004,.008) + uGridC*(line*.22 + major*.7)*fade;",
    "  float pulse = exp(-sq(fract(p.z*.05 - uT*.25)-.5)*120.)*major; col += uGridC*pulse*1.2*fade;",   // a data pulse runs the major lines
    "  for (int i=0;i<13;i++){ if (uL[i].w <= 0.) continue; vec2 d = p.xz-uL[i].xy; float k = uL[i].w/(1.+dot(d,d)*3.);",
    "    col += uLC[i]*k*(.05+.9*line+1.4*major)*.6; }",    // runner light pools, strongest on the grid wires
    "  float fres = pow(1.-abs(rd.y), 6.); col += uSkyC*fres*.18*fade + uGridC*fres*.05;",
    "  col = mix(uSkyC*.05, col, fade*.9+.1);",
    "  o = vec4(col, 1.); }"].join("\n");
  var WALL_VS = "#version 300 es\nprecision highp float; layout(location=0) in vec4 aP; layout(location=1) in vec4 aC; uniform mat4 uVP; uniform float uMirror; out vec4 vC; out float vH, vS, vZ;\n" +
    "void main(){ vec3 p = aP.xyz; vH = p.y/.42; if (uMirror > .5) p.y = -p.y; vC = aC; vS = aP.w; vec4 c = uVP*vec4(p,1.); vZ = c.w; gl_Position = c; }";
  var WALL_FS = "#version 300 es\nprecision highp float; in vec4 vC; in float vH, vS, vZ; uniform float uT, uMirror; out vec4 o;\n" +
    "void main(){ float top = exp(-pow((1.-vH)*14., 2.))*2.6 + exp(-vH*30.)*.9;\n" +              // hot top edge + base seam
    "  float body = .16 + .1*sin(vS*9.-uT*12.)*.5 + .08*step(.5, fract(vH*7.+uT*.6));\n" +           // translucent body with scan shimmer
    "  float a = vC.a*(top+body)*exp(-vZ*.03);\n" +
    "  if (uMirror > .5) a *= .32*(1.-vH)*(.75+.25*sin(vS*31.+uT*3.));\n" +                           // reflection: dimmer, fades with height, rippled
    "  o = vec4(vC.rgb*a, 0.); }";
  var HEAD_VS = "#version 300 es\nprecision highp float; layout(location=0) in vec4 aP; layout(location=1) in vec4 aC; uniform mat4 uVP; uniform float uPx; out vec4 vC;\n" +
    "void main(){ vec4 c = uVP*vec4(aP.xyz,1.); gl_Position = c; gl_PointSize = clamp(uPx*aP.w/c.w, 2., 220.); vC = aC; }";
  var HEAD_FS = "#version 300 es\nprecision highp float; in vec4 vC; out vec4 o;\nvoid main(){ vec2 q = gl_PointCoord*2.-1.; float r = dot(q,q); float a = exp(-r*7.)*1.6 + exp(-r*60.)*6. + .4*exp(-abs(q.y)*40.)*exp(-abs(q.x)*2.5);\n" +
    "  o = vec4(vC.rgb*a*vC.a, 0.); }";

  K.mod("lumen", function (gl, s, K) {
    var fl = K.compile(K.FSQ, FLOOR), wl = K.compile(WALL_VS, WALL_FS), hd = K.compile(HEAD_VS, HEAD_FS);
    if (!fl || !wl || !hd) return null;
    var TIER = K.lumenTier(), NR = { low: 5, medium: 7, high: 8, max: 12 }[TIER], TRAIL = { low: 34, medium: 42, high: 46, max: 64 }[TIER];
    var MAXV = 13 * 260 * 6, buf = new Float32Array(MAXV * 8), vb = gl.createBuffer(), vao = gl.createVertexArray();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    var hb = gl.createBuffer(), hvao = gl.createVertexArray(), hbuf = new Float32Array(13 * 8);
    gl.bindVertexArray(hvao); gl.bindBuffer(gl.ARRAY_BUFFER, hb); gl.bufferData(gl.ARRAY_BUFFER, hbuf.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    gl.bindVertexArray(null);
    var PAL = s.colors || [[.15, .85, 1.4], [.15, .85, 1.4], [.9, .3, 1.3], [.15, .85, 1.4], [.4, 1.3, 1.0], [.15, .85, 1.4], [.9, .3, 1.3], [.15, .85, 1.4]], ME = s.me || [1.6, .7, .12];
    var cam = { z: 0, x: 0, lean: 0 }, R = [], me = null, rnd = Math.random;
    function spawn(i, z0) { var lane = Math.round(cam.x + (rnd() - .5) * 12), dir = rnd() < .75 ? [0, 1] : (rnd() < .5 ? [1, 0] : [-1, 0]);
      return { x: lane, z: Math.round(z0 + rnd() * 18), d: dir, v: 3.4 + rnd() * 1.6, pts: [], c: PAL[i % PAL.length], next: 0, age: 0 }; }
    for (var i = 0; i < NR; i++) { R.push(spawn(i, 6 + i * 2)); R[i].pts.push([R[i].x, R[i].z]); }
    var drag = { x0: 0, y0: 0, on: false, turned: false };
    function down(e) { drag.on = true; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.turned = false; drag.t = performance.now();
      if (!me || me.dead) { var lane = Math.round(cam.x + (e.clientX / innerWidth - .5) * 9); me = { x: lane, z: Math.round(cam.z + 5), d: [0, 1], v: 5.2, pts: [[lane, Math.round(cam.z + 5)]], c: ME, next: 9e9, age: 0, me: true }; } }
    function move(e) { if (!drag.on || !me) return; var dx = e.clientX - drag.x0; if (!drag.turned && Math.abs(dx) > 40) { drag.turned = true; turn(me, dx > 0 ? 1 : -1); drag.x0 = e.clientX; drag.turned = false; } }
    function up() { drag.on = false; }
    addEventListener("pointerdown", down, { passive: true }); addEventListener("pointermove", move, { passive: true }); addEventListener("pointerup", up, { passive: true }); addEventListener("pointercancel", up, { passive: true });
    function turn(r, s1) { var d = r.d, nd = s1 > 0 ? [d[1], -d[0]] : [-d[1], d[0]]; r.x = Math.round(r.x); r.z = Math.round(r.z); r.pts.push([r.x, r.z]); r.d = nd; if (r.d[1] < 0 && !r.me) r.d = [0, 1]; }
    var VP = null, INV = null, EYE = [0, 1, 0], camV = [0, 0, 0, 0];
    function stepR(r, dt, boost) {
      var sp = r.v * (boost ? 1.8 : 1); var ox = r.x, oz = r.z; r.x += r.d[0] * sp * dt; r.z += r.d[1] * sp * dt; r.age += dt;
      if (!r.me && Math.floor(ox) !== Math.floor(r.x) || !r.me && Math.floor(oz) !== Math.floor(r.z)) {          // crossed a lane: maybe turn
        var away = r.x - cam.x; if (Math.abs(away) > 6 && r.d[0] * away > 0) turn(r, (r.d[0] > 0) === true ? 1 : -1);
        else if (rnd() < .07) turn(r, rnd() < .5 ? 1 : -1);
        else if (r.d[1] === 0 && rnd() < .2) { r.x = Math.round(r.x); r.z = Math.round(r.z); r.pts.push([r.x, r.z]); r.d = [0, 1]; } }
      var L = 0, keep = r.me ? TRAIL + 24 : TRAIL, p = r.pts; var hx = r.x, hz = r.z;           // trim the trail to its length
      for (var k = p.length - 1; k >= 0; k--) { var dd = Math.abs(p[k][0] - hx) + Math.abs(p[k][1] - hz); L += dd; hx = p[k][0]; hz = p[k][1]; if (L > keep) { if (k > 0) p.splice(0, k); var ex = L - keep, nx = p[1] ? p[1] : [r.x, r.z]; var sx = Math.sign(nx[0] - p[0][0]), sz = Math.sign(nx[1] - p[0][1]); p[0] = [p[0][0] + sx * ex, p[0][1] + sz * ex]; break; } }
    }
    function quad(o, a, b, c, s0, s1) { var H = .42, v = [[a[0], 0, a[1], s0], [b[0], 0, b[1], s1], [b[0], H, b[1], s1], [a[0], 0, a[1], s0], [b[0], H, b[1], s1], [a[0], H, a[1], s0]];
      for (var i = 0; i < 6; i++) { buf.set(v[i], o); buf.set(c, o + 4); o += 8; } return o; }
    return {
      name: "lumen",
      step: function (c) {
        var v = c.view || {};
        var dt = c.still ? 0 : Math.min(c.dt, .05), boost = drag.on && me && !me.dead && performance.now() - drag.t > 350;
        cam.z += dt * (3.6 * look("speed", 1) + (boost ? 1.6 : 0)); cam.lean += ((boost ? 1 : 0) - cam.lean) * Math.min(1, dt * 3);
        var tx = me && !me.dead ? me.x * .5 : 0; cam.x += (tx - cam.x) * Math.min(1, dt * .6);
        for (var i = 0; i < R.length; i++) { var r = R[i]; stepR(r, dt, false);
          if (r.z < cam.z - 6 || r.z > cam.z + 60 || Math.abs(r.x - cam.x) > 16) { R[i] = spawn(i, cam.z + 10); R[i].pts.push([R[i].x, R[i].z]); } }
        if (me && !me.dead) { stepR(me, dt, boost); if (me.z < cam.z - 8 || Math.abs(me.x - cam.x) > 18 || me.z > cam.z + 70) me.dead = true; }
        var asp = c.w / c.h, room = v.mode === "room", sw = room ? 0 : (Math.sin(c.t * .23) * .25 + (c.ptr.x - .5) * .6), fov = asp < 1 ? 1.15 : .9;
        var yaw = v.yaw || 0, pitch = v.pitch || 0, move = v.move || 0, up = v.up || 0; camV = [yaw, pitch, move, up];
        // the room turns the view (yaw, pitch), moves along it (move) and lifts it (up); the default view is the backdrop's eye and target
        var E0 = [cam.x + sw, 1.05 + Math.sin(c.t * .31) * .05 - cam.lean * .2, cam.z - 2.2], T0 = [cam.x + sw * .4, .45 + (room ? 0 : (c.ptr.y - .5) * .3), cam.z + 10];
        var dx = T0[0] - E0[0], dy = T0[1] - E0[1], dz = T0[2] - E0[2], cy = Math.cos(yaw), sy = Math.sin(yaw);
        var rx = dx * cy + dz * sy, rz = -dx * sy + dz * cy; dy += pitch * Math.hypot(rx, dy, rz); var n = Math.hypot(rx, dy, rz) || 1;
        EYE = [E0[0] + rx / n * move, E0[1] + dy / n * move + up, E0[2] + rz / n * move];
        var V = lookMatrix(EYE, [EYE[0] + rx, EYE[1] + dy, EYE[2] + rz], [Math.sin(cam.lean * .1) * .2, 1, 0]);
        VP = mul(persp(fov, asp, .05, 200), V); INV = inv(VP);
      },
      draw: function (c) {
        if (!VP) return;
        gl.disable(gl.BLEND); gl.useProgram(fl.p); var u = fl.u;
        gl.uniformMatrix4fv(u.uInv, false, INV); gl.uniform3fv(u.uEye, EYE); gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t);
        gl.uniform3fv(u.uGridC, s.grid || [.12, .7, 1.1]); gl.uniform3fv(u.uSkyC, s.sky || [.1, .35, .7]);
        var L = new Float32Array(52), LC = new Float32Array(39), all = R.concat(me && !me.dead ? [me] : []);
        all.forEach(function (r, i) { L.set([r.x, r.z, 0, r.me ? 1.6 : 1], i * 4); LC.set(r.c, i * 3); });
        gl.uniform4fv(u.uL, L); gl.uniform3fv(u.uLC, LC); gl.drawArrays(gl.TRIANGLES, 0, 3);
        // trails: build geometry
        var o = 0;
        all.forEach(function (r) { var p = r.pts.concat([[r.x, r.z]]), acc = 0, tot = 0; for (var k = 1; k < p.length; k++) tot += Math.abs(p[k][0] - p[k - 1][0]) + Math.abs(p[k][1] - p[k - 1][1]);
          for (k = 1; k < p.length; k++) { var seg = Math.abs(p[k][0] - p[k - 1][0]) + Math.abs(p[k][1] - p[k - 1][1]); if (seg < 1e-4) continue;
            var n = Math.max(1, Math.ceil(seg / 3)); for (var j = 0; j < n; j++) { var a0 = j / n, a1 = (j + 1) / n, A = [p[k - 1][0] + (p[k][0] - p[k - 1][0]) * a0, p[k - 1][1] + (p[k][1] - p[k - 1][1]) * a0], B = [p[k - 1][0] + (p[k][0] - p[k - 1][0]) * a1, p[k - 1][1] + (p[k][1] - p[k - 1][1]) * a1];
              var s0 = acc + seg * a0, s1 = acc + seg * a1, fade0 = Math.min(1, s0 / (tot * .5 + .01)); if (o + 48 > buf.length) return;
              o = quad(o, A, B, [r.c[0], r.c[1], r.c[2], (.25 + .75 * fade0) * look("glow", 1)], s0, s1); }
            acc += seg; } });
        gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, o));
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(wl.p); gl.uniformMatrix4fv(wl.u.uVP, false, VP); gl.uniform1f(wl.u.uT, c.t);
        gl.uniform1f(wl.u.uMirror, 1); gl.drawArrays(gl.TRIANGLES, 0, o / 8);
        gl.uniform1f(wl.u.uMirror, 0); gl.drawArrays(gl.TRIANGLES, 0, o / 8);
        // runner heads
        var h = 0; all.forEach(function (r) { hbuf.set([r.x, .22, r.z, r.me ? 1.5 : 1, r.c[0], r.c[1], r.c[2], 1], h); h += 8; });
        gl.bindVertexArray(hvao); gl.bindBuffer(gl.ARRAY_BUFFER, hb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hbuf.subarray(0, h));
        gl.useProgram(hd.p); gl.uniformMatrix4fv(hd.u.uVP, false, VP); gl.uniform1f(hd.u.uPx, c.h * .09); gl.drawArrays(gl.POINTS, 0, h / 8);
        gl.bindVertexArray(null);
      },
      debug: function () {
        return { tier: TIER, riders: R.length, me: !!(me && !me.dead), ride: cam,
          cam: camV.map(function (x) { return +x.toFixed(3); }),   // the view on top of the ride (the eye itself bobs and rides on)
          look: { speed: look("speed", 1), glow: look("glow", 1) } };
      },
      dispose: function () { removeEventListener("pointerdown", down); removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
        gl.deleteBuffer(vb); gl.deleteBuffer(hb); gl.deleteVertexArray(vao); gl.deleteVertexArray(hvao); [fl, wl, hd].forEach(function (p) { gl.deleteProgram(p.p); }); }
    };
  });
  K.themes.lumen = { stack: [
    { mod: "lumen" },
    { mod: "particles", count: { low: .025, medium: .04, high: .05, max: .09 }[K.lumenTier()], shape: "mote", size: 2, gravity: -.003, curl: .5, scale: 1.2, speed: .02, life: .05, c1: [.2, .8, 1], c2: [.6, .3, 1], alpha: .05, blend: "add", depth: 1, glint: .6, rake: .3 },
    { mod: "post", bloom: 1.35, threshold: .6, knee: .45, exposure: 1.1, aberr: .35, grain: .025, vig: .5, trails: .2 }
  ],
    room: { name: "On the grid", yaw: [-.8, .8], pitch: [-.2, .35], move: [-3, 4], up: [-.5, 2], unit: "m", sound: "plasma",
      look: [{ id: "speed", label: "Speed", min: 0.5, max: 2, def: 1 }, { id: "glow", label: "Glow", min: 0.2, max: 2.5, def: 1 }],
      touch: "Tap the grid to launch your light runner.",
      opening: { dur: 5, from: { yaw: 0.5, pitch: -0.1, move: -2, up: 0.5 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.5, at: [.5, .5] } } };
})();
