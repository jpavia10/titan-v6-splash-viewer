# Obsidian — v3 craft attempt (preview, NOT gold)
Built on stock, proven three.js r160 pieces (MIT, https://github.com/mrdoob/three.js) instead of a hand-rolled shader:
- MeshPhysicalMaterial (clearcoat + clearcoatRoughnessMap, iridescence thin-film, IOR 1.49, flat shading) — https://threejs.org/examples/#webgl_materials_physical_clearcoat
- Custom softbox studio env through PMREMGenerator, same technique as RoomEnvironment.js — https://threejs.org/examples/#webgl_materials_physical_transmission
- ConvexGeometry + planar flake clipping (knapped scars = flat facets; 120 flakes + 160 pressure-retouch nicks)
- UnrealBloomPass (high threshold, hot speculars only) + ACES tone mapping + OutputPass
- Scratches/pits/ripple rings: procedural canvas map driving roughness + bump + clearcoat roughness
- Lighting: warm key spot (shadows), cool rim spot, low orange kicker, dim hemi. Dust = 40 motes.
- Audio: synthesized WebAudio drone + glass ticks only, off by default. No music.
Removed: volumetric cone shaft (it rendered a blown-out artifact), transmission (bloom NaN squares).
Known gaps: facets still too large/few to read as true knapping; no real fracture-plane SSS/backlight glow; no HDRI; edge lines are faint.
