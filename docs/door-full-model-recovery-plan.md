# Door Full-Model Recovery Plan

## Goal

Replace the current generic `drawBeveledFrame` door system with the complete
per-chapter door models from reference commit
`b3fb8a4706f36fc55d073d03286024e53ec1fdee`. The reference models have distinct
silhouettes, mechanical structures, and open/locked states per chapter. The
current system shares one rectangular bevel across all four themes and only
varies lock-core decoration.

Reference source: `/tmp/RoomRenderer.reference.ts` (lines 1632-2029 for door
drawing, lines 1447-1630 for start-room chapter entrances used as material
reference only).

## Constraints

- DoorGeometry physical semantics (aperture, triggerBounds, entryPoint,
  inwardDirection, locked collision, room-switch logic) remain unchanged.
- No restoration of reference-commit coordinates, collision, or transition
  logic.
- No Start-room duplicate gate. Each real exit draws one door set.
- 320x240 canvas, 16px tiles, 20x15 room.

## Phase 1: DoorGeometry visualBounds

Add a new field to `DoorGeometry`:

```ts
visualBounds: DoorRect;
```

Purpose separation:

| Field | Role |
|-------|------|
| aperture | Real passage and lock-barrier region |
| triggerBounds | Room-switch trigger |
| frameBounds | Frame-to-wall join region |
| visualBounds | Full visual extent (posts, lintels, pistons, roots, machinery) |

Sizing (derived from reference proportions):

- up/down (horizontal door): visualBounds extends 8px beyond frameBounds on
  each side (x: 112, width: 96) and 6px deeper into the room (height: 38).
- left/right (vertical door): visualBounds extends 8px beyond frameBounds on
  each side (y: 80, height: 80) and 6px deeper into the room (width: 38).

Collision code must NOT read visualBounds. Only aperture and frameBounds
participate in physics.

Files: `src/game/dungeon/DoorGeometry.ts`

## Phase 2: DoorRenderer rewrite

Delete `drawBeveledFrame` as the shared structural body. Each chapter
implements a full authored model with these stages:

1. `recess` - dark void behind the opening, drawn into the wall depth
2. `outerFrame` - thick structural frame that overlaps adjacent wall tiles
3. `innerFrame` - secondary frame layer creating depth
4. `threshold` - floor-level or edge-level transition strip
5. `openCore` - chapter-specific open-state mechanical structure
6. `lockedCore` - chapter-specific locked-state barrier
7. `themeDetails` - surface decoration (vines, rivets, frost, cracks)
8. `foregroundParts` - elements that overdraw the wall face (lintel caps,
   chains, piston rods, root tendrils)

### Horizontal model (up/down doors)

Authored for 96px wide x 38px deep visual envelope. The aperture is 64px wide
x 32px deep centered within. Posts are 16px wide on each side. Lintel is 6-8px
tall.

### Vertical model (left/right doors)

Authored for 38px wide x 80px tall visual envelope. The aperture is 32px wide
x 48px tall centered within. Posts are 16px tall on top and bottom. Lintel is
6-8px wide.

These are NOT derived by swapping width/height. The reference shows different
proportions: horizontal doors are wide and shallow; vertical doors are narrow
and tall. Mechanical elements (airlock panels, iris blades, portcullis bars)
must be authored for each orientation.

### Per-chapter material language (from reference)

**Forest** (lines 1634-1684):
- Frame: bark-brown thick posts (#3E2B20) with lighter heartwood (#6A4B31)
- Open: root-lattice arch, moss accents (#56864B), natural light through gaps
- Locked: vertical root bars (#29472F) with green vein highlights (#81A957),
  flower lock-point (#E783A5 + #FFE47A)
- Foreground: vine tendrils overhanging the lintel

**Dungeon** (lines 1687-1782):
- Frame: layered stone jambs (#111925 / #3B485C) with iron rivet strips
  (#718095)
- Open: short iron teeth at frame edges (#6D7B85), dark passage
- Locked: full portcullis grid (#151C25 bars, #7B8993 highlights), horizontal
  crossbar, offset chain links (#111820 / #89969D), soul-lock keystone
  (#241531 / #9E59C8 / #E0B8F2)
- Foreground: pointed arch stones, hanging chain links

**Snow** (lines 1785-1881):
- Frame: steel jambs (#294A5B) under wind-packed ice (#6F929E), snow cap
  (#D9E8EB)
- Open: retracted insulated pockets (#A9D4DC), frost wedges
- Locked: solid two-panel airlock (#284E5E / #719EAA), pressure seam (#173744 /
  #55BBC9), warning lamps (#C94C55 / #FFD16A), status light (#21485A / #55BBC9
  / #E2FFFF), diagonal braces (#365F6F)
- Foreground: ice-cap overhang, frost crystals

**Lava** (lines 1884-1979):
- Frame: basalt heat-shield (#171219 / #493943) with iron rails (#777E7F)
- Open: retracted iris teeth (#8C4A37), hydraulic sockets
- Locked: octagonal furnace ring (#261C22 / #5B454C), six iris blades (#913B2C
  / #B74A2D), combustion eye (#5A211C / #E34F1E / #FFB52C / #FFE86E), side
  pistons (#2A2027 / #8B8583 / #D94B1F), rivet dots (#B2A6A1)
- Foreground: piston rods extending beyond frame, heat-glow pixels

### Shared utilities (kept)

- `DoorPalette` interface and `PALETTES` record (extend with new colors)
- `fill()`, `inset()`, `localRect()`, `drawLocal()`, `getLocalSize()`
- `DoorRenderLayout` interface (extend with visualBounds-derived regions)

Files: `src/game/render/DoorRenderer.ts` (full rewrite ~500-600 lines)

## Phase 3: RoomRenderer draw-phase restructure

Current: doors are drawn in `drawForeground()` after ALL walls complete
(line 1650-1655). This makes doors look pasted on top.

New phased approach:

1. **drawBackground** (existing): floor tiles, room decals, hazard crossings.
   After floor completes, call `DoorRenderer.drawRecess()` for each active
   door. This paints the dark void into the wall-depth region before walls are
   drawn.

2. **drawForeground** wall pass (existing): wall tiles, structures, props.
   After each wall tile adjacent to a door aperture, the wall tile naturally
   overlaps the recess edges. Then call `DoorRenderer.drawOuterFrame()` which
   overdraws 2-3px into adjacent wall tiles to create the embedded look.

3. **drawForeground** door-core pass: call `DoorRenderer.drawCore()` (open or
   locked) for each active door. This draws the mechanical interior.

4. **drawForeground** foreground pass: call
   `DoorRenderer.drawForegroundParts()` for lintel caps, chains, piston rods,
   root tendrils that must appear in front of the wall face.

Implementation: split the single `DoorRenderer.draw()` call into four static
methods. RoomRenderer calls them at the appropriate points in its tile loop.

Door-adjacent wall detection: a wall tile at (tx, ty) is adjacent to a door if
its pixel rect intersects any door's `visualBounds`. Use a precomputed set of
door geometries for the current room.

Files: `src/game/render/RoomRenderer.ts`, `src/game/render/DoorRenderer.ts`

## Phase 4: QA scenes and smoke tests

### New QA scenes (16 total)

Add to `DungeonQaScene` type:

```
forest_up_open, forest_up_locked       (existing, horizontal)
forest_left_open, forest_left_locked   (NEW, vertical)
dungeon_up_open, dungeon_up_locked     (NEW, horizontal)
dungeon_left_open, dungeon_left_locked (existing, vertical)
snow_up_open, snow_up_locked           (NEW, horizontal)
snow_down_open, snow_down_locked       (existing, horizontal)
lava_up_open, lava_up_locked           (NEW, horizontal)
lava_right_open, lava_right_locked     (existing, vertical)
```

Each scene must show the door AND adjacent wall tiles (the QA scene already
renders a full room, so this is automatic).

### Smoke test rewrite

Delete source-regex assertions (checking function names exist). Replace with
rendered-geometry validation:

- Render each theme x orientation x state to an offscreen canvas (node-canvas
  or the existing QA bridge).
- Assert non-transparent pixel count in visualBounds exceeds a minimum
  threshold (proves the model is drawn).
- Assert openCore and lockedCore regions differ (pixel diff > threshold).
- Assert non-Core stages are identical between open and locked (pixel-perfect
  match outside lockBounds).
- Assert aperture, triggerBounds, entryPoint values match the existing
  constants (physics unchanged).
- Assert visualBounds does NOT intersect any collision rect used by
  RoomObjectCollision or WorldCollision.
- Assert four themes produce structurally different outer frames (pixel diff
  between theme pairs > threshold).

Files: `scripts/door-geometry-smoke.ts` (rewrite), `src/game/states/DungeonState.ts` (new scenes)

## Phase 5: Screenshot capture and comparison

### Capture matrix (16 scenes)

Using `tools/termux-browser-qa/capture.mjs` with the QA URL scheme:

```
?qa=1&qaScene=<scene>&qaTheme=<theme>&qaCapture=1
```

Scenes:
- forest horizontal open/locked (forest_up_open, forest_up_locked)
- forest vertical open/locked (forest_left_open, forest_left_locked)
- dungeon horizontal open/locked (dungeon_up_open, dungeon_up_locked)
- dungeon vertical open/locked (dungeon_left_open, dungeon_left_locked)
- snow horizontal open/locked (snow_up_open, snow_up_locked)
- snow vertical open/locked (snow_down_open, snow_down_locked)
- lava horizontal open/locked (lava_up_open, lava_up_locked)
- lava vertical open/locked (lava_right_open, lava_right_locked)

### Reference screenshots

Checkout reference commit, build, and capture the same 16 door views using the
old inline drawDoor. Since the reference uses DOOR_ZONES coordinates, construct
equivalent scenes by placing the player in a room with doors and capturing.

Alternatively: extract the reference drawDoor into a standalone script that
renders to a 320x240 canvas at the same door positions.

### Contact sheets

Generate side-by-side reference/current sheets:
- `screenshots/door-comparison-horizontal.png` (4 themes x 2 states x 2 columns)
- `screenshots/door-comparison-vertical.png` (4 themes x 2 states x 2 columns)

### Visual acceptance criteria

- Outer silhouette approximates reference (thick posts, shaped lintel)
- Posts and lintel have visible depth (multiple layers, not flat)
- Door opening has recessed depth (dark void visible behind frame)
- Four chapters are NOT the same rectangle with different colors
- Open state has full mechanical structure (not just an accent line)
- Locked state changes ONLY the core, not the outer frame
- Door frame overlaps adjacent wall tiles naturally (embedded, not pasted)
- No generic flat black panel
- No Start-room duplicate gate

## Phase 6: Verification

- `npm run lint` (tsc --noEmit) passes
- `npm run build` passes
- `npm run verify` passes (all existing smoke tests)
- `scripts/door-geometry-smoke.ts` passes with new render assertions
- 16 screenshots captured
- Reference/current contact sheets generated
- Visual acceptance criteria confirmed by inspection

## File change summary

| File | Change |
|------|--------|
| `src/game/dungeon/DoorGeometry.ts` | Add `visualBounds` field and constants |
| `src/game/render/DoorRenderer.ts` | Full rewrite: 4 themed models x H/V, 8 draw stages |
| `src/game/render/RoomRenderer.ts` | Split door drawing into 4 phased calls |
| `src/game/states/DungeonState.ts` | Add 8 new QA scenes |
| `scripts/door-geometry-smoke.ts` | Rewrite: render-based assertions |
| `tools/termux-browser-qa/capture.mjs` | Extend scene list to 16 |

## Status

- [x] Reference source exported and analyzed
- [x] visualBounds added to DoorGeometry
- [x] DoorRenderer rewritten with 4 full themed models (H+V)
- [x] RoomRenderer draw-phase restructured
- [x] QA scenes added (16 total)
- [x] Smoke tests rewritten (render-based)
- [x] npm run lint passed
- [x] npm run build passed
- [x] npm run verify passed
- [x] 16 modified screenshots captured
- [x] Reference screenshots captured or constructed
- [x] Reference/current contact sheets generated
- [x] Visual acceptance criteria confirmed
