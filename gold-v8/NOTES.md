# Titan Reliquary — Obsidian intro · v8 overnight attempt (preview, NOT gold)
Track B: an offline path-traced plate. The realtime three.js versions (v4–v7) were scored PS1-quality and are retired.

## Render
- Blender 4.2.3 LTS, Cycles (CPU, 8 threads). 720×1280 portrait at 24 fps, 360 frames (15 s), 64 adaptive samples + OpenImageDenoise. AgX, "Medium High Contrast" look.
  Motion blur (180° shutter), depth of field f/3.2 with a focus pull. Upscaled to 1080×1920 (Lanczos) with light sharpening and fine grain in ffmpeg.
- Hero: a 452k-triangle knapped point (signed distance field → marching cubes at 5 mm voxels, Taubin-smoothed): 340 bifacial flake scars, 110 mid-face scars, 520 pressure-retouch scoops.
- Material: a real dielectric. Transmission 1, IOR 1.49, coat with sparse hairline-scratch roughness, and dense volume absorption,
  so the body reads black while the thin edges pass smoky amber light (physically, not an emissive outline).
- Lighting: studio area lights only (warm key with a 28° spread, cool rim strips, top strip, front strip, a backlight through the edges, a moving reveal sweep).
  Light linking keeps the panels off the slate floor, so it stays deep black with real contact shadows. A flash point light at the fracture.
- Timeline / transitions: black open → macro on the tip with a light sweep → focus pull and crane out → slow hero turn → reverse-suck into the boom (8.2 s)
  → flash, camera punch and shake, hero jolt → debris settles → wordmark (HTML overlay) at 10.15 s → slow push to the end.
- Physics: 85 bevelled flakes (16 resting chips, 69 micro-flakes released at the boom) driven by a scripted radial impulse with gravity, drag and floor bounces,
  biased away from the camera so the title band stays clear. Plus Blender particle systems: 6,600 ash grains with floor collision, and 260 emissive embers.

## Audio (sfx/ and muxed into the mp4) — mixed offline (mix8.py), −17.5 LUFS integrated, about −0.6 dBTP, 15 LU dynamic range, no clipping
Freesound, all CC0 1.0 (HQ previews):
- 658648 "Dark Analog Drone" by Nielsvdb — bed (EQ'd dark, swell/duck automation) https://freesound.org/s/658648/
- 256911 "01 Whoosh,Metal,Alien" by Framing_Noise — reveal/transition whooshes https://freesound.org/s/256911/
- 349905 "Slow Motion Glass Shatter" by bevibeldesign — reversed riser into the boom + shatter tail https://freesound.org/s/349905/
- 754420 / 754423 "Deep Cinematic Impact 1/4" by zazz.sound.design — boom body https://freesound.org/s/754420/ https://freesound.org/s/754423/
- 221528 "Glass Break" by unfa — fracture transient https://freesound.org/s/221528/
- 184383 "Gathering Stone Resources" by qubodup — tumbling debris https://freesound.org/s/184383/
- 156579 "Pick up shattered picture frame, glass shards" by SpliceSound — shard settle https://freesound.org/s/156579/
- 719831 "impact_01" by vekoN — soft title land (low-passed) https://freesound.org/s/719831/
Kenney "Impact Sounds" 1.0, CC0 — https://kenney.nl/assets/impact-sounds — glass pings and ticks, bell (pitched).
Processing: EQ, generated 3.2 s stereo hall IR convolution, 3:1 RMS glue compression, look-ahead peak limiter. No music, no Deep Note, no THX-style chord.

## Title
The card shows only the TITAN RELIQUARY wordmark (Fraunces 600), like the other themes. It never shows the theme name.
