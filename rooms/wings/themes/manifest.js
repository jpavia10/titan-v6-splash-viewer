/* Titan Reliquary: World manifest (data only). See notes/agents/theme-pot.md and notes/agents/theme-art.md.
   A World = { id, name, collection, mood, tier, art:{hero,card}|null, tokens, fx, scene }.
   - id: the data-atmo id (kept stable so saved choices carry over).
   - tier "signature": tokens (CSS custom properties only) + art + fx + scene; no layout overrides.
     tier "classic": an old atmosphere that still has its own stylesheet (styles/atmo/<id>.css).
   - art: filenames under art/themes/ (2026-10-01: from the Grok image queue, docs/art/requests/; kaleido re-done from Grok). null = no photoreal art yet (the picker shows the swatch).
   - tokens: custom properties applied inline on <html> for signature worlds.
   - fx / scene: TitanFX preset id and TitanGen scene id (null until those exist). */
(function () {
  "use strict";
  var A = function (id) { return { hero: id + ".webp", card: id + "-card.webp" }; };
  var C = function (id) { return { hero: null, card: id + "-card.webp" }; };   // picker card only (Grok, artreq_20261010-1700_theme-thumbnails); a hero comes later
  var worlds = [
    { id: "kaleido", name: "Prism", collection: "Otherworld", tier: "classic", art: A("kaleido"),
      mood: "A silver coin on cut crystal, splitting light into rainbows.", fx: "style-kaleido+style-holo*0.4", fxIntensity: 0.8, scene: "prism", tokens: {} },
    { id: "afterhours", name: "Midnight Gallery", collection: "Museum", tier: "classic", art: A("afterhours"),
      mood: "Cold moonlight on black marble, the gallery after midnight.", fx: "style-particles+moonlit*0.35", fxIntensity: 0.85, scene: "midnight-gallery", tokens: {} },
    { id: "conservator", name: "Conservator", collection: "Museum", tier: "classic", art: C("conservator"),
      mood: "Archival paper and ledger lines, the conservator's desk at noon.", fx: "style-halftone+loupe*0.4", fxIntensity: 0.7, scene: "conservator", tokens: {} },
    { id: "colossus", name: "The Mint", collection: "Treasure", tier: "classic", art: A("colossus"),
      mood: "Molten silver, the coining press, ember light.", fx: "style-liquid+mint-forge*0.5", fxIntensity: 0.85, scene: "mint", tokens: {} },
    { id: "nocturne", name: "Nocturne", collection: "Moods", tier: "classic", art: C("nocturne"),
      mood: "A smoky jazz cellar: deep blue, brass, art deco.", fx: "fxk", fxIntensity: 0.85, scene: "bluenote", tokens: {} },
    { id: "odyssey", name: "Odyssey", collection: "Journeys", tier: "classic", art: C("odyssey"),
      mood: "A night voyage toward an amber dawn.", fx: "voyage", fxIntensity: 0.85, scene: "cabin", tokens: {} },
    { id: "cursedwing", name: "The Cursed Wing", collection: "Otherworld", tier: "classic", art: C("cursedwing"),
      mood: "Black wax, blood-red seals, something in the walls.", fx: "crypt", fxIntensity: 0.9, scene: "crypt", tokens: {} },
    { id: "abyss", name: "Shipwreck", collection: "Treasure", tier: "classic", art: A("abyss"),
      mood: "Forty fathoms down, god rays on a wreck.", fx: "deepsea", fxIntensity: 0.9, scene: "shipwreck", tokens: {} },
    { id: "neon", name: "Neon Vault", collection: "Otherworld", tier: "classic", art: C("neon"),
      mood: "Neon noir: buzzing tubes, rain on wet asphalt, fog lit pink and cyan.", fx: "fxk", fxIntensity: 0.01, scene: "nightcity", tokens: {} },
    { id: "notepad", name: "Plaintext", collection: "Utility", tier: "classic", art: C("notepad"),
      mood: "Black on white. Just the coins.", fx: "paperink", fxIntensity: 0.6, scene: "privatebank", tokens: {} },
    { id: "construct", name: "The Construct", collection: "Otherworld", tier: "classic", art: C("construct"),
      mood: "Green phosphor and falling code.", fx: "style-ascii", fxIntensity: 0.8, scene: "blacksite", tokens: {} },
    { id: "xeno", name: "Xenohold", collection: "Otherworld", tier: "classic", art: C("xeno"),
      mood: "Bioluminescent containment for strange artifacts.", fx: "spores", fxIntensity: 0.85, scene: "xenohold", tokens: {} },
    { id: "solaris", name: "Solar Observatory", collection: "Journeys", tier: "classic", art: C("solaris"),
      mood: "Coronagraph gold on deep indigo.", fx: "style-wireframe+coronagraph*0.5", fxIntensity: 0.85, scene: "observatory", tokens: {} },
    { id: "alchemist", name: "The Alchemist", collection: "Otherworld", tier: "classic", art: C("alchemist"),
      mood: "Emerald vitriol and glowing hermetic rings.", fx: "athanor", fxIntensity: 0.85, scene: "alchemist", tokens: {} },
    { id: "glacier", name: "Hyperborean Vault", collection: "Treasure", tier: "classic", art: C("glacier"),
      mood: "A bullion reserve in Arctic bedrock under aurora.", fx: "style-ice-glass+polar-ice*0.4", fxIntensity: 0.85, scene: "polar", tokens: {} },
    { id: "valhalla", name: "Gilded Armory", collection: "Treasure", tier: "classic", art: C("valhalla"),
      mood: "Viking hoard hall by hearthfire.", fx: "mead-hall", fxIntensity: 0.9, scene: "hoard", tokens: {} },
    { id: "dynasty", name: "Dynasty", collection: "Treasure", tier: "classic", art: C("dynasty"),
      mood: "Imperial lacquer, cinnabar and 24K gold foil.", fx: "lantern-feast", fxIntensity: 0.85, scene: "imperial", tokens: {} },
    { id: "zen", name: "Zen Garden", collection: "Moods", tier: "classic", art: C("zen"),
      mood: "Raked gravel, wet slate and falling petals.", fx: "fxk", fxIntensity: 0.85, scene: "temple", tokens: {} },
    { id: "samadhi", name: "Samadhi", collection: "Moods", tier: "classic", art: C("samadhi"),
      mood: "Saffron, sandalwood smoke and stillness.", fx: "style-mesh+incense-curl*0.5", fxIntensity: 0.85, scene: "samadhi", tokens: {} },
    { id: "silkroad", name: "Silk Road", collection: "Journeys", tier: "classic", art: C("silkroad"),
      mood: "Desert caravanserai, lapis tiles, starlight.", fx: "dunes", fxIntensity: 0.85, scene: "caravanserai", tokens: {} },
    /* styles-20 (2026-10-10, notes/agents/styles-20.md): six token-only themes, one per style that no existing theme could host.
       Tokens live in styles/atmo/{id}.css (token block only) so they paint before any script; `ui` switches on shared treatments
       from styles/style-layer.css; `styles` names the styles from the owner's video each theme carries. Art: queued (rule 9). */
    { id: "arcade", name: "Arcade", collection: "Studio", tier: "signature", art: C("arcade"), ui: ["pixel"], styles: ["Pixel art"],
      mood: "Insert coin: an 8-bit arcade where every piece is a token.", fx: "style-pixel", fxIntensity: 0.85, scene: "arcade", tokens: {} },
    { id: "pulp", name: "Pulp Adventure", collection: "Studio", tier: "signature", art: C("pulp"), ui: ["paper", "brutal", "comic"], styles: ["Comic book"],
      mood: "A 1940s treasure-hunt comic: ink, Ben-Day dots, a POW on every find.", fx: "style-comic", fxIntensity: 0.8, scene: "pulp", tokens: {} },
    { id: "drafting", name: "Drafting Room", collection: "Museum", tier: "signature", art: C("drafting"), ui: ["blueprint"], styles: ["Blueprint"],
      mood: "The engraver's drafting room: every coin drawn to scale.", fx: "style-blueprint", fxIntensity: 0.85, scene: "drafting", tokens: {} },
    { id: "diorama", name: "Clay Diorama", collection: "Studio", tier: "signature", art: C("diorama"), ui: ["paper", "clay"], styles: ["Clay 3D", "Isometric"],
      mood: "A miniature vault in soft clay, seen from above like a toy model.", fx: "style-clay", fxIntensity: 0.65, scene: "diorama", tokens: {} },
    { id: "bauhaus", name: "Bauhaus", collection: "Studio", tier: "signature", art: C("bauhaus"), ui: ["paper", "brutal"], styles: ["Bauhaus", "Kinetic type"],
      mood: "Primary shapes and moving type: the coin legends as a Bauhaus poster.", fx: "style-bauhaus+style-kinetic*0.8", fxIntensity: 0.8, scene: "bauhaus", tokens: {} },
    { id: "terminal", name: "Grand Terminal", collection: "Journeys", tier: "signature", art: C("terminal"), ui: ["board"], styles: ["Split-flap"],
      mood: "A grand railway hall at night: fifty countries on the departures board.", fx: "style-splitflap", fxIntensity: 0.85, scene: "terminal", tokens: {} },
    { id: "obsidian", name: "Obsidian Sun", collection: "Studio", tier: "signature", art: null, ui: [], styles: ["Volcanic glass & jade"],
      mood: "Concentric Mesoamerican calendar rings of hammered gold and carved jadeite rotate over a polished volcanic-glass mirror holding your coins at the sun's center. Open a coin and the calendar rings index and lock onto it; tap the stone to send a golden shockwave through the glyphs.", fx: "fxk", fxIntensity: 0.01, scene: "obsidian", tokens: {} },
    { id: "lightwell", name: "Light Well", collection: "Studio", tier: "signature", art: A("lightwell"), ui: [], styles: ["Brutalist sanctuary"],
      mood: "A quiet architectural rotunda of board-formed concrete pierced by a single razor blade of golden sun that sweeps across your coins on a monolithic plinth. Open a coin to place it in the sunbeam; tap the beam to stir a vortex of illuminated dust motes.", fx: "fxk", fxIntensity: 0.01, scene: "lightwell", tokens: {} },
    { id: "saltflat", name: "Salt Mirror", collection: "Studio", tier: "signature", art: A("saltflat"), ui: [], styles: ["Altiplano salt mirror"],
      mood: "An endless flooded salt flat at twilight where a thin film of brine doubles the star-streaked cobalt sky above submerged hexagonal salt ridges. Open a coin and it rises on a crystalline salt pedestal mirrored in the water; tap anywhere to send concentric ripple rings across the horizon.", fx: "fxk", fxIntensity: 0.01, scene: "saltflat", tokens: {} },
    { id: "sahel", name: "Sahel Futurism", collection: "Studio", tier: "signature", art: A("sahel"), ui: [], styles: ["Sahelian solar architecture"],
      mood: "Monumental mudbrick towers and tracking brass heliostat mirrors rise through golden Harmattan dust haze toward a volumetric desert sun. Open a coin and the heliostat array aligns its golden beam onto the adobe plinth; tap to send a warm Harmattan dust gust across the towers.", fx: "fxk", fxIntensity: 0.01, scene: "sahel", tokens: {} },
    { id: "orbit", name: "Low Orbit", collection: "Studio", tier: "signature", art: A("orbit"), ui: [], styles: ["Orbital cupola"],
      mood: "Looking down through a space-station cupola window as Earth's curved Rayleigh-scattered limb, nocturnal city-light webs, and an orbital sunrise sweep below your coins. Open a coin to lock it in the cupola reticle; tap to trigger an attitude-thruster star flare.", fx: "fxk", fxIntensity: 0.01, scene: "orbit", tokens: {} },
    { id: "glasshouse", name: "The Glasshouse", collection: "Studio", tier: "signature", art: A("glasshouse"), ui: [], styles: ["Victorian conservatory"],
      mood: "A Victorian iron-and-glass palm conservatory in steady evening rain: refractive raindrops trail down a steamed pane while lush palms glow behind the condensation. Open a coin to view it through the cleared glass medallion; drag or tap to wipe the fog from the pane.", fx: "fxk", fxIntensity: 0.01, scene: "glasshouse", tokens: {} },
    { id: "canopy", name: "Cloud Forest", collection: "Studio", tier: "signature", art: A("canopy"), ui: [], styles: ["Montane cloud forest"],
      mood: "A dripping cloud forest at dawn: shafts of emerald sun pierce three layers of giant tree-fern fronds while fireflies drift past a mossy basalt altar holding your coins under a lens of clear rainwater. Open a coin to place it on the wet stone; tap the canopy to shake a shower of dewdrops and scatter the fireflies.", fx: "fxk", fxIntensity: 0.01, scene: "canopy", tokens: {} },
    { id: "silverscreen", name: "Silver Screen", collection: "Studio", tier: "signature", art: A("silverscreen"), ui: [], styles: ["Silent cinema"],
      mood: "A 1920s picture palace from the stalls: a silent newsreel of your coins on the screen, a title card for each and then its shot, the projector's beam over your head. Open a coin and it is the next picture; tap the beam to stir the dust.", fx: "fxk", fxIntensity: 0.01, scene: "silverscreen", tokens: {} },
    { id: "darkroom", name: "Darkroom", collection: "Studio", tier: "signature", art: A("darkroom"), ui: [], styles: ["Analog darkroom"],
      mood: "A darkroom under the red safelight: your coins come up as prints in the developer, one after another. Open a coin and its print is next; tap the tray to rock it.", fx: "fxk", fxIntensity: 0.01, scene: "darkroom", tokens: {} },
    { id: "tourbillon", name: "Tourbillon", collection: "Studio", tier: "signature", art: A("tourbillon"), ui: [], styles: ["Haute horlogerie"],
      mood: "Inside a watch movement under the loupe: C\u00f4tes de Gen\u00e8ve, blued screws, rubies and a flying tourbillon turning on the real seconds. Tap to wind it, hold for the repeater.", fx: "fxk", fxIntensity: 0.01, scene: "tourbillon", tokens: {} },
    { id: "supercell", name: "Supercell", collection: "Studio", tier: "signature", art: A("supercell"), ui: [], styles: ["Volumetric storm"],
      mood: "A rotating thunderstorm at dusk over open plains, lit from inside by lightning. Tap the sky to call a strike.", fx: "fxk", fxIntensity: 0.01, scene: "supercell", tokens: {} },
    { id: "kintsugi", name: "Kintsugi", collection: "Studio", tier: "signature", art: C("kintsugi"), ui: [], styles: ["Gold-mended glaze"],
      mood: "Black raku glaze mended with liquid gold. Tap to crack the glaze and watch gold run in and seal it.", fx: "fxk", fxIntensity: 0.01, scene: "kintsugi", tokens: {} },
    { id: "horizon", name: "Event Horizon", collection: "Otherworld", tier: "signature", art: C("horizon"), ui: [], styles: ["Black hole"],
      mood: "A black hole up close: a blazing accretion disk, light bent into rings, and stars smeared around the dark. Drag to orbit; hold to lean in.", fx: "fxk", fxIntensity: 0.01, scene: "horizon", tokens: {} },
    { id: "rift", name: "Rift Garage", collection: "Otherworld", tier: "signature", art: C("rift"), ui: [], styles: ["Rift lab"],
      mood: "A garage workshop at 2 a.m. with a swirling green rift torn open over the workbench. Tap to pop a pocket rift; hold to charge the big one.", fx: "fxk", fxIntensity: 0.01, scene: "rift", tokens: {} },
    { id: "lumen", name: "Lumen Circuit", collection: "Otherworld", tier: "signature", art: C("lumen"), ui: [], styles: ["Light grid"],
      mood: "A black glass grid at night: runners of light race the lanes and leave walls of light behind them. Touch to launch your own.", fx: "fxk", fxIntensity: 0.01, scene: "lumen", tokens: {} },
    { id: "ferro", name: "Ferrofluid", collection: "Otherworld", tier: "signature", art: C("ferro"), ui: [], styles: ["Ferrofluid"],
      mood: "A pool of mirror-black ferrofluid that stands up in spikes wherever your finger goes.", fx: "fxk", fxIntensity: 1.0, scene: "ferro", tokens: {} },
    { id: "marbled", name: "Marbled Endpapers", collection: "Studio", tier: "signature", art: null, ui: ["paper", "endpaper"], styles: ["Marbled paper"],
      mood: "A bookbinder's endpapers: marbled paper in indigo, oxblood and ochre swirls slowly at the edges of every page.", fx: "style-marble", fxIntensity: 0.85, scene: "marbled", tokens: {} },
    { id: "cathedral", name: "Cathedral Glass", collection: "Studio", tier: "signature", art: null, ui: ["lead"], styles: ["Stained glass"],
      mood: "A nave at dusk: a rose window of jewel-coloured glass, lit by a slow sun, throwing coloured light across the collection.", fx: "style-glass", fxIntensity: 0.85, scene: "cathedral", tokens: {} },
    { id: "contour", name: "Survey Map", collection: "Studio", tier: "signature", art: null, ui: ["topo"], styles: ["Topographic"],
      mood: "A night survey chart: glowing contour lines of a slowly shifting terrain, and now and then a survey ping.", fx: "style-topo", fxIntensity: 1.05, scene: "contour", tokens: {} },
    { id: "banknote", name: "Treasury Note", collection: "Studio", tier: "signature", art: null, ui: ["paper", "note"], styles: ["Guilloche"],
      mood: "Engraved like a banknote: guilloche rosettes shimmer in fine green lines and the treasury seal stamps in red.", fx: "style-guilloche", fxIntensity: 0.85, scene: "banknote", tokens: {} },
    { id: "freefall", name: "Free Fall", collection: "Studio", tier: "signature", art: null, ui: ["spring"], styles: ["Physics"],
      mood: "A physics lab at night: coins rain from above, bounce, roll and heap up. Tap to knock them about.", fx: "style-physics", fxIntensity: 0.9, scene: "freefall", tokens: {} },
    { id: "sketch", name: "Sketchbook", collection: "Studio", tier: "signature", art: null, ui: ["paper", "sketch"], styles: ["Hand-drawn"],
      mood: "Pencil on drawing paper: doodles sketch themselves in the margins while the collection is drawn by hand.", fx: "style-sketch", fxIntensity: 0.85, scene: "sketch", tokens: {} },
    { id: "papercut", name: "Paper Hills", collection: "Studio", tier: "signature", art: null, ui: ["paper", "papercut"], styles: ["Paper cutout"],
      mood: "A layered paper landscape: hills, sun and balloons cut from card, the collection pinned to the paper.", fx: "style-papercut", fxIntensity: 0.6, scene: "papercut", tokens: {} },
    { id: "y2k", name: "Millennium Chrome", collection: "Studio", tier: "signature", art: null, ui: ["paper", "chrome"], styles: ["Y2K chrome"],
      mood: "Liquid chrome and pastel sparkle: the collection as a Y2K dream, every coin polished to a mirror.", fx: "style-y2k", fxIntensity: 0.85, scene: "y2k", tokens: {} }
  ];
  /* styles-20: the styles each existing theme now carries (shown on its picker card) and its shared UI treatments */
  var STYLE_OF = { afterhours: ["Particles"], colossus: ["Liquid morph"], kaleido: ["Holographic"], neon: ["Neon noir", "Volumetric fog", "Wet reflections"],
    solaris: ["Wireframe 3D"], glacier: ["Glassmorphism"], samadhi: ["Gradient mesh"], nocturne: ["Art deco"], conservator: ["Halftone"],
    notepad: ["Neo-brutalism"], construct: ["ASCII art"] };
  var UI_OF = { notepad: ["brutal"] };
  worlds.forEach(function (w) { if (STYLE_OF[w.id]) w.styles = STYLE_OF[w.id]; if (UI_OF[w.id]) w.ui = UI_OF[w.id]; });
  window.TITAN_WORLDS = worlds;
  /* Names (Grok 2026-10-20): the display name is the human label; the id never changes (saved choices, CSS, files use it).
     Everywhere a theme is named for people (logs, reports, commits, tests) print label(id) = "Display Name (id)".
     ALIASES lists every id that reads like a different name, so nobody hunts for "Valhalla" again. A new divergent id must be added
     here (tools/themes/test_names.js fails otherwise). */
  window.TITAN_WORLD_ALIASES = {
    kaleido: "Prism", afterhours: "Midnight Gallery", colossus: "The Mint", abyss: "Shipwreck", notepad: "Plaintext",
    solaris: "Solar Observatory", glacier: "Hyperborean Vault", valhalla: "Gilded Armory",
    contour: "Survey Map", banknote: "Treasury Note", papercut: "Paper Hills", y2k: "Millennium Chrome", canopy: "Cloud Forest", saltflat: "Salt Mirror"
  };
  /* TitanRegistry: the ONE theme registry. The picker, intros (js/intros/<id>.js), sound scene (world.scene), UI voice, coin-page
     world, FX (world.fx) and stylesheets (styles/atmo/<id>.css) are all keyed by these ids; tools/themes/test_registry.py fails
     on anything missing or orphaned. Add a theme here first (tools/themes/add_theme.py). */
  window.TitanRegistry = {
    ids: function () { return worlds.map(function (w) { return w.id; }); },
    get: function (id) { return worlds.filter(function (w) { return w.id === id; })[0] || null; },
    label: function (id) { return window.TitanWorldLabel(id); },
    aliases: function () { return window.TITAN_WORLD_ALIASES; }
  };
  window.TitanWorldLabel = function (id) { var w = worlds.filter(function (x) { return x.id === id; })[0]; return w ? w.name + " (" + id + ")" : String(id); };
  window.TITAN_WORLD_BACKDROP = false;   // true = use the active World's hero art as the Hall hero backdrop (styles/worlds.css); easily removable
  window.TITAN_WORLD_COLLECTIONS = ["Museum", "Treasure", "Journeys", "Moods", "Otherworld", "Studio", "Utility"];
})();
