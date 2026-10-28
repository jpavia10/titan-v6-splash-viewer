# Titan Reliquary — intro v9 (preview, NOT gold)
Status: native-1080 stills live; full 360-frame plate rendering (see bottom).

## What changed vs v8 (v8 graded ~5/10)
- **Native 1080×1920** Cycles, 100% resolution (v8 was 360×640 upscaled with Lanczos — soft). No upscale, no unsharp.
- **No clipped facets**: sample_clamp_direct 6 / indirect 2, AgX Base Contrast (was Medium High Contrast), exposure −0.45, key/rim/back lights trimmed. Measured 0.0% pixels ≥250 on test frames (v8 had flat-white facet panels).
- **Real glass reflections**: studio area lights + softbox cards now visible to glossy rays (v8 had visible_glossy=False on most). Light linking still keeps panels off the slate.
- **HDRI**: studio.hdr as world for non-camera rays at 0.12 strength; camera still sees near-black.
- **Body surface**: volume absorption 1400 → 750, stronger scar bump (0.14) and coat-scratch roughness, so knap scars and coat sheen read under rim/key instead of a crushed black silhouette. Amber transmission now concentrated at the thin tip/edges (380 was tested and looked like amber jelly when backlit — rejected).
- Lens-distortion compositor node fixed (Blender 4.2 socket "Distortion"; v8 scene raised a KeyError at that line).
- Kept: boom debris physics, ash/embers, motion blur, DOF focus pull, camera punch, intro8.wav CC0 mix (unchanged), HTML wordmark TITAN RELIQUARY only.

## Render
Blender 4.2.3 Cycles CPU 8 threads, 64 adaptive spp (threshold .03) + OpenImageDenoise, ~55–65 s/frame, 361 frames @24fps.

## Known remaining gaps (honest)
- Slate floor now reads lighter/greyer than v8 (HDRI + softbox glossy); less "deep black stage".
- Body centre still very dark at some angles; scars read mostly near lit edges.
- Denoiser at 64 spp may smear fine scratches; ash grains may shimmer.
- Not Hollywood. Preview only until Joseph says gold.
