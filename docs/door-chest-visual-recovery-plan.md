# Door and Chest Visual Recovery Plan

## Scope

This round changes only combat-room door rendering and chest opened-state rendering.

Unchanged systems:

- 320x240 virtual canvas
- 16px dungeon tile size
- 20x15 dungeon room dimensions
- DoorGeometry transition, collision, aperture, trigger, and entry semantics
- Hub map and feature set
- save schema and Room.pickups persistence format
- characters, weapons, enemies, room types, and base functions

## Fixed reference

Reference commit: `b3fb8a4706f36fc55d073d03286024e53ec1fdee`.

Reference source is exported to `/tmp/RoomRenderer.reference.ts`. The reference is
used only for visual language. Its absolute coordinates, old transition bounds,
Start-room chapter gates, and inline RoomRenderer implementation are not restored.

## Door plan

Each theme must implement these authored stages:

1. drawRecess
2. drawOuterFrame
3. drawInnerFrame
4. drawThreshold
5. drawOpenCore
6. drawLockedCore
7. drawThemeDetails

All stages consume one direction-aware local coordinate space derived from
DoorGeometry frameBounds, aperture, wallDepth, and direction.

Open and Locked states must produce identical recess, outer-frame, inner-frame,
threshold, and theme-detail primitives. Only the Core stage may differ.

Theme targets:

- Forest: heavy bark/root frame, open rooted passage, root lattice, vines and natural light.
- Dungeon: layered stone/iron frame, raised teeth, portcullis, chains, rivets and purple lock light.
- Snow: ice-covered steel frame, retracted insulated pockets, solid two-panel airlock and status lights.
- Lava: basalt heat shield, retracted iris teeth, furnace iris, piston sockets and furnace glow.

## Chest plan

ChestGeometry adds a stable hingeAnchor. Closed and fully opened lids use
separate authored pixel models sharing the same hinge and horizontal center.

Acceptance geometry:

- opened-lid lower edge overlaps the body rear edge by 2-4 logical pixels
- lid and body horizontal centers are identical
- lid is depth-sorted behind the body
- loot anchor is calculated from the body landing point, never from lid position
- treasure loot remains 20-24px forward
- Boss loot remains 24-30px forward
- final pickup coordinates remain persisted in Room.pickups

## Browser QA matrix

Door scenes, including adjacent wall tiles:

- forest open and locked
- dungeon open and locked
- snow open and locked
- lava open and locked

Chest scenes:

- treasure closed
- treasure open
- Boss chest open
- treasure open with multiple loot

Required artifacts:

- reference-commit door screenshots
- previous-main baseline screenshots
- modified-main screenshots
- side-by-side reference/modified contact sheets
- chest before/after contact sheet

## Test requirements

Tests validate rendered geometry rather than function names or source regexes:

- opened lid/body overlap is 2-4px
- opened lid and body centers align
- loot anchor is below the body footprint
- Open and Locked share the same non-Core door primitives
- every theme produces non-empty Open and Locked Core primitives
- every door primitive remains inside frameBounds
- all four directions remain aligned with map apertures
- opened chest collision remains active

## Status

- [x] Reference source exported
- [x] Previous implementation inspected
- [x] Previous-main baseline screenshots captured
- [x] Reference-commit screenshots captured
- [x] Full themed Open and Locked door models implemented
- [x] Hinge-based opened chest lids implemented
- [x] Geometry tests updated
- [x] Modified screenshots captured
- [x] Reference/modified comparison sheets generated
- [x] npm run lint passed
- [x] relevant smoke tests passed
- [x] npm run build passed
- [x] full npm run verify passed

