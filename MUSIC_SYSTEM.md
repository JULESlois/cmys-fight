# Web Audio music system

The soundtrack is synthesized locally with the browser's Web Audio API. No external music service, streamed URL, or bundled recording is required.

`src/game/audio/MusicLibrary.ts` contains deterministic scene arrangements. `AudioManager` schedules their voices and percussion, follows scene changes from the Engine and Dungeon state, and respects the master/music volume settings.

The music source setting has two modes:

- `ADAPTIVE`: use the procedural Web Audio soundtrack.
- `OFF`: disable music while retaining sound effects.

Browser QA can select any music scene and inspect the active Web Audio source. The automated audio smoke validates every scene and the scheduler contracts.
