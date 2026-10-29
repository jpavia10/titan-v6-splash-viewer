/* fx/ferro.js: Ferrofluid (ferro), theme #37 v2, on the shared TitanFXK kit (Grok theme-37-50 worker, 2026-10-20; file owner).
   Owner bar: "viral-demo-grade, real-time GPU simulation ... volumetrics, HDR post"; floor device S24 Ultra; scale up on a 4090.
   Passes per frame (all WebGL2, half-float targets):
     1. sim     a 2D wave/spring simulation of the fluid's magnetisation envelope A (height + velocity, ping-pong RGBA16F). The magnetic
                field drives it: the pointer, a magnet that wanders under the pool, a hold-to-charge magnet, the periodic "surge" wave
                and tap rings. The spring + Laplacian give the fluid inertia: spikes overshoot, wobble, merge and ring out.
     2. scene   a perspective heightfield raymarch of the pool (hex Rosensweig spike lattice whose height follows A), shaded as a
                black mirror: Fresnel clearcoat reflecting an HDR studio (two softboxes, a strip, a cyan rim, a warm kicker), into HDR.
     3. bloom   bright-pass + 2-tap-wide separable blur at quarter resolution: spike tips that catch the softbox bloom.
     4. comp    scene + bloom, ACES filmic tonemap, grain, to the kit canvas.
   Signature move "charge": press and hold anywhere still for a moment: the magnet charges, spikes under your finger grow into a
   tall crown (a rising hum, vibration ticks on Android); let go and the fluid collapses with a splash ring that rolls across the pool.
   Lite (explicit Lite only) = smaller sim and render scale. Reduced motion = one still frame (kit). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  K.mod("ferro", function (gl, s, K) {
    if (!K.halfRT) return null;
    var lite = (function () { try { return localStorage.getItem("tr_lite_v1") === "1"; } catch (e) { return false; } })();
    var SIM = lite ? 160 : 320;
    function tex(w, h, lin) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      var f = lin ? gl.LINEAR : gl.NEAREST; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
    function fbo(t) { var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return f; }
    var ST = [tex(SIM, SIM, true), tex(SIM, SIM, true)], SF = ST.map(fbo), cur = 0;
    var RT = { w: 0, h: 0 };
    function sizeRT(w, h) {
      if (RT.w === w && RT.h === h) return; free(RT.list || []);
      RT.w = w; RT.h = h; var bw = Math.max(2, w >> 2), bh = Math.max(2, h >> 2);
      RT.sc = tex(w, h, true); RT.sf = fbo(RT.sc); RT.b1 = tex(bw, bh, true); RT.bf1 = fbo(RT.b1); RT.b2 = tex(bw, bh, true); RT.bf2 = fbo(RT.b2); RT.bw = bw; RT.bh = bh;
      RT.list = [RT.sc, RT.b1, RT.b2]; RT.fl = [RT.sf, RT.bf1, RT.bf2];
    }
    function free(l) { l.forEach(function (t) { gl.deleteTexture(t); }); (RT.fl || []).forEach(function (f) { gl.deleteFramebuffer(f); }); }
    var HEAD = "#version 300 es\nprecision highp float;\n" + K.NOISE + "float sq(float x){ return x*x; }\n";
    /* camera shared by the sim mapping and the raymarch: ro (0,.95,-1.2); ray (p.x, p.y-.12, 1.25); pool plane coords -> sim uv */
    var CAM = [
      "uniform vec3 uRO, uCF, uCR, uCU;",
      "vec2 toUV(vec2 q){ return vec2(q.x/7.+.5, (q.y-.4)/9.); }",
      "vec2 toQ(vec2 uv){ return vec2((uv.x-.5)*7., uv.y*9.+.4); }"].join("\n") + "\n";
    var sim = K.compile(K.FSQ, HEAD + CAM + [
      "uniform sampler2D uS; uniform float uT, uDt, uCharge, uSplash, uSurge, uTapAge; uniform vec2 uP, uTap; uniform float uHover; out vec4 o;",
      "float field(vec2 q){",
      "  vec2 m1 = vec2(sin(uT*.21)*1.6, 3.2+sin(uT*.13)*1.3); float f = exp(-dot(q-m1,q-m1)*1.1)*.8;",
      "  vec2 m2 = vec2(sin(uT*.17+2.)*2.2, 5.5+cos(uT*.11)*1.5); f += exp(-dot(q-m2,q-m2)*.7)*.55;",
      "  vec2 d = q-uP; f += exp(-dot(d,d)*2.4)*uHover*.9 + exp(-dot(d,d)*(5.-2.5*uCharge))*uCharge*2.6;",
      "  if (uTapAge < 2.5) { float r = length(q-uTap); f += exp(-sq((r-uTapAge*1.6)/.4))*exp(-uTapAge*1.1)*.9; }",
      "  if (uSurge >= 0.) { float x = mix(-5., 5., uSurge); f += exp(-sq((q.x-x)/1.))*1.1*sin(3.1416*uSurge); }",
      "  return f; }",
      "void main(){ vec2 uv = gl_FragCoord.xy/vec2(" + SIM + ".); vec2 e = vec2(1./" + SIM + ".,0.);",
      "  vec4 c = texture(uS, uv); float A = c.x, V = c.y;",
      "  float lap = texture(uS, uv+e.xy).x+texture(uS, uv-e.xy).x+texture(uS, uv+e.yx).x+texture(uS, uv-e.yx).x-4.*A;",
      "  float F = field(toQ(uv));",
      "  float acc = (F-A)*26. + lap*" + (SIM * SIM * 0.00035).toFixed(3) + " - V*3.2;",   // spring to the field, wave coupling, damping (inertia, overshoot, ringing)
      "  V += acc*uDt; A += V*uDt;",
      "  if (uSplash > 0.) { float g = exp(-dot(toQ(uv)-uP, toQ(uv)-uP)*3.); V -= g*uSplash*9.; }",   // release: the crown collapses with a splash
      "  o = vec4(clamp(A,-.6,2.6), clamp(V,-30.,30.), F, 1.); }"].join("\n"));
    var scene = K.compile(K.FSQ, HEAD + CAM + [
      "uniform sampler2D uS; uniform vec2 uRes; uniform float uT, uQ, uK; out vec4 o;",
      "float hex(vec2 q){ vec2 s = vec2(1.,1.7320508); vec2 a = mod(q,s)-.5*s, b = mod(q-.5*s,s)-.5*s; return min(dot(a,a), dot(b,b)); }",
      "vec2 env2(vec2 q){ vec4 c = texture(uS, toUV(q)); return c.xy; }",
      "float hgt(vec2 q){ vec2 av = env2(q); float A = max(av.x,0.);",
      "  float sc = 4.2; float d = sqrt(hex(q*sc))/sc; float sp = max(0., 1.-d*sc*2.); sp = sp*sp*sp*(sp*(sp*6.-15.)+10.);",
      "  float tall = smoothstep(.06,.55,A);",
      "  return sp*tall*(.09+.30*A) + .05*A + .004*av.y*sp + .0012*sin(q.x*9.+uT*1.7)*sin(q.y*7.-uT*1.3); }",
      "vec3 studio(vec3 r){",
      "  vec3 c = vec3(.004,.005,.007) + vec3(.03,.035,.045)*smoothstep(-.05,.6,r.y);",
      "  vec2 a = vec2(atan(r.x, r.z), r.y);",
      "  c += vec3(14.,13.,12.)*smoothstep(.06,.0,abs(a.x+.55)-.22)*smoothstep(.04,.0,abs(a.y-.82)-.1);",   // key softbox, upper left
      "  c += vec3(6.,7.,8.)*smoothstep(.04,.0,abs(a.x-.75)-.05)*smoothstep(.05,.0,abs(a.y-.62)-.14);",       // tall strip, right
      "  c += vec3(.25,1.6,2.2)*exp(-sq((r.y-.03)*18.))*(.6+.4*sin(a.x*2.+uT*.2));",                           // cyan horizon rim
      "  c += vec3(1.3,1.4,1.6)*exp(-sq((a.x-2.6)*2.))*smoothstep(.0,.3,r.y)*.18;",                               // warm kicker behind
      "  return c; }",
      "void main(){ vec2 p = (gl_FragCoord.xy-.5*uRes)/uRes.y; vec3 rd = normalize(uCF*1.25 + p.x*uCR + (p.y-.12)*uCU);",
      "  vec3 col;",
      "  if (rd.y > -.004) { col = vec3(.002,.003,.004) + vec3(.0,.006,.009)*exp(-sq(rd.y*30.)); o = vec4(col, 1.); return; }",
      "  float t0 = (uRO.y-.75)/-rd.y; float tm = uRO.y/-rd.y + .3; t0 = max(t0, 0.);",
      "  int N = uQ > .75 ? 80 : uQ > .45 ? 56 : 36; float dt = (tm-t0)/float(N), t = t0, lt = t0; bool hit = false;",
      "  for (int i=0;i<80;i++){ if (i>=N) break; vec3 x = uRO+rd*t; if (x.y-hgt(x.xz) < 0.) { hit = true; break; } lt = t; t += dt; }",
      "  if (!hit) { t = tm; lt = tm-dt; }",
      "  for (int i=0;i<7;i++){ float m = .5*(t+lt); vec3 x = uRO+rd*m; if (x.y-hgt(x.xz) < 0.) t = m; else lt = m; }",
      "  vec3 x = uRO+rd*t; float e = .0035*(1.+t*.25);",
      "  vec3 n = normalize(vec3(hgt(x.xz-vec2(e,0.))-hgt(x.xz+vec2(e,0.)), 2.*e, hgt(x.xz-vec2(0.,e))-hgt(x.xz+vec2(0.,e))));",
      "  vec3 r = reflect(rd, n); float nv = max(dot(n,-rd),0.); float F = .05 + .95*pow(1.-nv, 5.);",
      "  float rough = (.04 + .1*smoothstep(.0,.3,x.y)) * uK;",                                     // tips slightly satin, flats glassy
      "  vec3 spec = studio(r); spec = mix(spec, studio(normalize(r+vec3(0.,rough,0.))), .5);",
      "  col = spec*(F*.9 + .05) + vec3(.003,.004,.006);",
      "  col += vec3(.1,.6,.9)*pow(1.-nv,3.)*.08*smoothstep(.02,.2,x.y);",                  // thin cyan sheen on spike flanks
      "  float fog = exp(-max(t-2.,0.)*.22); col = mix(vec3(.002,.004,.006), col, fog);",
      "  o = vec4(col, 1.); }"].join("\n"));
    var bright = K.compile(K.FSQ, HEAD + "uniform sampler2D uI; uniform vec2 uRes; out vec4 o;\nvoid main(){ vec2 uv = gl_FragCoord.xy/uRes; vec2 px = 1./uRes;\n" +
      "  vec3 c = vec3(0.); for (int i=-1;i<=1;i++) for (int j=-1;j<=1;j++) c += texture(uI, uv+vec2(i,j)*px*1.5).rgb; c /= 9.;\n" +
      "  float l = dot(c, vec3(.2126,.7152,.0722)); o = vec4(c*smoothstep(.7, 2.2, l), 1.); }");
    var blur = K.compile(K.FSQ, HEAD + "uniform sampler2D uI; uniform vec2 uRes, uDir; out vec4 o;\nvoid main(){ vec2 uv = gl_FragCoord.xy/uRes;\n" +
      "  vec3 c = texture(uI, uv).rgb*.227; float w[4] = float[4](.194,.121,.054,.016);\n" +
      "  for (int i=1;i<=4;i++){ vec2 d = uDir*float(i)*1.6/uRes; c += (texture(uI, uv+d).rgb + texture(uI, uv-d).rgb)*w[i-1]; } o = vec4(c,1.); }");
    var comp = K.compile(K.FSQ, HEAD + "uniform sampler2D uI, uB; uniform vec2 uRes; uniform float uT, uBloom; out vec4 o;\n" +
      "vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }\n" +
      "void main(){ vec2 uv = gl_FragCoord.xy/uRes; vec3 c = texture(uI, uv).rgb + texture(uB, uv).rgb*uBloom;\n" +
      "  c = aces(c*1.15); c = pow(c, vec3(1./2.2)); c += (h21(gl_FragCoord.xy+fract(uT)*91.)-.5)*.012;\n" +
      "  vec2 v = uv-.5; c *= 1.-dot(v,v)*.55; o = vec4(c, 1.); }");
    if (!sim || !scene || !bright || !blur || !comp) return null;

    /* hold-to-charge: state, haptics and a hum (respects mute and the interface-sound setting) */
    var ch = { hold: 0, charge: 0, splash: 0, sx: 0, sy: 0, buzz: 0, osc: null, gain: null, ctx: null, lastDown: 0, px: 0, py: 0 };
    function soundOk() { try { if (localStorage.getItem("tr_mute_v1") === "1") return false; var u = JSON.parse(localStorage.getItem("titan.uisound.v1") || "null"); return !(u && u.on === false); } catch (e) { return true; } }
    function hum(on, k) {
      try {
        if (on && !ch.osc && soundOk()) { var b = window.TitanGen && TitanGen.uiBus && TitanGen.uiBus(); var ctx = b && b.ctx; if (!ctx) return;
          var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o1.type = "sawtooth"; o2.type = "sine"; f.type = "lowpass"; f.frequency.value = 300;
          o1.connect(f); o2.connect(g); f.connect(g); g.gain.value = 0.0001; g.connect(b.input); o1.start(); o2.start(); ch.osc = [o1, o2]; ch.gain = g; ch.f = f; ch.ctx = ctx; }
        if (ch.osc) { var now = ch.ctx.currentTime;
          if (on) { ch.osc[0].frequency.setTargetAtTime(45 + 70 * k, now, .05); ch.osc[1].frequency.setTargetAtTime(90 + 140 * k, now, .05); ch.f.frequency.setTargetAtTime(200 + 1400 * k * k, now, .05); ch.gain.gain.setTargetAtTime(.05 * k, now, .05); }
          else { ch.gain.gain.setTargetAtTime(.0001, now, .06); var os = ch.osc; ch.osc = null; setTimeout(function () { os.forEach(function (x) { try { x.stop(); } catch (e) { /* done */ } }); }, 400);
            if (k > .2) { var n = ch.ctx.createBufferSource(), buf = ch.ctx.createBuffer(1, ch.ctx.sampleRate * .6, ch.ctx.sampleRate), d = buf.getChannelData(0);
              for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); var bf = ch.ctx.createBiquadFilter(), gg = ch.ctx.createGain(); bf.type = "lowpass"; bf.frequency.value = 900; gg.gain.value = .18 * k;
              n.buffer = buf; n.connect(bf); bf.connect(gg); gg.connect(window.TitanGen.uiBus().input); n.start(); } } }
      } catch (e) { /* audio is optional */ }
    }
    var CAM_DEF = { o: [0, .95, -1.2], pitch: .12 };
    function basis(v) {
      var yaw = v && v.yaw || 0, pitch = (v && v.pitch || 0);
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var f = [sy * cp, sp, cy * cp];
      var r = [cy, 0, -sy];
      var u = [ -sy * sp, cp, -cy * sp ];
      var move = v && v.move || 0, up = v && v.up || 0;
      var ro = [ CAM_DEF.o[0] + f[0] * move, CAM_DEF.o[1] + up + f[1] * move, CAM_DEF.o[2] + f[2] * move ];   // move > 0 = toward the pool
      return { ro: ro, f: f, r: r, u: u };
    }
    function toPlane(px, py, asp, B) {      // the pointer (0..1, y up) -> pool plane coords, with the scene's camera
      var x = (px - .5) * asp, y = py - .5 - .12;          // the same ray as the shader; the default view gives the backdrop's mapping
      var rd = [ B.f[0] * 1.25 + x * B.r[0] + y * B.u[0], B.f[1] * 1.25 + x * B.r[1] + y * B.u[1], B.f[2] * 1.25 + x * B.r[2] + y * B.u[2] ];
      if (rd[1] > -.01) rd[1] = -.01; var t = B.ro[1] / -rd[1];
      return [ B.ro[0] + rd[0] * t, B.ro[2] + rd[2] * t ];
    }
    var surge = { next: 14 + Math.random() * 10, t0: -1 };
    var currentB = basis(null);
    return {
      name: "ferro",
      step: function (c) {
        var v = c.view || {};
        currentB = basis(v);
        var asp = c.w / c.h, p = c.ptr, dt = c.still ? 0 : Math.min(c.dt, .033);
        var moved = Math.abs(p.x - ch.px) + Math.abs(p.y - ch.py); ch.px = p.x; ch.py = p.y;
        if (p.down) { ch.hold += dt; if (moved > .02 && ch.hold < .3) ch.hold = 0; } 
        var k = Math.max(0, Math.min(1, (ch.hold - .3) / 1.4)); k = k * k * (3 - 2 * k);
        if (p.down && k > 0) { hum(true, k); ch.buzz -= dt; if (ch.buzz <= 0 && navigator.vibrate) { try { navigator.vibrate(6 + Math.round(10 * k)); } catch (e) { /* ignore */ } ch.buzz = .32 - .22 * k; } }
        if (!p.down && ch.charge > 0) { if (ch.charge > .15) { ch.splash = ch.charge; } hum(false, ch.charge); ch.hold = 0; k = 0; }
        ch.charge = p.down ? k : 0;
        if (surge.t0 < 0 && c.t > surge.next) surge.t0 = c.t;
        var sg = surge.t0 >= 0 ? (c.t - surge.t0) / 3.2 : -1; if (sg > 1) { surge.t0 = -1; surge.next = c.t + 18 + Math.random() * 18; sg = -1; }
        var pq = toPlane(p.x, p.y, asp, currentB), tq = toPlane(p.tx, p.ty, asp, currentB);
        gl.disable(gl.BLEND); gl.useProgram(sim.p); var u = sim.u;
        gl.uniform3f(u.uRO, currentB.ro[0], currentB.ro[1], currentB.ro[2]);
        gl.uniform3f(u.uCF, currentB.f[0], currentB.f[1], currentB.f[2]);
        gl.uniform3f(u.uCR, currentB.r[0], currentB.r[1], currentB.r[2]);
        gl.uniform3f(u.uCU, currentB.u[0], currentB.u[1], currentB.u[2]);
        gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uCharge, ch.charge); gl.uniform2f(u.uP, pq[0], pq[1]); gl.uniform2f(u.uTap, tq[0], tq[1]);
        gl.uniform1f(u.uHover, ("ontouchstart" in window) ? (p.down ? 1 : 0) : 1); gl.uniform1f(u.uSurge, sg); gl.uniform1f(u.uTapAge, Math.max(0, c.t - p.tap));
        var subs = dt > 0 ? 3 : 1;
        for (var i = 0; i < subs; i++) {            // 3 substeps: a stiff spring stays stable
          gl.viewport(0, 0, SIM, SIM); gl.bindFramebuffer(gl.FRAMEBUFFER, SF[1 - cur]); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ST[cur]); gl.uniform1i(u.uS, 0);
          gl.uniform1f(u.uDt, dt / subs); gl.uniform1f(u.uSplash, i === 0 ? ch.splash : 0); gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur;
        }
        ch.splash = 0;
      },
      draw: function (c) {
        var v = c.view || {};
        currentB = basis(v);
        var sc = (c.lite ? .45 : .62) * (.6 + .4 * c.q), w = Math.max(2, Math.round(c.w * sc)), h = Math.max(2, Math.round(c.h * sc)); sizeRT(w, h);
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, RT.sf); gl.viewport(0, 0, w, h); gl.useProgram(scene.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ST[cur]); gl.uniform1i(scene.u.uS, 0); gl.uniform2f(scene.u.uRes, w, h); gl.uniform1f(scene.u.uT, c.t); gl.uniform1f(scene.u.uQ, c.q);
        gl.uniform3f(scene.u.uRO, currentB.ro[0], currentB.ro[1], currentB.ro[2]);
        gl.uniform3f(scene.u.uCF, currentB.f[0], currentB.f[1], currentB.f[2]);
        gl.uniform3f(scene.u.uCR, currentB.r[0], currentB.r[1], currentB.r[2]);
        gl.uniform3f(scene.u.uCU, currentB.u[0], currentB.u[1], currentB.u[2]);
        gl.uniform1f(scene.u.uK, look("roughness", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, RT.bf1); gl.viewport(0, 0, RT.bw, RT.bh); gl.useProgram(bright.p); gl.bindTexture(gl.TEXTURE_2D, RT.sc); gl.uniform1i(bright.u.uI, 0); gl.uniform2f(bright.u.uRes, RT.bw, RT.bh); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.useProgram(blur.p); gl.uniform1i(blur.u.uI, 0); gl.uniform2f(blur.u.uRes, RT.bw, RT.bh);
        for (var i = 0; i < 2; i++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, RT.bf2); gl.bindTexture(gl.TEXTURE_2D, RT.b1); gl.uniform2f(blur.u.uDir, 1, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.bindFramebuffer(gl.FRAMEBUFFER, RT.bf1); gl.bindTexture(gl.TEXTURE_2D, RT.b2); gl.uniform2f(blur.u.uDir, 0, 1); gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, c.w, c.h); gl.useProgram(comp.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.sc); gl.uniform1i(comp.u.uI, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RT.b1); gl.uniform1i(comp.u.uB, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(comp.u.uRes, c.w, c.h); gl.uniform1f(comp.u.uT, c.t); gl.uniform1f(comp.u.uBloom, .85 * look("bloom", 1)); gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () { return { charge: ch.charge, sim: SIM, rt: [RT.w, RT.h],
        cam: currentB.ro.map(function(x){ return +x.toFixed(3); }).concat(currentB.f.map(function(x){ return +x.toFixed(3); })),
        look: { bloom: look("bloom", 1), roughness: look("roughness", 1) } }; },
      dispose: function () { hum(false, 0); ST.forEach(function (t) { gl.deleteTexture(t); }); SF.forEach(function (f) { gl.deleteFramebuffer(f); }); free(RT.list || []); [sim, scene, bright, blur, comp].forEach(function (p) { gl.deleteProgram(p.p); }); }
    };
  });
  /* the theme's stack: the ferro pool, then a slow haze of fine iron dust (GPU particles, kit module) catching the softbox */
  K.themes.ferro = { stack: [
    { mod: "ferro" },
    { mod: "particles", count: .08, shape: "mote", size: 2.4, gravity: -.004, curl: .8, scale: 1.4, speed: .02, life: .04, c1: [.55, .7, .8], c2: [.25, .9, 1], alpha: .022, blend: "add", depth: 1, glint: 1, rake: .5 }
  ],
    room: { name: "The magnetic mirror pool", yaw: [-.35, .35], pitch: [-.12, .2], move: [-.6, .8], up: [-.3, .5], unit: "m", sound: "metal",
      look: [{ id: "bloom", label: "Bloom", min: 0, max: 3, def: 1 }, { id: "roughness", label: "Roughness", min: .2, max: 2.5, def: 1 }],
      touch: "Hold to charge the magnetic field and raise a crown of spikes; let go to splash.",
      opening: { dur: 5.0, from: { yaw: .25, pitch: -.08, move: -.4, up: .2 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.0, at: [.5, .5] } } };
})();
