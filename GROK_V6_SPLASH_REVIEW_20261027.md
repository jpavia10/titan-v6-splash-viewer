# Grok review: Gemini V6 "Hollywood THX" splash/intros package (Oct 27, 2026)
For Claude, about 8:00 AM PT on Wed Oct 28, 2026. **Grok does not merge. Claude integrates after this review.** I did not edit, push, or touch data/ or _locked.

## Verdict: FAIL — do not merge; reject the preview set
Code pass already failed a blind merge (templated clones + THX Deep Note imitation). The visual pass on all five mp4s confirms **reject**, not conditional ship. The openings look cramped and flat (2D Droste / scale-feedback, not spacious GPU cinema), with "TITAN RELIQUARY" mirrored backward on the tunnel walls, landscape-only framing that letterboxes on phones, and no fluid/smoke/particle work at the studio bar. Do not merge any of the 54. Claude should score the delivery and leave the package unmerged until Gemini (or a rework) delivers bespoke portrait openings without the THX bus and without the hall-of-mirrors text smear.

## Top 5 findings
1. **The intros are templated clones.** There are 54 entries (abyss … one per theme), each 33–38 KB. The first 4 KB of every FRAG shader is byte-identical across all 54, and the headers all say "v6 · 100/100 Futuristic Hollywood IMAX / THX 3D Extruded Edition". The only variation is 8 "Layout Archetypes" (0–7, used 4–8 times each). No intro is identical to another once the name is stripped, but they are parameter variants, not bespoke openings.
2. **The THX-style audio block is identical in all 54.** The `thxBus` code (md5 1ff32e9b…) builds an 18-oscillator triangle/sawtooth chord: it starts at 205–365 Hz, resolves toward a 36.71 Hz (D) base, hits around 1.65 s and fades by 4.75 s. That is a recreation of THX's "Deep Note". It is not music in the theme-song sense, but it is a synthesized tonal cue. THX is protective of the Deep Note and has sued imitators before. **Flag for Joseph.** Recommend removing it or replacing it with a non-THX SFX swell.
3. **Texture orientation depends on the host, and the app's host is not in the package.** The shaders sample `flipUV = clamp(uv)` with no Y-inversion, apart from one `1.0 - reflUV.y` reflection line. They rely on the host's `I.gl().tex()` uploading with `UNPACK_FLIP_Y_WEBGL = true`. The theater HTML has its own TitanIntro host that sets that flag. motion-splash-v6.js calls `I.gl(...)` and `C.L.tex(cardTex())` but does **not** define `I.gl`; it comes from the app's TitanIntro runtime. If the live runtime doesn't set FLIP_Y, **every card/coin texture will render upside-down in the app even though the theater preview looks right.**
4. **The perf guards are reasonable, but the shading is heavy for phones.** DPR is capped at 1.5 and the canvas is held under about 1.7 MP. There are 55 extra 2D canvases. Each intro runs full GGX + 3-dome IBL + an anamorphic flare/ghost/shockring pass with about 8 extra texture taps per pixel. There are no deviceMemory or hardwareConcurrency tiers and no `webglcontextlost` handling. The S24 Ultra should cope at about 1.6 MP, but 4.8 s of full-screen PBR plus audio at cold launch risks heat and jank. Needs on-device testing.
5. **The theater preview is not phone-shaped, and the mp4s are low resolution.** The viewport meta is fine, but the page loads Tailwind from CDN (`cdn.tailwindcss.com` 3.4.17, which is dev-only and needs network), uses a max-w-7xl / grid-cols-12 desktop layout, and creates WebGL with `preserveDrawingBuffer: true`, which is slower than the app. The 5 mp4s are 4.0 s, 16:9 landscape, H.264/AAC: quad 968×548, obsidian/colossus/tourbillon 960×540, silverscreen 640×360. There is no portrait capture, so they prove nothing about phone framing.

## Texture / orientation risks
- High: see finding 3. Before merging, confirm the live `TitanIntro.gl().tex` calls `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)`, or add it. Test one coin-face intro on a phone and check that the lettering reads upright.
- Coin images come from `new Image()` via `loadCoin` with no `imageOrientation` handling. EXIF-rotated photos can come out sideways. Prefer `createImageBitmap(img, {imageOrientation:'from-image'})` or pre-normalized assets.
- The single `vec2(reflUV.x, 1.0 - reflUV.y)` reflection is intentional mirroring. Once FLIP_Y is fixed, check that it doesn't read as a double-flip.

## Phone / S24 Ultra risks
- Lacks a quality tier: add a cheap path (drop the IBL/flare taps, DPR 1.0) for low-power or hot devices.
- Lacks a context-loss handler, so a lost GL context could leave a blank splash. Make sure the 2D fallback triggers.
- Most intros run about 3–4.8 s (dur 3.0–3.35 for most, 4.8 for abyss). That is acceptable if tap-to-skip stays wired; the v6 header keeps the `both/film/motion/none` and Motion Calm still-frame logic.
- Spaciousness: the archetypes are "architectural & typographic compositions". I can't confirm framing without viewing, and the portrait framing is untested.

## Music / license flags
- No theme songs are embedded, and the package contains no AI music. Ambience is fetched from the app's `audio/ambience/<name>.webm|.m4a` (recorded soundscapes such as underwater/waves/creak, per BUILD_BRIEF 1c/1d). Those files must already exist in the app, or the intros play only the synth.
- The synthesized THX Deep Note imitation is in all 54 (finding 2). It is procedural tonal audio and a trademark/sound-mark risk. **Joseph decides; the default is to strip it.**

## Visual pass (five mp4s, watched)
Source: quad showcase + obsidian / colossus / tourbillon / silverscreen with sound.

- **Framing:** Cramped hall-of-mirrors, not spacious cinema. Dense repeating geometric borders; tunnel is a 2D Droste/feedback scale loop, not true 3D parallax.
- **Orientation break:** Title text smeared onto side walls; at Obsidian ~0:04 and Colossus ~0:07, "TITAN RELIQUARY" reads mirrored backward (e.g. "YRAUQILER") stretched vertically.
- **Motion quality:** Flat / cheap scale transforms — no studio GPU fluid, smoke, or particles. Silverscreen ~0:14 makes the 2D nested-frame zoom obvious.
- **Phone:** 16:9 landscape only; would letterbox hard on a tall phone. Secondary subtitle lines are already thin and would be illegible when shrunk.
- **Audio (heard in the clips):** Sounds like a real THX Deep Note recording layered with stock SFX (glass whoosh, anvil, watch tick, film projector) — not garbled AI music, but still a trademark / Deep Note imitation risk. Aligns with the identical `thxBus` block in code; default remains strip.
- **Per-clip:** Obsidian reject · Colossus reject · Tourbillon reject · Silverscreen reject (same flat feedback + mirrored wall text / kaleidoscope).

## Apply steps for Claude
1. **Do not merge** the V6 bundle or motion-splash-v6 into the preview repo.
2. Score the Gemini delivery (Scores rows 37+) as reviewed-and-rejected for ship quality (templated + flat feedback + Deep Note imitation + no portrait proof).
3. Leave the Drive package in place as reference; if Joseph later green-lights a rework, the prior CONDITIONAL checklist still applies (strip thxBus, FLIP_Y host check, low tier + context-loss, bespoke per theme, S24 portrait test) — but the watched previews are not a starting ship set.
4. Keep tonight's collection tray (Gemini verify intake + Grok change files) as the 8am priority; splash merge is off the table.

## Files reviewed (Drive ids)
- motion-splash-v6.js (1.96 MB): 1kwVKYI58XTgfmo7dKNyiFel-tJuTDGi1
- ALL_54_V6_HOLLYWOOD_THX_INTROS_BUNDLE.json (1.88 MB, 54 entries): 1joXhfbiqAViOAz-FzAwXav6Nk1tk_em-
- theater_v6_thx.html (1.87 MB): 1Or3L6BVY8vfAzXtcNxCnhQmTHxOtxDLg
- v6_thx_quad_showcase_with_sound.mp4: 14TZvFJJN5J6TgJL_Jktx3Ju0qb5EhU0h
- v6_thx_obsidian_with_sound.mp4: 169S3a7cvLmCmbT1R2zqbxAmkDpOK_f_K
- v6_thx_colossus_with_sound.mp4: 17ogtehYAfjzCB_Yf-HqXU0pT0YpkpCdv
- v6_thx_tourbillon_with_sound.mp4: 1dSw09GoJJhIiEZ85z7x3WsJba97np_FR
- v6_thx_silverscreen_with_sound.mp4: 1PoqgTbBe_q-st_p1ouLBfzmrTnX1WxYG
  (ffprobe only in the code pass; visual watch is a separate note if it lands before 8am.)

## Limits
- Code pass was static. Visual pass later watched all five mp4s and upgraded the verdict from CONDITIONAL to FAIL / reject.
- The live comparison failed: `raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/motion-splash.js` returned 404. The live TitanIntro host (the FLIP_Y check) is unverified.

Grok does not merge. Claude integrates after this review.
