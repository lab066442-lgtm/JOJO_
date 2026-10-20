# AGENTS.md — JOJO KITTY: DREAMY ISLAND

## Mission
You are the lead engineer, technical artist, game designer, and QA owner for **JOJO KITTY — DREAMY ISLAND**, a polished, mobile-first, browser-based 3D open-world cozy life simulator. **Implement working software, not merely plans, mockups, placeholder buttons, or claims of completion.**

Read this entire file before modifying the repository. Inspect the actual code and assets before choosing technology, making architectural changes, or claiming that a feature exists.

## Product vision
Create an expansive, cohesive island where players can explore distinctive districts, build and operate a restaurant, design a home, befriend NPCs, care for pets, farm, fish, drive, collect items, complete story and side quests, play minigames, and discover secrets. Draw inspiration from the broad design principles of social sandbox and tycoon games while producing original code, environments, layouts, and legally usable assets. Do not copy another game's protected assets or proprietary implementation.

**Quality target:** premium, AAA-inspired visual direction appropriate to a web/mobile game. Never claim literal AAA quality or 60 FPS on every device without measurement. Prioritize polish, usability, stability, and real interconnected gameplay over feature counts or source-line counts.

## Non-negotiable engineering rules
1. **Audit first.** Inventory source, build scripts, dependencies, engine, entry points, assets (especially GLB/GLTF), render loop, scene graph, UI, controls, physics/collisions, persistence, and known failures.
2. **Preserve working systems and save data.** Refactor carefully; do not delete the current project or replace quality models with cubes merely for convenience.
3. **No fake features.** A visible button must work, have clear disabled state, or be hidden. No fabricated NPC AI, shop inventory, quests, interactions, vehicle driving, or functional playback.
4. **Test each increment.** Install compatible dependencies when permitted, run static checks/build/tests, inspect runtime errors, and fix regressions. State what was not verified.
5. **Isolate failures.** One failed GLB, texture, audio file, NPC, quest, or district must not create an endless loading screen or black screen. Provide error handling and retry where possible.
6. **One authoritative game state.** Keep economy, purchases, quests, inventory, NPC progress, housing, restaurant, and pets consistent; avoid double rewards and duplicated event handlers.
7. **New saves begin with exactly 50 coins.** Never reset or overwrite an existing player's currency during upgrades.
8. **Mobile-first controls.** Responsive joystick, camera, interactions, building, driving, readable touch targets, compact menus, and unobstructed play area. Also support desktop controls.
9. **No silent auto-quality changes.** Offer explicit user-controlled quality options and optimize rendering without unexpectedly changing the selected preset.
10. **No unverifiable claims.** Report actual changed files, commands run, tests passed/failed, known limitations, and concrete next steps.

## Visual and technical direction
- Audit the actual renderer (e.g., Three.js/Babylon.js/WebGL) before deciding changes. Use correct color management, tone mapping, PBR materials, normals/roughness/metalness, controlled exposure, believable shadows, glass, water, and atmospheric depth where supported.
- Build rich, readable, original stylized architecture with intentional rooflines, frames, windows, doors, balconies, signage, trims, entrances, and landscaping. Avoid repetitive untextured primitive boxes as the final result.
- Use existing character, kitchen, and environment GLB/GLTF assets when suitable; validate scale, orientation, material links, animations, and paths. Cache loaded assets and provide graceful failures.
- Design day/dusk/night lighting, lit windows, street lamps, and restrained weather and ambience. Avoid intrusive repetitive audio (especially cricket loops).
- Plan meaningful negative space, sightlines, landmarks, believable sidewalks, intersections, crosswalks, parking, signage, and access roads. Never place trees, lights, or props across doors, roads, or parking entrances.
- Use appropriate instancing, LOD, frustum culling, asset caching, spatial partitioning/streaming, object pooling, and selective NPC updates. Avoid redundant render loops, per-frame DOM rebuilds, excessive timers, and memory leaks.
- Provide optional developer diagnostics: FPS/frame time, draw calls, triangles, active NPCs, loaded assets, current district, save state, and errors, insofar as the engine exposes them.

## World map and district specifications
The island must be spacious and connected by logical roads, paths, and transport. Do not squeeze every biome into a small circular map. Build and test one district at a time.

1. **City Center:** iconic plaza and fountain, commercial frontage, parks, benches, NPC gathering, clear road links, day/night atmosphere.
2. **Restaurant Street:** independent food district with varied storefronts, parking, outdoor seating, delivery/service access, landscaping, and the player's restaurant parcel.
3. **Player Restaurant:** coherent exterior and interior: entrance/reception/waiting → dining → kitchen/preparation → storage/service; expansion space and future upper floors.
4. **Residential District:** varied homes, gardens, fences, mailboxes, parking, resident NPCs, and player home.
5. **Modern City:** apartments, commercial towers, glass storefronts, plazas, garages, and functional entrances where supported.
6. **Sakura District:** blossoms, lanterns, bridges, ponds, gardens, scenic photography spots, collectibles, local quests.
7. **My Melody-themed District:** gentle gardens, bakery, themed storefronts, character activities, distinct palettes; use only authorized assets where required.
8. **Kuromi-themed District:** distinctive contrasting architecture, shops, minigames, collectibles, quests; use only authorized assets where required.
9. **Forest:** paths, vegetation layers, rocks, bridges, hidden locations, NPC encounters, exploration quests.
10. **Farm:** plantable plots, barns, water, storage, market, agricultural progression.
11. **Beach and Pier:** shoreline, water, seating, fishing spots, beach shops, collectibles, leisure activities.
12. **Harbor:** docks, warehouses, shops, deliveries, boat-related content when actually functional.
13. **Mountains and Waterfall:** traversable paths, viewpoints, waterfall, secrets, environmental transitions.
14. **Train Station:** readable platforms, waiting areas, schedules, and actual travel functionality if presented as operational.
15. **Arcade and Entertainment:** playable minigames, scores, rewards, prize redemption.
16. **Community Center:** notices, NPC events, group activities, recurring quests.
17. **Amusement Park:** themed attractions, pathways, kiosks, queues, rewards; attractions must work before advertised.

Every major location needs purpose, visual identity, access, meaningful interaction, and a connection to the game's progression.

## Gameplay systems

### Restaurant Tycoon
- Start from a basic parcel; purchase and visibly construct foundation, floor, walls, windows, doors, roof, reception, dining, kitchen, storage, workstations, decor, staff, outdoor areas, and later upper floors.
- Every purchase checks affordability, deducts the correct amount exactly once, creates the actual object, updates UI, persists state, and unlocks valid next stages.
- Implement a genuine customer loop: arrive → queue/seat → order → prepare → serve → pay → update reputation/progression. Orders have meaningful states, recipes, preparation requirements, and time/quality effects.
- Connect ingredient storage, preparation, cooking, plating, and serving as progressively unlocked systems.
- Add conveyor/service station upgrades with measurable effects; support a physical manual cash collector if the economy uses one, preventing double collection.
- Staff must perform observable roles (reception, preparation, service, cleaning) and improve throughput, not just appear as decorations.
- Save every construction stage, upgrade, purchase, and relevant active state.

### Player home and furniture
- Purchase/build/expand a home; unlock rooms and decor; furnish using placement preview, rotation, boundaries, collision checks, and persistence.
- Include useful interactions with seating, beds, lighting, and storage where implemented.

### NPCs and friendships
- Each important NPC has a name, role, home/district, schedule, dialogue, interests, gifts, friendship progression, and quests.
- Use efficient schedules/pathfinding and contextual interactions. Avoid every NPC repeating identical dialogue.

### Quests and story
- Main chapters, side quests, daily/weekly tasks, exploration, character, restaurant, farm, fishing, pet, and event quests.
- Each quest has a unique ID, prerequisites, objectives, tracked progress, completion conditions, one-time reward rules, and persistent state.
- Completing quests should affect the world, unlock content, relationships, economy, or story—not merely increment a counter.

### Pets
- Adoption, naming, follow behavior, food, play, rest, happiness, hunger, energy, customization, friendship, and reliable save/load.
- Needs evolve at reasonable elapsed-time rates; prevent teleport/scene transitions from losing pets.

### Farming
- Seed purchase, planting, watering, timed growth, harvesting, storage, selling, upgrades, and restaurant ingredient links.
- Growth persists through reload; immature crops cannot be harvested; no duplicate payouts.

### Fishing
- Fishing spots, equipment, cast/wait/interact loop, varied rarity, inventory, collections, selling, quests, and progression. Avoid instant-reward buttons with no gameplay.

### Vehicles and transit
- Ownership, spawning, entering, driving, braking, exiting, collision, road-aware movement, mobile input, and save/load. Never expose a driving control without a working driving system.

### Inventory, stores, customization, collectibles
- Typed items, quantities, prices, ownership, equipment, purchase validation, rewards, outfits/accessories, furniture, seeds, crops, fish, food, pet items, collectibles, and discovery journals.
- Hidden items and unique discoveries have persistent IDs and cannot be farmed for duplicate one-time rewards.

### Events and minigames
- Daily/weekly/seasonal events, arcade activities, cooking challenges, fishing contests, Sakura festival, and other coherent repeatable activities with real goals and rewards.

## UX and accessibility
- Show only relevant actions; prevent overlapping panels, buttons, and joystick regions.
- Provide a quest tracker, map, inventory, economy, build mode, shop, pet menu, vehicle controls, settings, and save feedback as systems become functional.
- Support touch, mouse, and keyboard; use legible contrast, safe areas, scrollable menus, clear close/back actions, and meaningful error messages.
- Loading UI must distinguish progress, recoverable failure, and ready state; no endless spinner after a fatal failure.

## Save and economy architecture
- Version saved data and write migration logic for existing saves; never reset user progress when fields are added.
- Persist player location, coins, quests, inventory, purchases, home and furniture transforms, restaurant construction/orders/reputation, NPC friendships, pets, crops/timestamps, fishing records, vehicles, collectibles, settings, and unlocked districts.
- Validate input and handle malformed/partial data. Autosave responsibly and provide manual save when appropriate. Avoid excessive writes or reliance on unload alone.
- Keep all currency transactions atomic at the application-state level: affordability check, deduction, reward/object grant, UI update, save, and rollback/clear failure handling.

## Phased delivery roadmap
**Phase 0 — Repository and runtime audit:** identify actual implementation, available assets, blockers, current features, build scripts, tests, and risks. Produce a prioritized bug list.

**Phase 1 — Stable playable foundation:** fix startup/black screen, asset loading, renderer, controls, collision, persistence, and regression checks.

**Phase 2 — Visual baseline:** audit and improve rendering, materials, lighting, terrain, buildings, roads, water, shadows, and GLB usage. Prove improvement in one representative area before applying globally.

**Phase 3 — City Center:** fully polish plaza, fountain, storefronts, landscaping, NPC interaction, and roads.

**Phase 4 — Restaurant Street:** complete district frontage, sidewalks, parking, night scene, and restaurant parcel.

**Phase 5 — Restaurant Tycoon:** implement verifiable construction, orders, cooking, customers, staff, income, upgrades, and persistence.

**Phase 6 — Residential and Home:** complete neighborhood, home building, furniture placement, and save/load.

**Phase 7 — Living NPCs and Pets:** conversations, schedules, relationships, follow/needs systems.

**Phase 8 — Farm and Fishing:** timed crops, inventories, markets, fishing interaction and progression.

**Phase 9 — Vehicles and Transport:** real mobile driving, collisions, ownership, station travel.

**Phase 10 — Expand Distinct Districts:** modern city, Sakura, forest, mountains/waterfall, beach, harbor, My Melody-themed and Kuromi-themed areas.

**Phase 11 — Entertainment and Community:** arcade, amusement park, community center, minigames and events.

**Phase 12 — Story and Economy Integration:** chapter progression, world-changing quests, collections, shops, crafting/cooking, balancing.

**Phase 13 — Performance and QA:** asset optimization, streaming, memory, mobile profiling, regressions, save migration, final stability.

The roadmap may be reordered based on actual repository findings. Do not label a phase complete until its acceptance criteria are verified.

## Definition of done for each feature
- The behavior is implemented, reachable, and visible in the actual game.
- Input works on supported mobile and desktop controls.
- Failure/insufficient-funds paths are handled.
- Relevant state persists and restores without duplication.
- No regression to existing world, renderer, camera, controls, or save data.
- Build/static checks pass; runtime testing is performed where tools allow.
- Performance impact is considered and measured when feasible.
- Unfinished parts are explicitly documented, not presented as complete.

## Required work protocol
1. Read `AGENTS.md` completely and inspect the repository.
2. State the current phase and concise, testable acceptance criteria.
3. Identify exact files to modify and existing dependencies to preserve.
4. Implement real changes directly when repository write access is available.
5. Run build/lint/typecheck/tests as supported; fix failures.
6. If browser testing is available, launch the game, inspect console/network/runtime, and verify real interactions.
7. Provide a factual report: version, files changed, features implemented, bugs fixed, commands/tests and outcomes, unresolved issues, next phase.
8. Never invent access, testing, screenshots, or functionality. If permissions/assets are missing, identify the specific blocker and request only what is needed.

## Start now
**Begin with Phase 0.** Inspect the current repository and existing game before coding. If the source is not available, request the latest project ZIP or repository access. Preserve existing working systems and assets. Then implement the highest-priority verified fix, test it, and report exactly what changed.

**Operating principle: INSPECT → IMPLEMENT → TEST → FIX → DOCUMENT.**
