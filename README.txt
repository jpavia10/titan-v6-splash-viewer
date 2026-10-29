THEME ROOMS (Claude, 2026-10-29): rooms/ is the test site for the theme rooms and the openings on each theme's own engine
  (owner rule 12 in the app repo). Open rooms/ on the phone. The world code in rooms/fx and rooms/audio is copied from the app
  by tools/rooms/sync_test_site.sh in jpavia10/titan-reliquary-preview; edit it there, not here.

TITAN RELIQUARY — GEMINI V6 SPLASH VIEWER (TEMPORARY)
STATUS: REJECTED package. Review only. Do NOT merge or ship.

HOW TO OPEN
  Easiest: double-click index.html (Chrome/Edge/Firefox).
  If videos/iframe misbehave from file://, run a local server:
     cd viewer
     python3 -m http.server 8765
  then open http://localhost:8765/

FILES
  index.html        Hub: reject banner + reasons, 5 preview videos (keys 1-5), theater link, 390x844 phone frame
  theater.html      Gemini's WebGL theater, all 54 intros, picker. Offline: Tailwind CDN + Google Fonts removed
  tw-lite.css       Small local stand-in for Tailwind so theater stays laid out offline
  media/*.mp4       Gemini preview clips: obsidian, colossus, tourbillon, silverscreen, quad
  GROK_V6_SPLASH_REVIEW_20261027.md   Grok's review / reject notes
  ALL_54_V6_HOLLYWOOD_THX_INTROS_BUNDLE.json, motion-splash-v6.js   Raw Gemini source (reference)
