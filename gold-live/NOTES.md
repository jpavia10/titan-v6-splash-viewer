# TITAN RELIQUARY live intro (Obsidian theme) — PREVIEW, not gold until Joseph scores it
LIVE WebGL2 GPU particle sim (TitanFXK), not Cycles, not an mp4. Offline bake killed.
- Stack: atmos (portal vortex + aurora + light grid + fog) → raymarched volume → 3 GPGPU particle fields (spark shards, ember streaks, cyan motes; up to millions) → HDR post (bloom, trails, chroma).
- Sound ↔ physics: all audio runs through an AnalyserNode. `K.audioCouple(analyser)` sets `K.bass` (0..1, <110 Hz) every frame (boosts curl turbulence, coin scale, saturation) and on bass onsets fires `K.shock()` which shoves every particle outward (core blast + travelling ring + swirl). The boom is synthesised (sub drop, thump, crack, glass shimmer, convolution hall) — no music, no Deep Note/THX chord.
- `K.shock(x,y,power)` public: tap fires one + small boom.
- Quality tiers (buttons, persisted in localStorage tr_fxk_tier, ?tier=): Low 384² · Medium 640² · High 1024² (phone default, S24 floor) · Ultra 1448² (desktop default) · Max 2048² uncapped fps. Per-field count multiplies these.
- Chill realm button: pad + slow sub heartbeats every 6–9 s gently push the field (ambient second realm).
- Coin: generated vector medal, 3D spin kicked by bass; particles flow around it (obstacle).
