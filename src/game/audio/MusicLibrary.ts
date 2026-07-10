export type MusicMode = "adaptive" | "external" | "off";

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

export interface ProceduralTrack {
  bpm: number;
  rootMidi: number;
  scale: number[];
  melody: number[];
  bass: number[];
  chord: number[];
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  leadGain: number;
  bassGain: number;
  drumGain: number;
  swing?: number;
}

const REST = -99;

export const PROCEDURAL_TRACKS: Record<MusicScene, ProceduralTrack> = {
  title: { bpm: 92, rootMidi: 50, scale: [0,2,3,7,9], melody: [0,REST,2,3,4,REST,3,2,0,REST,-1,0,2,REST,0,REST], bass: [0,REST,REST,REST,3,REST,REST,REST,4,REST,REST,REST,2,REST,REST,REST], chord: [0,3,4,2], leadWave: "square", bassWave: "triangle", leadGain: .08, bassGain: .11, drumGain: .035 },
  hub: { bpm: 86, rootMidi: 48, scale: [0,2,4,7,9], melody: [0,2,4,REST,3,2,0,REST,4,3,2,REST,1,2,0,REST], bass: [0,REST,0,REST,3,REST,3,REST,4,REST,4,REST,2,REST,2,REST], chord: [0,3,4,2], leadWave: "triangle", bassWave: "sine", leadGain: .07, bassGain: .10, drumGain: .025 },
  settings: { bpm: 76, rootMidi: 45, scale: [0,2,5,7,10], melody: [0,REST,1,REST,3,REST,2,REST,0,REST,4,REST,3,REST,1,REST], bass: [0,REST,REST,REST,2,REST,REST,REST,3,REST,REST,REST,1,REST,REST,REST], chord: [0,2,3,1], leadWave: "sine", bassWave: "triangle", leadGain: .055, bassGain: .085, drumGain: .015 },
  forest: { bpm: 104, rootMidi: 52, scale: [0,2,4,7,9], melody: [0,2,4,2,3,4,2,REST,0,1,2,4,3,2,1,REST], bass: [0,REST,0,REST,3,REST,3,REST,4,REST,4,REST,2,REST,2,REST], chord: [0,3,4,2], leadWave: "square", bassWave: "triangle", leadGain: .065, bassGain: .095, drumGain: .025 },
  dungeon: { bpm: 96, rootMidi: 43, scale: [0,1,3,5,7,8,10], melody: [0,REST,2,REST,1,REST,3,REST,0,REST,4,3,2,REST,1,REST], bass: [0,REST,REST,0,3,REST,REST,3,4,REST,REST,4,1,REST,REST,1], chord: [0,3,4,1], leadWave: "sawtooth", bassWave: "square", leadGain: .045, bassGain: .09, drumGain: .03 },
  snow: { bpm: 112, rootMidi: 55, scale: [0,2,3,7,8], melody: [4,3,2,REST,4,3,1,REST,0,2,3,4,2,1,0,REST], bass: [0,REST,0,REST,2,REST,2,REST,3,REST,3,REST,1,REST,1,REST], chord: [0,2,3,1], leadWave: "triangle", bassWave: "sine", leadGain: .075, bassGain: .085, drumGain: .02 },
  lava: { bpm: 118, rootMidi: 41, scale: [0,1,3,6,7,10], melody: [0,3,2,0,4,3,1,0,5,4,3,2,4,3,1,REST], bass: [0,0,REST,0,3,3,REST,3,4,4,REST,4,1,1,REST,1], chord: [0,3,4,1], leadWave: "sawtooth", bassWave: "square", leadGain: .055, bassGain: .12, drumGain: .05 },
  combat_forest: { bpm: 132, rootMidi: 50, scale: [0,2,3,7,9], melody: [0,2,3,4,3,2,4,3,0,2,4,5,4,3,2,1], bass: [0,0,REST,0,3,3,REST,3,4,4,REST,4,2,2,REST,2], chord: [0,3,4,2], leadWave: "square", bassWave: "sawtooth", leadGain: .07, bassGain: .12, drumGain: .065, swing: .04 },
  combat_dungeon: { bpm: 126, rootMidi: 41, scale: [0,1,3,5,7,8,10], melody: [0,2,1,3,0,4,3,2,0,3,4,5,4,3,1,2], bass: [0,0,0,REST,3,3,3,REST,4,4,4,REST,1,1,1,REST], chord: [0,3,4,1], leadWave: "sawtooth", bassWave: "square", leadGain: .055, bassGain: .13, drumGain: .07 },
  combat_snow: { bpm: 140, rootMidi: 53, scale: [0,2,3,5,7,10], melody: [0,2,4,3,5,4,2,3,0,3,5,4,3,2,1,2], bass: [0,REST,0,0,2,REST,2,2,3,REST,3,3,1,REST,1,1], chord: [0,2,3,1], leadWave: "square", bassWave: "triangle", leadGain: .065, bassGain: .105, drumGain: .065 },
  combat_lava: { bpm: 148, rootMidi: 40, scale: [0,1,3,6,7,10], melody: [0,3,2,4,3,5,4,2,0,4,5,3,4,2,1,3], bass: [0,0,0,0,3,3,3,3,4,4,4,4,1,1,1,1], chord: [0,3,4,1], leadWave: "sawtooth", bassWave: "square", leadGain: .06, bassGain: .145, drumGain: .08 },
  boss: { bpm: 156, rootMidi: 38, scale: [0,1,3,6,7,9,10], melody: [0,3,5,4,6,5,3,4,0,4,6,5,4,3,2,1], bass: [0,0,0,0,3,3,3,3,4,4,4,4,1,1,2,2], chord: [0,3,4,1], leadWave: "sawtooth", bassWave: "square", leadGain: .07, bassGain: .16, drumGain: .095 },
  shop: { bpm: 108, rootMidi: 53, scale: [0,2,4,7,9,11], melody: [0,2,4,5,4,2,1,REST,3,5,4,2,3,1,0,REST], bass: [0,REST,0,REST,3,REST,3,REST,4,REST,4,REST,2,REST,2,REST], chord: [0,3,4,2], leadWave: "square", bassWave: "triangle", leadGain: .055, bassGain: .085, drumGain: .025, swing: .08 },
  victory: { bpm: 112, rootMidi: 55, scale: [0,2,4,7,9,11], melody: [0,2,4,5,4,5,7,REST,4,5,7,8,7,5,4,REST], bass: [0,REST,3,REST,4,REST,5,REST,0,REST,3,REST,4,REST,0,REST], chord: [0,3,4,5], leadWave: "triangle", bassWave: "sine", leadGain: .085, bassGain: .095, drumGain: .035 },
  defeat: { bpm: 68, rootMidi: 43, scale: [0,1,3,5,7,8,10], melody: [4,REST,3,REST,2,REST,1,REST,0,REST,-1,REST,0,REST,REST,REST], bass: [0,REST,REST,REST,3,REST,REST,REST,1,REST,REST,REST,0,REST,REST,REST], chord: [0,3,1,0], leadWave: "triangle", bassWave: "sine", leadGain: .055, bassGain: .09, drumGain: .01 },
  legacy: { bpm: 82, rootMidi: 47, scale: [0,2,3,6,7,9], melody: [0,REST,3,2,REST,4,3,REST,0,REST,5,4,3,REST,2,REST], bass: [0,REST,REST,REST,3,REST,REST,REST,4,REST,REST,REST,2,REST,REST,REST], chord: [0,3,4,2], leadWave: "square", bassWave: "triangle", leadGain: .05, bassGain: .085, drumGain: .018 },
};

export interface ExternalMusicConfig {
  attribution?: string;
  tracks?: Partial<Record<MusicScene, string>>;
}

export function resolveExternalMusicUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^netease:\d+$/i.test(trimmed)) {
    const id = trimmed.slice(trimmed.indexOf(":") + 1);
    return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return undefined;
}
