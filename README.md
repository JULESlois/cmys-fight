# Top-Down Roguelite Shooter Prototype

A minimalist, Web Canvas-based action roguelite engine written in TypeScript.

## Current MVP Status
This project is currently in an MVP (Minimum Viable Product) stage. Core features implemented so far include:
- **Real-Time Combat**: Free-movement with WASD/Arrows, and fast-paced shooting towards the closest enemy.
- **Procedural Dungeon**: Room generation with branching paths, varied themes (Forest, Dungeon, Snow, Lava), and doors that unlock upon clearing the room.
- **Old Memories**: Discover rare "Simulation" rooms where the game shifts into a classic grid-based RPG and tactical turn-based battle system — remnants of an older version of the world!
- **Enemies & Bosses**: Melee chasers, ranged shooters, and bullet-hell boss encounters.
- **Weapon System**: Basic interchangeable weapons (Pistol, Shotgun, Laser) with different behaviors and mana costs.
- **Tile Collisions**: Basic environmental collisions preventing the player and projectiles from passing through walls.
- **Audio System**: Synthesized WebAudio sound effects for an authentic retro feel.

## Known Limitations
- Enemy movement is simple linear tracking; there is no A* pathfinding.
- Weapons auto-aim towards the closest enemy instead of using mouse-based twin-stick aiming.
- Visuals are entirely procedurally drawn primitives (no sprite sheets or textures yet).
- Enemy collision against walls is incomplete.

## Controls
- **WASD / Arrows**: Move
- **Space**: Shoot / Interact / Enter Next Floor
- **Enter**: Menu / Restart game

## Development
Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Structure
- `src/game/states/DungeonState.ts`: The main gameplay loop and room management.
- `src/game/FloorGenerator.ts`: Procedural generation logic for rooms and layouts.
- `src/game/MapData.ts`: Tile definitions and map generation references.
- `src/game/entities/`: Definitions for Player, Enemies, Projectiles, and Pickups.
- `src/game/Engine.ts`: The game loop, state management, and canvas scaling.
