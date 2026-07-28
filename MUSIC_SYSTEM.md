# Web Audio music system

The soundtrack is synthesized locally with the browser's Web Audio API. No external music service, streamed URL, or bundled recording is required.

`src/game/audio/MusicLibrary.ts` contains deterministic four-bar scene arrangements. Exploration and combat variants share a recognizable theme family, while combat raises tempo, note density, and percussion intensity. `AudioManager` schedules lead, bass, arpeggio, chord pad, and generated-noise percussion voices; applies native filters, stereo placement, a short in-memory convolution reverb, and output limiting; follows scene changes from the Engine and Dungeon state; and respects the master/music volume settings.

All sound material is created at runtime. The noise buffer and reverb impulse use deterministic generators, so the game does not download, stream, cache, or ship recorded music.

The music source setting has two modes:

- `ADAPTIVE`: use the procedural Web Audio soundtrack.
- `OFF`: disable music while retaining sound effects.

Browser QA can select any music scene and inspect the active Web Audio source. Scene changes are aligned to a beat and crossfaded, and scheduler drift skips stale steps instead of emitting a catch-up burst. The automated audio smoke validates every scene, four-bar arrangement data, related exploration/combat themes, native synthesis nodes, and scheduler contracts.
