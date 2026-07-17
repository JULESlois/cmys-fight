# CMYS Fight: Deep Archive

A deterministic browser action roguelite built with TypeScript, React, and a custom Canvas engine.

The game renders at a fixed 320 × 240 logical resolution and scales to desktop and mobile displays. React hosts the canvas, touch controls, save transfer UI, and browser QA panel; the game loop, state machine, combat, world simulation, and pixel rendering are implemented in `src/game`.

## Current scope

- Explorable 80 × 60 tile Hub with camera follow, collision, facilities, loadout selection, records, and meta upgrades.
- Four chapters with four stages each; every chapter ends in a Boss stage.
- Procedural room graphs with combat, shops, treasure, exits, NPCs, Wish Fountains, and Photo Booths.
- Eight playable characters, 57 weapons, 36 enemies, talents, challenges, achievements, codex progression, and run settlement.
- Keyboard, gamepad, and touch input with rebinding and device-aware prompts.
- Versioned Run, Meta, and Settings saves with backups, migration, export, import, and checksum validation.
- Adaptive Web Audio music with optional external tracks.
- Installable PWA with offline navigation support after the first successful online load.
- Optional Gemini-generated Old Memory NPC dialogue with a built-in fallback when no API key is configured.

## Main flow

```text
Splash → Hub → Character Select / Expedition → Dungeon → Run Result → Hub
```

`TitleState` remains available as a compatibility and QA entry, but the normal launch path enters the Hub.

## Default controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | WASD | Left stick / D-pad | Virtual D-pad |
| Fire | J | X / RT | X |
| Interact / Confirm | K | A | A |
| Skill / Cancel | L / Esc | B | B |
| Swap weapon | I | Y | Y |
| Pause / Back | Esc | Start | Start |

Bindings, touch handedness, touch scale, and touch label style can be changed in Settings.

## Development

Requirements:

- Node.js 22 or newer
- npm

Install the exact locked dependency set:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

The default URL is `http://localhost:3000/`. Set `PORT` to use another port.

Run the complete automated verification chain:

```bash
npm run verify
```

This runs TypeScript checking, content and gameplay smoke tests, the production build, Service Worker syntax validation, and HTTP route checks.

Build and run production output:

```bash
npm run build
npm start
```

## Browser QA

Open the application with `?qa=1`:

```text
http://localhost:3000/?qa=1
```

QA mode exposes an in-game panel and `window.__CMYS_QA__` for stage navigation, snapshots, audio checks, loadout grants, and PNG capture. See `BROWSER_QA.md` for the manual browser procedure.

## Optional environment

Copy `.env.example` to `.env` when server-side generated dialogue is required:

```env
GEMINI_API_KEY="..."
```

Without a key, the dialogue endpoint returns a deterministic fallback and the rest of the game remains functional.

## Architecture

- `src/components/GameCanvas.tsx`: React host, responsive canvas, touch controls, save transfer, and QA panel.
- `src/game/Engine.ts`: frame loop, state switching, overlays, scaling, audio scene routing, and performance fallback.
- `src/game/states/HubState.ts`: explorable base world and facility interactions.
- `src/game/states/DungeonState.ts`: dungeon room flow and the current combat coordinator.
- `src/game/GameData.ts`: Run, Meta, and Settings persistence, migration, recovery, and settlement.
- `src/game/FloorGenerator.ts`: deterministic Stage and room graph generation.
- `src/game/Input.ts`: keyboard, gamepad, touch, semantic UI actions, and prompt routing.
- `src/game/data/`: characters, enemies, weapons, sprites, palettes, and room templates.
- `src/game/render/`: Canvas renderers and pixel effects.
- `scripts/`: automated smoke and release checks.
- `server.ts`: Express/Vite host, health endpoint, and optional dialogue API.

Historical implementation briefs such as `task.md`, `map.md`, and `reference.md` are design records. Current code, tests, and versioned data contracts are the source of truth.
