# Ambience recordings: sources and licenses

All recordings in this folder are re-encoded excerpts of field recordings published in the **Moodist** project
(https://github.com/remvze/moodist, `public/sounds/`). Moodist's code is MIT. Its README ("Third-Party Assets") states that the
sounds are sourced from third parties under one of two licenses:

- **CC0 1.0** (public domain dedication): https://creativecommons.org/publicdomain/zero/1.0/
- **Pixabay Content License**: https://pixabay.com/service/license-summary/ (free for commercial and non-commercial use, no attribution required; the one restriction is that the files may not be redistributed as a standalone sound collection)

**Per-file licence is NOT itemised upstream.** Moodist has no credits or licence list file (`CREDITS.md`, `SOUNDS.md`, `LICENSES.md` all 404 on `main`), no licence field in
`src/data/sounds/*.tsx`, and no usable ID3 metadata in the mp3s. So each file below is "CC0 or Pixabay Content License" and which of the two could not be determined per file.
Both licences allow the use here (a private two-person app, no resale of the audio, no attribution required). If the owner ever makes the app public or wants a strict per-file record,
the sounds must be re-verified or replaced; this is the one open item. Because both licences forbid selling or redistributing the sounds *as a collection*, keep this folder out of any public
"sounds pack" or template.

Processing (`tools/ambience/encode.py`): trimmed to the most stationary 10-40 s region, tail crossfaded into the head (equal power, 1.5-3 s) for a seamless loop, loudness-normalised to about -20 LUFS
(boost capped at +20 dB, peak limiter at -1 dBFS), written as Opus in WebM (80 kbps stereo / 48 mono) and AAC in M4A (64 / 40) for Safari.
One-shot sounds (thunder, owl, pages, bowl, creak, clank, whale) are several short segments joined into one file; the segment table is in `manifest.json`.

| id | kind | upstream file | length | size (webm + m4a) |
|---|---|---|---|---|
| `birds` | loop | `public/sounds/animals/birds.mp3` | 40.0 s | 795 KB |
| `brown` | loop | `public/sounds/noise/brown-noise.wav` | 7.61 s | 82 KB |
| `cafe` | loop | `public/sounds/places/cafe.mp3` | 40.0 s | 609 KB |
| `chimes` | loop | `public/sounds/things/wind-chimes.mp3` | 40.0 s | 892 KB |
| `city` | loop | `public/sounds/urban/busy-street.mp3` | 40.0 s | 697 KB |
| `clock` | loop | `public/sounds/things/clock.mp3` | 14.0 s | 138 KB |
| `club` | loop | `public/sounds/places/crowded-bar.mp3` | 40.0 s | 710 KB |
| `crickets` | loop | `public/sounds/animals/crickets.mp3` | 40.0 s | 882 KB |
| `crowd` | loop | `public/sounds/urban/crowd.mp3` | 40.0 s | 609 KB |
| `drips` | loop | `public/sounds/nature/droplets.mp3` | 40.0 s | 746 KB |
| `fire` | loop | `public/sounds/nature/campfire.mp3` | 40.0 s | 735 KB |
| `frogs` | loop | `public/sounds/animals/frog.mp3` | 40.0 s | 742 KB |
| `gulls` | loop | `public/sounds/animals/seagulls.mp3` | 40.0 s | 424 KB |
| `hall` | loop | `public/sounds/places/church.mp3` | 40.0 s | 423 KB |
| `keys` | loop | `public/sounds/things/keyboard.mp3` | 10.25 s | 187 KB |
| `labHum` | loop | `public/sounds/places/laboratory.mp3` | 18.83 s | 392 KB |
| `leaves` | loop | `public/sounds/rain/rain-on-leaves.mp3` | 39.22 s | 742 KB |
| `library` | loop | `public/sounds/places/library.mp3` | 40.0 s | 665 KB |
| `pink` | loop | `public/sounds/noise/pink-noise.wav` | 7.61 s | 115 KB |
| `rainHeavy` | loop | `public/sounds/rain/heavy-rain.mp3` | 19.39 s | 333 KB |
| `rainLight` | loop | `public/sounds/rain/light-rain.mp3` | 40.0 s | 682 KB |
| `rainUmbrella` | loop | `public/sounds/rain/rain-on-umbrella.mp3` | 24.15 s | 543 KB |
| `rainWindow` | loop | `public/sounds/rain/rain-on-window.mp3` | 30.74 s | 544 KB |
| `river` | loop | `public/sounds/nature/river.mp3` | 40.0 s | 766 KB |
| `roomTone` | loop | `public/sounds/things/ceiling-fan.mp3` | 13.19 s | 142 KB |
| `ship` | loop | `public/sounds/transport/sailboat.mp3` | 40.0 s | 693 KB |
| `telemetry` | loop | `public/sounds/things/morse-code.mp3` | 40.0 s | 436 KB |
| `temple` | loop | `public/sounds/places/temple.mp3` | 40.0 s | 729 KB |
| `train` | loop | `public/sounds/transport/train.mp3` | 24.0 s | 399 KB |
| `trainIn` | loop | `public/sounds/transport/inside-a-train.mp3` | 40.0 s | 670 KB |
| `underwater` | loop | `public/sounds/places/underwater.mp3` | 40.0 s | 764 KB |
| `village` | loop | `public/sounds/places/night-village.mp3` | 40.0 s | 682 KB |
| `vinyl` | loop | `public/sounds/things/vinyl-effect.mp3` | 40.0 s | 774 KB |
| `waterfall` | loop | `public/sounds/nature/waterfall.mp3` | 21.09 s | 360 KB |
| `waves` | loop | `public/sounds/nature/waves.mp3` | 40.0 s | 675 KB |
| `wind` | loop | `public/sounds/nature/wind.mp3` | 40.0 s | 672 KB |
| `windHowl` | loop | `public/sounds/nature/howling-wind.mp3` | 40.0 s | 601 KB |
| `windTrees` | loop | `public/sounds/nature/wind-in-trees.mp3` | 40.0 s | 686 KB |
| `bowl` | event | `public/sounds/things/singing-bowl.mp3` | 26.5 s | 462 KB |
| `clank` | event | `public/sounds/things/slide-projector.mp3` | 12.4 s | 198 KB |
| `creak` | event | `public/sounds/transport/sailboat.mp3` | 20.5 s | 330 KB |
| `owl` | event | `public/sounds/animals/owl.mp3` | 7.6 s | 76 KB |
| `pages` | event | `public/sounds/things/paper.mp3` | 11.3 s | 169 KB |
| `thunder` | event | `public/sounds/rain/thunder.mp3` | 46.5 s | 749 KB |
| `whale` | event | `public/sounds/animals/whale.mp3` | 26.5 s | 510 KB |

Total for both codecs: 24.8 MB (a browser downloads only one codec, about half).

Not found in the library (substituted or left out): ice creak, camel bells, bamboo water, a real hammer strike ("clunk" is the slide-projector's mechanical change), room tone is the ceiling-fan recording. None of these were auditioned by ear in the build container: judge each by listening.
