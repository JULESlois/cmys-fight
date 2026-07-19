# Hub Virtual Canvas Assessment

## Scope

This assessment follows the Hub building-art modularization work. It does not change the current rendering resolution. Dungeon rooms, UI layout, input mapping, touch coordinates, camera behavior, collision geometry, sprites, screenshots, and QA continue to use the existing 320×240 virtual canvas.

## Is 320×240 sufficient after modular redraw?

Yes, for the current game scale and art direction. The main precision limitation was not the number of virtual pixels. It was that structure silhouettes, foundations, stairs, facade courses, functional props, shadows, prompt anchors, collision footprints, and occlusion parts were authored in different places or represented by coarse generic rectangles.

The new building contract separates:

- design bounds;
- physical footprints;
- interaction shells and prompt anchors;
- ground, back, body, sorted, front, roof, and FX visual layers;
- occlusion parts;
- lights and animation channels;
- shared architectural metrics.

At 320×240, a 32-pixel character still provides enough scale for readable 28–44 pixel doors, multi-course foundations, 2-pixel outlines, 6-pixel stairs, 12-pixel columns, 14×18 windows, and localized highlights. The first modular redraws—Rebirth Spring, Expedition Gate, and Trial Altar—can add recognizable silhouettes and multiple material layers without changing camera or UI contracts.

## Recommended option

### Option A — Keep 320×240

This remains the recommended production option.

Benefits:

- no Dungeon tile or room migration;
- no UI safe-area migration;
- no input-coordinate or touch-layout migration;
- no camera dead-zone retuning;
- no resampling of existing character, weapon, enemy, projectile, and environment art;
- existing screenshot and collision regression suites remain valid;
- art effort can focus on silhouette, layering, materials, and landmarks rather than global coordinate conversion.

Required follow-up work is localized: continue moving Hub buildings into independent art modules, refine the remaining second-priority buildings, and review each module at native pixel scale and 3× browser scale.

## Conditional alternative

### Option B — Hub-only wider viewport

A Hub-only 384×216 or 400×240 viewport should be considered only if later usability testing shows that the current camera cannot simultaneously expose landmark context, navigation paths, and prompt placement after the art redraw is complete.

Expected scope:

- a separate Hub render target or viewport contract;
- Hub-specific Camera2D dimensions and dead zone;
- Hub-only prompt, panel, BottomNotice, and debug-overlay layouts;
- conversion of screen-space Hub QA coordinates;
- browser scaling and capture changes;
- touch/pointer mapping branches when Hub is active;
- new screenshot baselines for every major landmark and edge clamp;
- additional transition testing between 320×240 Dungeon and the Hub viewport.

Primary risks are inconsistent pixel density between states, UI movement during state transitions, pointer-coordinate mistakes, and a doubled screenshot/layout maintenance surface.

## Rejected current option

### Option C — Global resolution increase

A global increase is not justified by the current Hub problem and is not recommended at this stage. It would require coordinated migration of:

- Dungeon 20×15 room rendering and Tile assumptions;
- all UI and HUD rectangles;
- touch controls and input scaling;
- character, weapon, enemy, projectile, facility, and environmental sprites;
- camera behavior and screen shake;
- collision/debug overlays where screen-space assumptions exist;
- every visual QA baseline.

The regression surface is disproportionate to the expected art benefit.

## Decision

Keep the global 320×240 virtual canvas. Complete the remaining Hub art modules and evaluate landmark readability using the new module boundaries and browser screenshots. Revisit a Hub-only wider viewport only after evidence shows that authored detail and camera framing are insufficient; do not pursue a global resolution migration for the current project phase.
