# Obsidian Sun — GOLD v2 (craft rebuild)

v1 got rejected, and it deserved it: it was a particle demo. v2 starts over with one object, rendered with care.

## The hero
A single knapped obsidian point, ray-marched as a true solid (signed-distance field), not a sprite.
- **Bifacial knapping:** 30 large, shallow spherical scoops struck in from the edges, alternating faces. Where they overlap they leave the ridged facets of a real knapped point.
- **Pressure retouch:** a second pass of small, irregular nicks gives a fine serrated edge.
- **Conchoidal ripples:** concentric rings radiate from each scar's strike point. They live in the surface normal, so they only show up when light grazes them.
- **Polish scratches:** sparse hairlines run in one direction and slightly roughen the specular where they cross it.
- **Glass body:** a near-black smoky body, Schlick Fresnel reflection, and a thin-film sheen at grazing angles (a faint rainbow tint on the facets).
- **Backlit edges:** where the glass is thin, a dim amber glow shows through, the way real obsidian looks held up to the sun.

## Light
- **Key:** the black sun (an eclipse disk with a corona that breaks up into filaments) sits directly behind the hero.
- **Specular sweep:** a warm softbox that only shows in reflections moves slowly across the facets, and a GGX highlight from a moving key light crawls from facet to facet. That sweep is the money shot.
- **Fill and bounce:** a faint cool fill light and a cool floor bounce in the environment.
- **Atmosphere:** single-scatter haze with a Henyey–Greenstein phase. The blade casts light shafts into it.
- **Grade:** ACES tonemap, film grain and a vignette. No lens flares, no bloom soup.
- **Motes:** dust shows only where the beam lights it.

## Camera and pacing (13 s)
1. **0–2.5 s, dark:** only a rim of corona finds the blade's edge, and one distant glass tone plays.
2. **2.5–6 s:** the sun rises behind the blade. The camera pushes in and orbits slowly while the specular sweep travels across the scars.
3. **6.2 s, fracture:** a hairline of light runs across the blade and a short volley of chips sparks off.
4. **7.2 s, title:** it lands once, in the lower third, and never covers the hero.
5. **8–13 s, hold:** near-still, so the glass can be looked at.

## Sound
It's sparse, with real silence between events and a 7-second procedural hall reverb.
- Every pitch is fixed. Nothing glides and no chord converges, which is the opposite of the THX Deep Note.
- **Glass:** struck-glass tones built from detuned modal partials (ratios 1, 2.32, 4.25, 6.63), one at a time.
- **Swell:** a soft filtered rise into the fracture.
- **Fracture:** a crisp crack and six tiny chip ticks.
- **Title:** one soft low landing, a warm fixed fifth, and the opening tone again an octave up.

## Tiers (they change detail, not the design)
| Tier | Ray-march precision | Soft shadows | Haze samples | Render scale |
|---|---|---|---|---|
| high | 110 steps | on | 24 | 1.0 |
| mid | 80 steps | on | 14 | 0.8 |
| low | 56 steps | off | 8 | 0.65 |

- If frames run slow, it lowers the render scale on its own.
- Reduced motion (or `?still=1`) shows a single still frame.
- If the graphics context is lost, it falls back to the title.
- Tap to skip, mute, replay, and a link to the V6 reject for comparison.

## Honest caveats
- So far it's only been judged in headless Chrome stills at 390×844. It hasn't been checked on an S24 yet.
- The fracture chips are a simple screen-space volley, so they're the least crafted element.
- The face scars are still a little too regular and soft. Real obsidian has crisper ridges between flakes.
