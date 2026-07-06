# Top-Down Roguelite Shooter Prototype

A minimalist, Web Canvas-based action roguelite engine written in TypeScript.

## Core Features
- **Real-Time Combat**: Free-movement with WASD/Arrows, fast-paced shooting.
- **Procedural Dungeon**: Room generation with branching paths, varied themes (Forest, Dungeon, Snow, Lava).
- **Enemies & Bosses**: Melee chasers, ranged shooters, and bullet-hell boss encounters.
- **Weapon System**: Interchangeable weapons (Pistol, Shotgun, Laser) with different behaviors and mana costs.
- **Audio System**: Synthesized WebAudio sound effects for an authentic retro feel.

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
- `src/game/entities/`: Definitions for Player, Enemies, Projectiles, and Pickups.
- `src/game/Engine.ts`: The game loop, state management, and canvas scaling.
