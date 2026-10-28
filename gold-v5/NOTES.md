# Obsidian — v5 intro attempt (preview, NOT gold)
v4 was rejected as "PlayStation" on both sound and graphics. v5 rebuilds both from scratch.

## Audio — pre-mixed 15.5 s track (sfx/intro-mix.ogg|m4a), mixed offline in Python (tools-mix.py)
Recorded samples (all CC0 1.0): Kenney "Impact Sounds" 1.0 — https://kenney.nl/assets/impact-sounds (license: sfx/KENNEY_LICENSE.txt)
- impactGlass_light_001 → reveal ping (4.6 s); impactBell_heavy_001 pitched up a fifth → its shimmer layer
- impactGlass_heavy_001 + heavy_004 + medium_002 (+ heavy_001 an octave down) → fracture (8.2 s), plus a synthesized low thump
- impactBell_heavy_000 pitched down 2 octaves and 1 octave → title-land body (10.2 s), plus a sub-bass tail and a high air burst
- impactGlass_light_003 → closing shimmer (12.4 s)
Bed (1–15 s) is synthesized: three band-limited noise layers with slow modulation, a 38→42 Hz sub, and a crossfaded 4-band noise riser into the crack. No oscillator melodies, no song, no Deep Note.
Processing: stereo convolution reverb (generated 3.8 s exponential-decay noise impulse response with a darkening tail, 25 ms predelay), 25 Hz high-pass, soft tanh bus limiter. Peak −1.5 dBFS, 0 clipped samples, about −21 dB RMS. See audio-spectrogram.png.

## Mesh — signed-distance field → marching cubes (tools-mesh.py, scikit-image)
Lens-shaped point, 9.5 mm voxels. 340 bifacial spherical flake scars struck from the margin on alternating faces (radius 0.3–0.85, layered big to small) leave crisp ridges where the scars meet. 520 small edge scoops give pressure retouch. About 65k vertices / 131k triangles, quantized int16 binary (obsidian-point.bin, about 2 MB, about 0.8 MB gzipped).

## Look
three.js r160 (MIT): MeshPhysicalMaterial (clearcoat + scratch map, thin-film iridescence, sheen), RGBELoader + PMREM, UnrealBloomPass, ACES tone mapping.
HDRI: "Studio Small 09" by Sergej Majboroda, Poly Haven, CC0 — https://polyhaven.com/a/studio_small_09
Thin-edge amber glow: emissive mask from per-vertex thinness, plus a NaN/firefly clamp so bloom doesn't make square blobs.
Timeline is the same as v4 (14.5 s): dark → reveal → hold → crack and edge glow → title → hold/end. Play / mute / skip / replay.
Title card: TITAN RELIQUARY wordmark only (theme name removed per Joseph, Oct 28).
