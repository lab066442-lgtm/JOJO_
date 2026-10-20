# v0.4.0 — verified delivery report

## Phase 0: audit

Base: the retained JOJO_KITTY_DREAMY_ISLAND_v0.3.zip. The attachment supplies requirements, not source. The old ZIP contained seven files: Three.js/Vite, a single scene/UI module, CSS and empty asset instructions. No GLBs, textures or sound files were supplied. Its package version still said 0.1.0.

Critical findings repaired:
- `tree()` returned undefined, then district construction dereferenced its children: fatal boot error.
- The `city` group containing terrain and roads was never attached to the scene.
- Missing quest IDs caused quest panel rendering to throw.
- Missing character GLB requested from an absolute root URL; requests removed because there is no real asset to load.
- Root-absolute entry URLs and CDN import map made repository subpath deployment brittle. Vite now bundles dependencies using a relative base.
- Save shallow-merge discarded nested defaults; position was not restored or synchronized. Added migration and validation using the same save key.
- Keyboard movement absent, reversed camera orientation, no physical collision.
- Fake instant harvesting, automatic fishing payouts, cooking payouts without actual orders, inert bag/map controls.
- Home shared a parcel with a static building and wall array coordinates were malformed.
- NEW SAVE could be overwritten by the pagehide save handler; fixed.
- Bag buttons lost listeners due to innerHTML reconstruction; fixed and covered by integration test.

## Implemented

A connected stylized town with plaza fountain, enriched storefront facades/awnings/signs/rooflines, restaurant and home parcels, cherry blossom garden, farm, beach/pier, transit and arcade. Original procedural models are preserved and improved; no existing art was replaced by downloaded placeholders.

Gameplay: keyboard/touch walking; camera drag/zoom; building/fountain/pond/boundary collisions; nine café stages; guest arriving → order → ingredient charge → timed cooking → serving → cash collection; observable hired server movement; basic home construction/rest; NPC-specific advice, chats/gifts/friendship; Mochi follows, eats carrots, plays, and tracks hunger/happiness; six seeded/watered/timed farm plots; cast/wait/timed-reel fishing; selling inventory and buying seeds; car purchase/spawn/enter/steer/accelerate/brake/exit; paid instant station transfer; rhythm minigame; five unique collectibles; eight one-time quests; map destination distance tracking; manual quality; diagnostics; local autosave/import/export.

New saves have exactly 50 coins. The early quests provide enough money to reach the kitchen/dining stage. Transit is explicitly a menu transfer, not a claimed physical running train.

## Actual validation

- `npm install --no-audit --no-fund`: success; pinned versions and package-lock included.
- `npm run check`: success.
- `npm test`: 12 passed, 0 failed.
- `npm run build`: success. Vite reports a bundle over 500 kB; this is a warning, not a build error. Three.js is bundled locally.
- Test coverage: legacy migration, corrupted fields, 50-coin start, one-time quests, affordability, rollback, crop timing/reload/no duplicate harvest, restaurant states/reload/no duplicate pay, ingredient alternatives, scene construction, inventory purchases/sales, six construction steps, complete restaurant UI cycle, and 100 scene update frames.
- The scene integration test uses real Three.js scene objects and happy-dom with **a stubbed WebGL renderer**. It is not visual, GPU, actual touch-input or FPS verification.
- Browser opened the actual page at the internal preview URL. The environment failed to create a WebGL context before scene construction. The page showed an explicit error rather than an endless loading spinner. Visual quality, GPU performance, mobile touch, collision feel and real browser gameplay remain unverified. No claim of 60 FPS or full mobile QA.
- GitHub upload/deployment was not performed. Prebuilt docs and a Pages workflow are supplied.

## Remaining requirements (not completed)

The AGENTS.md roadmap is substantially larger than this release. Do not label phases 1–13 fully accepted without real browser/device QA. Remaining: fully art-directed expansive 17 districts, GLB skeletal animations, realistic/audio assets, modern city and harbor activities, traversable mountains/waterfall, authorized themed districts, physical trains/boats, amusement rides, advanced restaurant queue/cleaning/multiple-table AI/conveyors/storage/upper floors, furniture placement/rotation/collision editor, pet naming/cosmetics/rest/energy, NPC schedules/pathfinding, chapter story/daily-weekly-seasonal quests, richer inventories/equipment, streaming/LOD/instancing and device performance profiling.

Current limits: single-player/local storage; one active café order; NPCs wander in small circles and provide advice, not full schedules; buildings outside owned parcels are primarily exteriors; procedural low-poly art; several broad road-grid/layout details inherited from v0.3; generic collision approximation; interiors use roof hiding, not full occlusion solving; panels pause movement but the world clock continues; farm and cooking use wall-clock timestamps, pet needs evolve during play. Currency is client-owned and is not anti-cheat protected.

Next acceptance gate: run the packaged site on a real WebGL 2 desktop and Android browser, verify mobile layout, drive/collision/entrance flow, complete café/farm/fishing loops, reload every purchase/state, and measure frame time before expanding the districts.
