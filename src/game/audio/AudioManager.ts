import {
  PROCEDURAL_TRACKS,
  resolveExternalMusicUrl,
  type ExternalMusicConfig,
  type MusicMode,
  type MusicScene,
  type ProceduralTrack,
} from "./MusicLibrary";
import type { ProjectileStyle } from "../data/weapons";

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export type AudioSourceStatus = "unsupported" | "blocked" | "off" | "external" | "procedural" | "idle";

export interface AudioDiagnostics {
  supported: boolean;
  contextState: string;
  unlocked: boolean;
  scene: MusicScene;
  mode: MusicMode;
  source: AudioSourceStatus;
  masterVolume: number;
  musicVolume: number;
  externalConfigured: boolean;
  externalFailed: boolean;
  attribution?: string;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private enabled = true;
  private masterVolume = 1;
  private musicVolume = 0.55;
  private musicMode: MusicMode = "adaptive";
  private unlocked = false;
  private scene: MusicScene = "title";
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  private externalConfig: ExternalMusicConfig = {};
  private externalAudio: HTMLAudioElement | null = null;
  private externalFailedScene: MusicScene | null = null;

  constructor() {
    try {
      if (typeof window === "undefined") return;
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = AudioContextCtor ? new AudioContextCtor() : null;
      if (this.ctx) {
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.applyVolumes();
      }
      const unlockOnce = () => {
        void this.unlock();
        window.removeEventListener("pointerdown", unlockOnce);
        window.removeEventListener("keydown", unlockOnce);
      };
      window.addEventListener("pointerdown", unlockOnce, { passive: true });
      window.addEventListener("keydown", unlockOnce);
      void this.loadExternalConfig();
    } catch {
      console.warn("WebAudio not supported");
    }
  }

  private async loadExternalConfig() {
    if (typeof fetch === "undefined") return;
    try {
      const response = await fetch("/music-tracks.json", { cache: "no-store" });
      if (!response.ok) return;
      const parsed = await response.json();
      if (parsed && typeof parsed === "object") this.externalConfig = parsed;
      if (this.unlocked && this.musicMode === "external") this.restartMusic();
    } catch {
      // Procedural music remains the deterministic fallback.
    }
  }

  private applyVolumes() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.03);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.08);
    }
    if (this.externalAudio) {
      this.externalAudio.volume = Math.max(0, Math.min(1, this.masterVolume * this.musicVolume));
    }
  }

  private async unlock() {
    if (!this.ctx) return;
    try {
      if (this.ctx.state !== "running") await this.ctx.resume();
      this.unlocked = this.ctx.state === "running";
      if (this.unlocked && !this.musicTimer && !this.externalAudio) this.restartMusic();
    } catch {
      this.unlocked = false;
    }
  }

  setMasterVolume(value: number) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.applyVolumes();
  }

  setMusicVolume(value: number) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.applyVolumes();
  }

  setMusicMode(mode: MusicMode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.restartMusic();
  }

  getMusicScene(): MusicScene {
    return this.scene;
  }

  getDiagnostics(): AudioDiagnostics {
    const externalConfigured = Boolean(resolveExternalMusicUrl(this.externalConfig.tracks?.[this.scene]));
    let source: AudioSourceStatus = "idle";
    if (!this.ctx) source = "unsupported";
    else if (this.musicMode === "off" || this.masterVolume <= 0 || this.musicVolume <= 0) source = "off";
    else if (!this.unlocked || this.ctx.state !== "running") source = "blocked";
    else if (this.externalAudio) source = "external";
    else if (this.musicTimer) source = "procedural";
    return {
      supported: Boolean(this.ctx),
      contextState: this.ctx?.state ?? "unavailable",
      unlocked: this.unlocked,
      scene: this.scene,
      mode: this.musicMode,
      source,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      externalConfigured,
      externalFailed: this.externalFailedScene === this.scene,
      attribution: this.externalConfig.attribution,
    };
  }

  async probeExternalFallback(timeoutMs = 2400): Promise<{ passed: boolean; source: string }> {
    if (typeof Audio === "undefined") return { passed: false, source: "unsupported" };
    await this.unlock();
    if (!this.ctx || !this.unlocked) return { passed: false, source: this.getDiagnostics().source };

    const previousConfig = this.externalConfig;
    const previousMode = this.musicMode;
    const previousScene = this.scene;
    const previousFailure = this.externalFailedScene;
    const probeScene = this.scene;

    this.externalConfig = {
      attribution: "QA failure probe",
      tracks: { [probeScene]: "http://127.0.0.1:9/__cmys_missing_audio__.mp3" },
    };
    this.musicMode = "external";
    this.externalFailedScene = null;
    this.restartMusic();

    const deadline = Date.now() + timeoutMs;
    let passed = false;
    while (Date.now() < deadline) {
      const diagnostics = this.getDiagnostics();
      if (diagnostics.source === "procedural" && diagnostics.externalFailed) {
        passed = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const source = this.getDiagnostics().source;

    this.stopMusic();
    this.externalConfig = previousConfig;
    this.musicMode = previousMode;
    this.scene = previousScene;
    this.externalFailedScene = previousFailure;
    this.restartMusic();
    return { passed, source };
  }

  setMusicScene(scene: MusicScene) {
    if (this.scene === scene) return;
    this.scene = scene;
    this.externalFailedScene = null;
    this.restartMusic();
  }

  private stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.externalAudio) {
      this.externalAudio.pause();
      this.externalAudio.src = "";
      this.externalAudio = null;
    }
  }

  private restartMusic() {
    this.stopMusic();
    if (!this.unlocked || this.musicMode === "off" || this.masterVolume <= 0 || this.musicVolume <= 0) return;
    if (this.musicMode === "external" && this.tryExternalMusic()) return;
    this.startProceduralMusic();
  }

  private tryExternalMusic(): boolean {
    if (typeof Audio === "undefined" || this.externalFailedScene === this.scene) return false;
    const configured = this.externalConfig.tracks?.[this.scene];
    const url = resolveExternalMusicUrl(configured);
    if (!url) return false;
    const player = new Audio(url);
    player.loop = true;
    player.preload = "auto";
    player.volume = this.masterVolume * this.musicVolume;
    player.addEventListener("error", () => {
      if (this.externalAudio !== player) return;
      this.externalFailedScene = this.scene;
      this.externalAudio = null;
      this.startProceduralMusic();
    }, { once: true });
    this.externalAudio = player;
    void player.play().catch(() => {
      if (this.externalAudio !== player) return;
      this.externalFailedScene = this.scene;
      this.externalAudio = null;
      this.startProceduralMusic();
    });
    return true;
  }

  private startProceduralMusic() {
    if (!this.ctx || !this.musicGain || this.musicMode === "off") return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    const schedule = () => {
      if (!this.ctx || !this.musicGain || !this.unlocked || this.musicMode === "off") return;
      const track = PROCEDURAL_TRACKS[this.scene];
      while (this.nextStepTime < this.ctx.currentTime + 0.24) {
        this.scheduleStep(track, this.step, this.nextStepTime);
        const secondsPerStep = 60 / track.bpm / 4;
        const swing = track.swing && this.step % 2 === 1 ? secondsPerStep * track.swing : 0;
        this.nextStepTime += secondsPerStep + swing;
        this.step = (this.step + 1) % 64;
      }
    };
    schedule();
    this.musicTimer = setInterval(schedule, 70);
  }

  private scheduleStep(track: ProceduralTrack, step: number, time: number) {
    const index = step % track.melody.length;
    const melodyDegree = track.melody[index];
    const bassDegree = track.bass[index % track.bass.length];
    const chordRoot = track.chord[Math.floor(step / 4) % track.chord.length];

    if (melodyDegree > -90) {
      const midi = this.degreeToMidi(track, melodyDegree + chordRoot, 12);
      this.scheduleTone(midiToFrequency(midi), track.leadWave, time, 0.105, track.leadGain, 0.008);
    }
    if (bassDegree > -90 && step % 2 === 0) {
      const midi = this.degreeToMidi(track, bassDegree + chordRoot, -12);
      this.scheduleTone(midiToFrequency(midi), track.bassWave, time, 0.22, track.bassGain, 0.012);
    }
    if (step % 4 === 0) this.scheduleKick(time, track.drumGain);
    if (step % 4 === 2) this.scheduleHat(time, track.drumGain * 0.72);
    if (step % 8 === 4 && track.drumGain > 0.04) this.scheduleSnare(time, track.drumGain * 0.68);
  }

  private degreeToMidi(track: ProceduralTrack, degree: number, octaveOffset: number): number {
    const scaleLength = track.scale.length;
    const octave = Math.floor(degree / scaleLength);
    const wrapped = ((degree % scaleLength) + scaleLength) % scaleLength;
    return track.rootMidi + track.scale[wrapped] + octave * 12 + octaveOffset;
  }

  private scheduleTone(freq: number, wave: OscillatorType, time: number, duration: number, gainValue: number, attack: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private scheduleKick(time: number, amount: number) {
    if (!this.ctx || !this.musicGain || amount <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    gain.gain.setValueAtTime(amount, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private scheduleHat(time: number, amount: number) {
    this.scheduleTone(2600, "square", time, 0.025, Math.max(0.002, amount), 0.002);
  }

  private scheduleSnare(time: number, amount: number) {
    this.scheduleTone(190, "sawtooth", time, 0.07, Math.max(0.003, amount), 0.002);
    this.scheduleTone(820, "square", time, 0.035, Math.max(0.002, amount * 0.5), 0.002);
  }

  playBeep(freq: number, type: OscillatorType, duration: number, vol = 0.1, slideTo?: number) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    void this.unlock();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo && slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(Math.max(0.0001, vol), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(now + duration + 0.02);
    } catch {
      // Audio is non-critical.
    }
  }

  playShoot() {
    this.playBeep(520, "square", 0.075, 0.045, 260);
  }

  playWeaponShot(style: ProjectileStyle, recoil = 0.35) {
    const volume = Math.min(0.11, 0.035 + Math.max(0, recoil) * 0.018);
    if (style === "tracer") {
      this.playBeep(760, "square", 0.045, volume, 360);
    } else if (style === "beam") {
      this.playBeep(980, "sawtooth", 0.09, volume * 0.9, 310);
    } else if (style === "lightning") {
      this.playBeep(1240, "square", 0.045, volume * 0.72, 620);
      setTimeout(() => this.playBeep(430, "sawtooth", 0.065, volume * 0.62, 190), 12);
    } else if (style === "plasma") {
      this.playBeep(280, "sine", 0.12, volume, 720);
    } else if (style === "flame") {
      this.playBeep(210, "sawtooth", 0.085, volume * 0.9, 72);
    } else if (style === "rocket") {
      this.playBeep(118, "sawtooth", 0.17, volume, 44);
    } else if (style === "disc") {
      this.playBeep(680, "triangle", 0.11, volume * 0.85, 210);
    } else {
      this.playBeep(520, "square", 0.075, volume, 260);
    }
  }

  playHit() {
    this.playBeep(170, "sawtooth", 0.09, 0.075, 95);
  }

  playPickup() {
    this.playBeep(660, "square", 0.08, 0.05, 880);
    if (this.ctx) setTimeout(() => this.playBeep(990, "triangle", 0.09, 0.035), 55);
  }

  playHurt() {
    this.playBeep(125, "sawtooth", 0.22, 0.13, 58);
  }

  playClearRoom() {
    this.playBeep(523.25, "square", 0.12, 0.05, 659.25);
    setTimeout(() => this.playBeep(783.99, "triangle", 0.22, 0.06), 90);
  }

  playSkill() {
    this.playBeep(330, "square", 0.16, 0.07, 990);
  }

  playPortal() {
    this.playBeep(220, "sine", 0.4, 0.065, 880);
  }

  cleanup() {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new AudioManager();
