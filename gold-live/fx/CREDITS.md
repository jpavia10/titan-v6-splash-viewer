# fx/ credits and licences

Every effect in fx/ is vendored locally (no CDN). Ports and the techniques they follow:

| File / scene | Source | Licence |
|---|---|---|
| fx/scenes-nms.js `nebula` | "Star Nest" by Pablo Roman Andrioli (Kali), Shadertoy XlfGRj. Ported to the TitanFXK scene API with a recoloured palette, HDR output, tier-scaled volume steps, drag/tap controls. | MIT |
| fx/scenes-nms.js `blackhole` | Photon-path integration with the Schwarzschild term a = -1.5 h² r/|r|⁵, as popularised by Riccardo Antonelli's "starless" write-up and Shadertoy Gargantua ports. Shader written fresh for this kit. | technique, own code |
| fx/scenes-nms.js `rainforest` god rays | Screen-space volumetric light scattering, Kenny Mitchell, GPU Gems 3 ch. 13 (NVIDIA). | technique, own code |
| fx/scenes-nms.js `bubbles` | Thin-film interference, three-wavelength approximation (Glassner, "Soap Bubbles"; Belcour & Barla 2017). | technique, own code |
| fx/scenes-nms.js `shatter` | Polar Voronoi crack pattern (F2-F1 edges, after Inigo Quilez's Voronoi edge-distance articles). | technique, own code |
| fx/scenes-nms.js `aurora` | Curtain technique after nimitz's "Auroras" (Shadertoy XtGGRt): stacked planes of rotated triangle noise with colour by height. Re-written for this kit (no code copied). | technique, own code (original is CC BY-NC-SA 3.0) |
| fx/scenes-nms.js `galaxy` | Logarithmic spiral-arm density with fbm warp, emission/absorption volume march. | technique, own code |
| fx/scenes-nms.js `lava` | Domain warping (Inigo Quilez, "Warp") and flow noise (Perlin & Neyret 2001) with Voronoi crust plates. | technique, own code |
| fx/scenes-nms.js `crystals` | Hexagonal-prism SDF and raymarching (Inigo Quilez, "distance functions", MIT); three-IOR dispersion. | MIT (SDF), own code |
| fx/scenes-nms.js `arcane` | Procedural sigil (segment/ring SDFs) on a perspective floor plane. | own code |
| fx/scenes-nms.js `waterfall` | Scrolling stretched flow-noise streaks (game-water flow-map technique), fbm mist, analytic rainbow arc. | technique, own code |
| fx/scenes-nms.js `portal` | Polar streak noise ring + domain-warped landscape seen through it. | own code |
| fx/scenes-nms.js `glowforest` | Parallax silhouette layers, perspective ground fbm with travelling glow wave. | own code |
| fx/scenes-nms.js `sun` | Animated Voronoi granulation (after Inigo Quilez's Voronoi articles), Eddington-style limb darkening, fbm corona. | technique, own code |
| fx/scenes-nms.js `plasmaglobe` | fbm-displaced radial filaments attracted to the pointer, Fresnel glass shell. | own code |
| fx/scenes-nms.js `jellyfish` | Analytic bells, Fresnel-style rim, sine tentacles. | own code |
| fx/scenes-nms.js `ringworld` | Ray-sphere + ray-plane intersections with mutual ring/planet shadows (standard analytic technique). | technique, own code |
| fx/scenes-nms.js `wormhole` | Polar tunnel mapping (classic demoscene tunnel, as in Inigo Quilez's "tunnel" articles). | technique, own code |
| fx/scenes-nms.js `sakura` | Layered fbm canopy silhouettes. | own code |
| fx/scenes-nms.js `cathedral` | Polar-folded tracery SDFs, projected light shafts. | own code |
| fx/scenes-nms.js `comet`, `pulsar`, `dunes`, `frost`, `clockwork` | Analytic tails/beams, dipole field lines, ridged-noise dunes, angular-fbm dendrites, polar gear SDFs. | own code |
| fx/scenes-nms.js `orbit`, `eclipse`, `glowworms`, `opal`, `spellorb` | Limb-atmosphere falloff, radial-fbm corona, reflected cave layers, Voronoi play-of-colour, curl-warped mist in a refracting sphere. | own code |
| audio/scape/presets.js blizzard `on` (frost tap) | Additive hook by fx builder #2 reusing the preset's own creak sample and crackle synth. | own code |

Personal, non-commercial project. CC BY-NC-SA Shadertoy ports, when added, are listed here with author and link.
