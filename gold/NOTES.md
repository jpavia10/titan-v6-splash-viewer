# Obsidian Sun — GOLD STANDARD intro (new baseline)

Single theme, hand-built. Raw WebGL1 + Web Audio, zero dependencies, zero CDN, zero copyrighted audio.

## Beats (11 s, portrait-first 9:16)
1. 0–2.4 s **Void** — black sun barely rimmed, embers breathe up from below, sub swells.
2. 2.4 s **Fracture** — obsidian core detonates into a 3D shard volume; camera dollies *into* it (real perspective parallax, near shards blow past the lens).
3. 5.6 s **Title lock** — impact; a spherical shockwave travels through the shard field; title resolves from blur with weight (DOM text, always upright and readable).
4. 6–11 s **Hold** — slow orbit, conchoidal glints, falling ash, corona god-rays.

## Visual techniques
- **3 GPU particle species** (high tier 78k / mid 37k / low 13.5k): knapped obsidian shards (alpha-blended, rotated asymmetric flake SDF, fake normal → Fresnel rim + specular + flickering conchoidal glints), embers (additive, buoyant life cycle, heat-colour ramp), ash (additive, slow fall).
- All motion is **closed-form on the GPU**: drag ballistics `r = sp(1−e^(−kt))/k`, radius-dependent orbital shear, analytic swirl field, Gaussian shockwave shell. No CPU per-particle work → stable on phones.
- **Background**: eclipse disk + fbm corona filaments + 28-step screen-space god-ray march through fbm haze + impact ring, Reinhard tonemap, dithered (no banding).
- Real 3D camera (perspective + lookAt) with portrait-aware FOV — fills 9:16, never letterboxed.

## Sound (original, no THX / no Deep Note)
Deep Note's signature = many voices gliding from random pitches to one converging chord resolving to D. This score does the opposite: **every pitch is fixed**. Tension comes from a fixed cluster (A1·E2·B♭2·F3·C4, fifths + tritone) whose *filter opens* and *gain swells*, a high-passed reverse noise riser, then:
- fracture: inharmonic modal glass partials (1, 2.76, 5.40, 8.93, 13.34 — free-bar ratios) ×47 scattered stereo grains + crack transient + low thud;
- whoosh: band-passed noise panned L→R as the camera dives;
- title impact: sub drop 70→26 Hz, filtered noise hit, low fifth braam, metallic strikes, 4.5 s procedural hall convolution;
- hold: fixed high glass shimmer with tremolo. Bus compressor on master.

## Perf / accessibility
DPR cap per tier (2.0 / 1.5 / 1.0); auto tier (mobile 8+ cores → mid, else low; `?tier=low|mid|high`); adaptive downgrade (drop DPR, then 45% particles if frames >22 ms); `webglcontextlost` → static title; `prefers-reduced-motion` or `?still=1` → single still frame, no audio; tap-to-skip jumps to the held title and ducks audio; mute + replay.

## Why this beats V6
| V6 reject | Gold |
|---|---|
| 2D Droste scale-feedback tunnel | true 3D particle volume + camera move |
| title smeared backward on walls | upright DOM title, scrim, always legible |
| 54 clones from 8 archetypes | one bespoke world built for Obsidian |
| identical thxBus Deep Note imitation | original fixed-pitch score, no THX |
| 16:9 low-res mp4 proofs | live portrait-first, runs on phone |
| no low tier / no context-loss path | 3 tiers, adaptive, context-loss + reduced motion |

Caveats: tested in headless Chrome (SwiftShader) at 390×844; not yet verified on a physical S24 Ultra. Very dense shard overdraw near the lens is the main GPU cost; if a phone stutters, `?tier=low`.
