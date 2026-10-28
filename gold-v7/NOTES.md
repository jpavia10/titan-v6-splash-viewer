# Obsidian — v7 intro attempt (preview, NOT gold)
Anti-PS1 pass after v6 scored 3.5/10:
- Mesh at 6.5 mm voxels (was 9.5): 267k triangles, Taubin-smoothed to remove the marching-cubes stair noise. Ripple whitening removed (the SDF ripple term is gone).
- Glass: roughness 0.035, clearcoat roughness 0, env intensity 1.75, full specular, iridescence down to 0.12, sheen removed. Scratches live only in the clearcoat roughness (sparse hairlines).
- Amber: now a weak grazing-angle term on the thin edges only (base 0.10, crack pulse 1.4), not the outline.
- Rendering: DPR up to 2.5; a 4× MSAA half-float composer target (the v6 composer had no AA at all); exposure 1.12 ACES;
  bloom threshold 2.2, strength 0.18, so only true speculars bloom; a mild vignette plus about 2% film grain (no ordered dither).
- Boom: 170 debris pieces (22 resting chips at 0.11–0.20 scale, 148 flakes at 0.05–0.13 scale), 900 soft round ash sprites (were square pixels), lower drag, full gravity, stronger impulse.

v6 changes from v5: glassy clearcoat (the bump-noise frosting is gone; scratches are about 67 sparse hairlines in the clearcoat roughness only),
110 extra mid-face scars of varied depth, conchoidal ripples added in the distance field (sin of distance from each strike point, 0.5–0.7 mm amplitude),
an always-on amber light-through on the thin edges plus a pulse at the crack, a bump-mapped slate floor with a dark ash halo under the planted point,
and an impact boom at 8.2 s with simple physics.

Physics: fixed-step Euler integration at 120 Hz, gravity, linear drag, and a floor bounce (restitution 0.28, friction).
The boom is a radial impulse falling off with 1/r² from the fracture point: 14 resting chips get kicked, 76 micro-flakes break off the hero,
200 floor-ash motes lift off, and 30 ambient motes get pushed, then everything settles. It's deterministic (seeded), so replay, skip and stills all match.
Synced to the hit: a warm flash light, a bloom spike, and a camera punch with decaying shake.
Audio added for the boom: a pressure-wave sub drop (78 → 28 Hz), a lowpassed noise blast, and 16 scattered recorded Kenney glass ticks as debris settling.
Still 0 clipped samples, peak −1.5 dBFS.

v4 was rejected as "PlayStation" on both sound and graphics. v5 rebuilds both from scratch.

## Audio — pre-mixed 15.5 s track (sfx/intro-mix.ogg|m4a), mixed offline in Python (tools-mix.py)
Recorded samples (all CC0 1.0): Kenney "Impact Sounds" 1.0 — https://kenney.nl/assets/impact-sounds (license: sfx/KENNEY_LICENSE.txt)
- impactGlass_light_001 → reveal ping (4.6 s); impactBell_heavy_001 pitched up a fifth → its shimmer layer
- impactGlass_heavy_001 + heavy_004 + medium_002 (+ heavy_001 an octave down) → fracture (8.2 s), plus a synthesized low thump
- impactBell_heavy_000 pitched down 2 octaves and 1 octave → title-land body (10.2 s), plus a sub-bass tail and a high air burst
- impactGlass_light_003 → closing shimmer (12.4 s)
- impactGlass_light_000/002/004, medium_000/003, heavy_002 (+ the above), pitch-varied → debris settling ticks 8.45–10.5 s
Bed (1–15 s) is synthesized: three band-limited noise layers with slow modulation, a 38→42 Hz sub, and a crossfaded 4-band noise riser into the crack. No oscillator melodies, no song, no Deep Note.
Processing: stereo convolution reverb (generated 3.8 s exponential-decay noise impulse response with a darkening tail, 25 ms predelay), 25 Hz high-pass, soft tanh bus limiter. Peak −1.5 dBFS, 0 clipped samples, about −21 dB RMS. See audio-spectrogram.png.

## Mesh — signed-distance field → marching cubes (tools-mesh.py, scikit-image)
Lens-shaped point, 9.5 mm voxels. 340 bifacial spherical flake scars struck from the margin on alternating faces (radius 0.3–0.85, layered big to small) leave crisp ridges where the scars meet. 520 small edge scoops give pressure retouch. About 65k vertices / 131k triangles, quantized int16 binary (obsidian-point.bin, about 2 MB, about 0.8 MB gzipped).

## Look
three.js r160 (MIT): MeshPhysicalMaterial (clearcoat + scratch map, thin-film iridescence, sheen), RGBELoader + PMREM, UnrealBloomPass, ACES tone mapping.
HDRI: "Studio Small 09" by Sergej Majboroda, Poly Haven, CC0 — https://polyhaven.com/a/studio_small_09
Thin-edge amber glow: emissive mask from per-vertex thinness, plus a NaN/firefly clamp so bloom doesn't make square blobs.
Timeline is the same as v4 (14.5 s): dark → reveal → hold → crack and edge glow → title → hold/end. Play / mute / skip / replay.
