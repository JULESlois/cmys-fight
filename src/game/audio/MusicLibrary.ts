export type MusicMode = "adaptive" | "off";

export type MusicScene =
  | "title"
  | "hub"
  | "settings"
  | "forest"
  | "dungeon"
  | "snow"
  | "lava"
  | "combat_forest"
  | "combat_dungeon"
  | "combat_snow"
  | "combat_lava"
  | "boss"
  | "shop"
  | "victory"
  | "defeat"
  | "legacy";

export type MusicFamily = "title" | "hub" | "menu" | "forest" | "dungeon" | "snow" | "lava" | "boss" | "result" | "legacy";

export interface ProceduralTrack {
  family: MusicFamily;
  intensity: number;
  bpm: number;
  rootMidi: number;
  scale: number[];
  melody: number[];
  bass: number[];
  chord: number[];
  arpeggio: number[];
  kick: number[];
  snare: number[];
  hat: number[];
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  padWave: OscillatorType;
  arpWave: OscillatorType;
  leadGain: number;
  bassGain: number;
  padGain: number;
  arpGain: number;
  drumGain: number;
  leadGate: number;
  bassGate: number;
  padGate: number;
  arpGate: number;
  filterHz: number;
  swing?: number;
}

export const MUSIC_REST = -99;
const R = MUSIC_REST;

type TrackOptions = Omit<ProceduralTrack,
  | "arpeggio" | "kick" | "snare" | "hat"
  | "leadWave" | "bassWave" | "padWave" | "arpWave"
  | "leadGain" | "bassGain" | "padGain" | "arpGain" | "drumGain"
  | "leadGate" | "bassGate" | "padGate" | "arpGate" | "filterHz"
> & Partial<Pick<ProceduralTrack,
  | "arpeggio" | "kick" | "snare" | "hat"
  | "leadWave" | "bassWave" | "padWave" | "arpWave"
  | "leadGain" | "bassGain" | "padGain" | "arpGain" | "drumGain"
  | "leadGate" | "bassGate" | "padGate" | "arpGate" | "filterHz"
>>;

function develop(phrase: readonly number[], shifts: readonly number[], cadence = 0): number[] {
  return shifts.flatMap((shift, bar) => phrase.map((degree, index) => {
    if (degree === R) return R;
    const finalCadence = bar === shifts.length - 1 && index >= phrase.length - 2 ? cadence : 0;
    return degree + shift + finalCadence;
  }));
}

function intensify(phrase: readonly number[], passingDegree = 0): number[] {
  let previous = passingDegree;
  return phrase.map((degree, index) => {
    if (degree !== R) {
      previous = degree;
      return degree;
    }
    return index % 4 === 3 ? previous - 1 : index % 2 === 1 ? passingDegree : R;
  });
}

function makeTrack(options: TrackOptions): ProceduralTrack {
  return {
    arpeggio: [0, R, 2, R, 4, R, 2, R, 0, R, 3, R, 4, R, 2, R],
    kick: [0.8,0,0,0, 0,0,0,0, 0.65,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 0.55,0,0,0, 0,0,0,0, 0.55,0,0,0],
    hat: [0,0,0.3,0, 0,0,0.24,0, 0,0,0.3,0, 0,0,0.24,0],
    leadWave: "triangle",
    bassWave: "sine",
    padWave: "triangle",
    arpWave: "sine",
    leadGain: 0.052,
    bassGain: 0.075,
    padGain: 0.018,
    arpGain: 0.018,
    drumGain: 0.035,
    leadGate: 0.72,
    bassGate: 1.55,
    padGate: 3.65,
    arpGate: 0.62,
    filterHz: 2600,
    ...options,
  };
}

const DRUMS_DRIVE = {
  kick: [1,0,0,0, 0.35,0,0,0, 0.82,0,0.32,0, 0.4,0,0,0],
  snare: [0,0,0,0, 0.78,0,0,0.14, 0,0,0,0, 0.82,0,0,0.22],
  hat: [0.28,0.18,0.42,0.18, 0.3,0.18,0.46,0.2, 0.3,0.18,0.42,0.2, 0.34,0.2,0.52,0.28],
};

const DRUMS_HEAVY = {
  kick: [1,0,0.28,0, 0.45,0,0,0.18, 0.92,0,0.35,0, 0.5,0,0.25,0],
  snare: [0,0,0,0.18, 0.9,0,0,0.2, 0,0,0,0.2, 0.95,0,0.18,0.32],
  hat: [0.34,0.22,0.52,0.24, 0.38,0.24,0.56,0.28, 0.38,0.24,0.54,0.26, 0.42,0.28,0.62,0.34],
};

const TITLE = [0,R,2,3, 4,R,3,2, 0,R,-1,0, 2,R,0,R];
const HUB = [0,2,4,R, 3,2,0,R, 4,3,2,R, 1,2,0,R];
const SETTINGS = [0,R,1,R, 3,R,2,R, 0,R,4,R, 3,R,1,R];
const FOREST = [0,2,4,2, 3,4,2,R, 0,1,2,4, 3,2,1,R];
const DUNGEON = [0,R,2,R, 1,R,3,R, 0,R,4,3, 2,R,1,R];
const SNOW = [4,3,2,R, 4,3,1,R, 0,2,3,4, 2,1,0,R];
const LAVA = [0,3,2,0, 4,3,1,0, 5,4,3,2, 4,3,1,R];
const SHOP = [0,2,4,5, 4,2,1,R, 3,5,4,2, 3,1,0,R];
const VICTORY = [0,2,4,5, 4,5,7,R, 4,5,7,8, 7,5,4,R];
const DEFEAT = [4,R,3,R, 2,R,1,R, 0,R,-1,R, 0,R,R,R];
const LEGACY = [0,R,3,2, R,4,3,R, 0,R,5,4, 3,R,2,R];
const BOSS = [0,3,5,4, 6,5,3,4, 0,4,6,5, 4,3,2,1];

const BASS_GENTLE = [0,R,R,R, 3,R,R,R, 4,R,R,R, 2,R,R,R];
const BASS_PULSE = [0,R,0,R, 3,R,3,R, 4,R,4,R, 2,R,2,R];
const BASS_DARK = [0,R,R,0, 3,R,R,3, 4,R,R,4, 1,R,R,1];
const BASS_DRIVE = [0,0,R,0, 3,3,R,3, 4,4,R,4, 1,1,R,1];
const BASS_HEAVY = [0,0,0,0, 3,3,3,3, 4,4,4,4, 1,1,1,1];

export const PROCEDURAL_TRACKS: Record<MusicScene, ProceduralTrack> = {
  title: makeTrack({
    family: "title", intensity: 0.32, bpm: 92, rootMidi: 50, scale: [0,2,3,7,9],
    melody: develop(TITLE, [0,0,1,-1], 1), bass: develop(BASS_GENTLE, [0,0,1,0]),
    chord: [0,3,4,2, 0,4,3,2, 0,3,4,1, 0,4,2,0],
    leadWave: "square", bassWave: "triangle", padWave: "sine", filterHz: 2100,
    leadGain: 0.045, bassGain: 0.068, padGain: 0.022, arpGain: 0.014, drumGain: 0.026,
  }),
  hub: makeTrack({
    family: "hub", intensity: 0.28, bpm: 86, rootMidi: 48, scale: [0,2,4,7,9],
    melody: develop(HUB, [0,1,0,-1], 1), bass: develop(BASS_PULSE, [0,0,1,0]),
    chord: [0,3,4,2, 0,4,3,2, 0,3,1,2, 0,4,2,0],
    leadWave: "triangle", bassWave: "sine", padWave: "sine", filterHz: 2400,
    leadGain: 0.044, bassGain: 0.065, padGain: 0.026, arpGain: 0.014, drumGain: 0.018,
  }),
  settings: makeTrack({
    family: "menu", intensity: 0.16, bpm: 76, rootMidi: 45, scale: [0,2,5,7,10],
    melody: develop(SETTINGS, [0,0,1,0]), bass: develop(BASS_GENTLE, [0,0,0,-1]),
    chord: [0,2,3,1, 0,3,2,1, 0,2,4,1, 0,3,1,0],
    arpeggio: [0,R,R,R, 2,R,R,R, 4,R,R,R, 2,R,R,R],
    kick: Array(16).fill(0), snare: Array(16).fill(0), hat: [0,0,0,0, 0,0,0.12,0, 0,0,0,0, 0,0,0.12,0],
    leadWave: "sine", bassWave: "triangle", padWave: "sine", filterHz: 1800,
    leadGain: 0.036, bassGain: 0.052, padGain: 0.025, arpGain: 0.01, drumGain: 0.01,
  }),
  forest: makeTrack({
    family: "forest", intensity: 0.38, bpm: 104, rootMidi: 52, scale: [0,2,4,7,9],
    melody: develop(FOREST, [0,1,0,-1], 1), bass: develop(BASS_PULSE, [0,0,1,0]),
    chord: [0,3,4,2, 0,4,3,2, 0,3,4,1, 0,4,2,0],
    leadWave: "triangle", bassWave: "triangle", padWave: "sine", arpWave: "triangle", filterHz: 3200,
    leadGain: 0.046, bassGain: 0.064, padGain: 0.018, arpGain: 0.018, drumGain: 0.024,
  }),
  dungeon: makeTrack({
    family: "dungeon", intensity: 0.42, bpm: 96, rootMidi: 43, scale: [0,1,3,5,7,8,10],
    melody: develop(DUNGEON, [0,-1,1,0]), bass: develop(BASS_DARK, [0,0,-1,0]),
    chord: [0,3,4,1, 0,4,3,1, 0,3,5,1, 0,4,1,0],
    arpeggio: [0,R,2,R, 3,R,2,R, 0,R,4,R, 3,R,1,R],
    leadWave: "sawtooth", bassWave: "square", padWave: "triangle", filterHz: 1450,
    leadGain: 0.032, bassGain: 0.065, padGain: 0.022, arpGain: 0.012, drumGain: 0.025,
  }),
  snow: makeTrack({
    family: "snow", intensity: 0.36, bpm: 112, rootMidi: 55, scale: [0,2,3,7,8],
    melody: develop(SNOW, [0,-1,1,0], -1), bass: develop(BASS_PULSE, [0,0,-1,0]),
    chord: [0,2,3,1, 0,3,2,1, 0,2,4,1, 0,3,1,0],
    leadWave: "triangle", bassWave: "sine", padWave: "sine", arpWave: "sine", filterHz: 3800,
    leadGain: 0.046, bassGain: 0.058, padGain: 0.024, arpGain: 0.019, drumGain: 0.018,
  }),
  lava: makeTrack({
    family: "lava", intensity: 0.55, bpm: 118, rootMidi: 41, scale: [0,1,3,6,7,10],
    melody: develop(LAVA, [0,1,0,-1], 1), bass: develop(BASS_DRIVE, [0,0,1,0]),
    chord: [0,3,4,1, 0,4,3,1, 0,3,5,1, 0,4,1,0],
    leadWave: "sawtooth", bassWave: "square", padWave: "triangle", arpWave: "square", filterHz: 1750,
    leadGain: 0.036, bassGain: 0.078, padGain: 0.019, arpGain: 0.016, drumGain: 0.042,
  }),
  combat_forest: makeTrack({
    family: "forest", intensity: 0.82, bpm: 132, rootMidi: 52, scale: [0,2,4,7,9],
    melody: develop(intensify(FOREST, 2), [0,1,0,-1], 1), bass: develop(BASS_DRIVE, [0,0,1,0]),
    chord: [0,3,4,2, 0,4,3,2, 0,3,4,1, 0,4,2,0], ...DRUMS_DRIVE,
    leadWave: "square", bassWave: "sawtooth", padWave: "triangle", arpWave: "square", filterHz: 2900,
    leadGain: 0.046, bassGain: 0.078, padGain: 0.014, arpGain: 0.024, drumGain: 0.052, swing: 0.04,
  }),
  combat_dungeon: makeTrack({
    family: "dungeon", intensity: 0.86, bpm: 126, rootMidi: 43, scale: [0,1,3,5,7,8,10],
    melody: develop(intensify(DUNGEON, 1), [0,-1,1,0], 1), bass: develop(BASS_HEAVY, [0,0,-1,0]),
    chord: [0,3,4,1, 0,4,3,1, 0,3,5,1, 0,4,1,0], ...DRUMS_DRIVE,
    leadWave: "sawtooth", bassWave: "square", padWave: "triangle", arpWave: "sawtooth", filterHz: 1650,
    leadGain: 0.038, bassGain: 0.086, padGain: 0.016, arpGain: 0.021, drumGain: 0.058,
  }),
  combat_snow: makeTrack({
    family: "snow", intensity: 0.84, bpm: 140, rootMidi: 55, scale: [0,2,3,7,8],
    melody: develop(intensify(SNOW, 2), [0,-1,1,0], 1), bass: develop(BASS_DRIVE, [0,0,-1,0]),
    chord: [0,2,3,1, 0,3,2,1, 0,2,4,1, 0,3,1,0], ...DRUMS_DRIVE,
    leadWave: "square", bassWave: "triangle", padWave: "sine", arpWave: "triangle", filterHz: 3900,
    leadGain: 0.043, bassGain: 0.07, padGain: 0.015, arpGain: 0.025, drumGain: 0.054,
  }),
  combat_lava: makeTrack({
    family: "lava", intensity: 0.92, bpm: 148, rootMidi: 41, scale: [0,1,3,6,7,10],
    melody: develop(intensify(LAVA, 1), [0,1,0,-1], 1), bass: develop(BASS_HEAVY, [0,0,1,0]),
    chord: [0,3,4,1, 0,4,3,1, 0,3,5,1, 0,4,1,0], ...DRUMS_HEAVY,
    leadWave: "sawtooth", bassWave: "square", padWave: "sawtooth", arpWave: "square", filterHz: 1900,
    leadGain: 0.04, bassGain: 0.092, padGain: 0.014, arpGain: 0.026, drumGain: 0.068,
  }),
  boss: makeTrack({
    family: "boss", intensity: 1, bpm: 156, rootMidi: 38, scale: [0,1,3,6,7,9,10],
    melody: develop(BOSS, [0,1,-1,0], 2), bass: develop(BASS_HEAVY, [0,1,0,-1]),
    chord: [0,3,4,1, 0,4,5,1, 0,3,6,1, 0,5,1,0], ...DRUMS_HEAVY,
    arpeggio: [0,2,4,6, 4,2,1,3, 0,3,5,6, 5,3,2,1],
    leadWave: "sawtooth", bassWave: "square", padWave: "sawtooth", arpWave: "square", filterHz: 2050,
    leadGain: 0.044, bassGain: 0.098, padGain: 0.018, arpGain: 0.03, drumGain: 0.076,
  }),
  shop: makeTrack({
    family: "menu", intensity: 0.3, bpm: 108, rootMidi: 53, scale: [0,2,4,7,9,11],
    melody: develop(SHOP, [0,1,0,-1], 1), bass: develop(BASS_PULSE, [0,0,1,0]),
    chord: [0,3,4,2, 0,4,3,2, 0,3,4,1, 0,4,2,0],
    leadWave: "square", bassWave: "triangle", padWave: "sine", arpWave: "triangle", filterHz: 3100,
    leadGain: 0.041, bassGain: 0.057, padGain: 0.016, arpGain: 0.022, drumGain: 0.022, swing: 0.1,
  }),
  victory: makeTrack({
    family: "result", intensity: 0.58, bpm: 112, rootMidi: 55, scale: [0,2,4,7,9,11],
    melody: develop(VICTORY, [0,1,2,0], 2), bass: develop(BASS_PULSE, [0,1,2,0]),
    chord: [0,3,4,5, 0,4,5,3, 0,3,5,6, 0,4,5,0],
    leadWave: "triangle", bassWave: "sine", padWave: "sine", arpWave: "triangle", filterHz: 4200,
    leadGain: 0.052, bassGain: 0.06, padGain: 0.028, arpGain: 0.022, drumGain: 0.028,
  }),
  defeat: makeTrack({
    family: "result", intensity: 0.14, bpm: 68, rootMidi: 43, scale: [0,1,3,5,7,8,10],
    melody: develop(DEFEAT, [0,-1,-2,0], -1), bass: develop(BASS_GENTLE, [0,-1,-2,0]),
    chord: [0,3,1,0, 0,2,1,0, 0,3,1,-1, 0,1,0,0],
    arpeggio: Array(16).fill(R), kick: Array(16).fill(0), snare: Array(16).fill(0), hat: Array(16).fill(0),
    leadWave: "triangle", bassWave: "sine", padWave: "sine", filterHz: 1350,
    leadGain: 0.038, bassGain: 0.055, padGain: 0.03, arpGain: 0, drumGain: 0,
  }),
  legacy: makeTrack({
    family: "legacy", intensity: 0.26, bpm: 82, rootMidi: 47, scale: [0,2,3,6,7,9],
    melody: develop(LEGACY, [0,1,-1,0], 1), bass: develop(BASS_GENTLE, [0,1,-1,0]),
    chord: [0,3,4,2, 0,4,3,2, 0,3,5,2, 0,4,2,0],
    leadWave: "square", bassWave: "triangle", padWave: "sine", arpWave: "square", filterHz: 1900,
    leadGain: 0.035, bassGain: 0.054, padGain: 0.021, arpGain: 0.012, drumGain: 0.014,
  }),
};

export function getProceduralTrackLoopSeconds(track: ProceduralTrack): number {
  return track.melody.length * 60 / track.bpm / 4;
}
