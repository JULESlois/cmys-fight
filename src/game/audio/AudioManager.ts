import {
  PROCEDURAL_TRACKS,
  type MusicMode,
  type MusicScene,
  type ProceduralTrack,
} from "./MusicLibrary";
import type { ProjectileStyle } from "../data/weapons";

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const MUSIC_SCHEDULER_LOOKAHEAD_SECONDS = 0.2;
export const MUSIC_SCHEDULER_DRIFT_LIMIT_SECONDS = 0.18;
export const MUSIC_SCENE_CROSSFADE_SECONDS = 0.24;

export interface MusicClockRecovery {
  step: number;
  nextStepTime: number;
  droppedSteps: number;
  lagSeconds: number;
}

export function getMusicStepDuration(bpm: number): number {
  return 60 / Math.max(1, bpm) / 4;
}

export function getMusicSwingOffset(step: number, secondsPerStep: number, swing = 0): number {
  return step % 2 === 1 ? secondsPerStep * Math.max(0, Math.min(0.45, swing)) : 0;
}

export function recoverMusicClock(
  step: number,
  nextStepTime: number,
  currentTime: number,
  secondsPerStep: number,
  patternLength = 64,
): MusicClockRecovery {
  const lagSeconds = Math.max(0, currentTime - nextStepTime);
  if (lagSeconds <= MUSIC_SCHEDULER_DRIFT_LIMIT_SECONDS) {
    return { step, nextStepTime, droppedSteps: 0, lagSeconds };
  }
  const droppedSteps = Math.max(1, Math.ceil(lagSeconds / Math.max(0.001, secondsPerStep)));
  return {
    step: (step + droppedSteps) % Math.max(1, patternLength),
    nextStepTime: currentTime + 0.04,
    droppedSteps,
    lagSeconds,
  };
}

export type AudioSourceStatus = "unsupported" | "blocked" | "off" | "procedural" | "idle";

export interface AudioDiagnostics {
  supported: boolean;
  contextState: string;
  unlocked: boolean;
  scene: MusicScene;
  activeScene: MusicScene;
  pendingScene: MusicScene | null;
  mode: MusicMode;
  source: AudioSourceStatus;
  masterVolume: number;
  musicVolume: number;
  schedulerLagMs: number;
  droppedSteps: number;
}

interface RetiredMusicBus {
  node: GainNode;
  disconnectAt: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private enabled = true;
  private masterVolume = 1;
  private musicVolume = 0.55;
  private musicMode: MusicMode = "adaptive";
  private unlocked = false;
  private musicPaused = false;
  private scene: MusicScene = "title";
  private activeScene: MusicScene = "title";
  private pendingScene: MusicScene | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  private currentMusicBus: GainNode | null = null;
  private retiredMusicBuses: RetiredMusicBus[] = [];
  private readonly musicSources = new Set<AudioScheduledSourceNode>();
  private schedulerLagMs = 0;
  private droppedSteps = 0;

  constructor() {
    try {
      if (typeof window === "undefined") return;
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = AudioContextCtor ? new AudioContextCtor() : null;
      if (this.ctx) {
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -7;
        this.limiter.knee.value = 12;
        this.limiter.ratio.value = 8;
        this.limiter.attack.value = 0.004;
        this.limiter.release.value = 0.16;
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
        this.applyVolumes();
      }
      const unlockOnce = () => {
        void this.unlock();
        window.removeEventListener("pointerdown", unlockOnce);
        window.removeEventListener("keydown", unlockOnce);
      };
      window.addEventListener("pointerdown", unlockOnce, { passive: true });
      window.addEventListener("keydown", unlockOnce);
    } catch {
      console.warn("WebAudio not supported");
    }
  }

  private wantsMusic(): boolean {
    return !this.musicPaused && this.musicMode === "adaptive" && this.masterVolume > 0 && this.musicVolume > 0;
  }

  private applyVolumes(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.03);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.08);
    }
  }

  private updateMusicForAudibility(wasAudible: boolean): void {
    const audible = this.wantsMusic();
    if (!audible && this.musicTimer) {
      this.stopMusic();
    } else if (audible && !wasAudible && this.unlocked && !this.musicTimer) {
      this.startProceduralMusic();
    }
  }

  private async unlock(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state !== "running") await this.ctx.resume();
      this.unlocked = this.ctx.state === "running";
      if (this.unlocked && this.wantsMusic() && !this.musicTimer) this.startProceduralMusic();
    } catch {
      this.unlocked = false;
    }
  }

  setMasterVolume(value: number): void {
    const wasAudible = this.wantsMusic();
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.applyVolumes();
    this.updateMusicForAudibility(wasAudible);
  }

  setMusicVolume(value: number): void {
    const wasAudible = this.wantsMusic();
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.applyVolumes();
    this.updateMusicForAudibility(wasAudible);
  }

  setMusicMode(mode: MusicMode): void {
    if (this.musicMode === mode) {
      if (mode === "adaptive" && this.unlocked && this.wantsMusic() && !this.musicTimer) this.startProceduralMusic();
      return;
    }
    this.musicMode = mode;
    if (mode === "off") this.stopMusic();
    else this.restartMusic();
  }

  getMusicScene(): MusicScene {
    return this.scene;
  }

  getDiagnostics(): AudioDiagnostics {
    let source: AudioSourceStatus = "idle";
    if (!this.ctx) source = "unsupported";
    else if (!this.wantsMusic()) source = "off";
    else if (!this.unlocked || this.ctx.state !== "running") source = "blocked";
    else if (this.musicTimer) source = "procedural";
    return {
      supported: Boolean(this.ctx),
      contextState: this.ctx?.state ?? "unavailable",
      unlocked: this.unlocked,
      scene: this.scene,
      activeScene: this.activeScene,
      pendingScene: this.pendingScene,
      mode: this.musicMode,
      source,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      schedulerLagMs: this.schedulerLagMs,
      droppedSteps: this.droppedSteps,
    };
  }

  setMusicScene(scene: MusicScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    if (!this.musicTimer) {
      this.activeScene = scene;
      this.pendingScene = null;
      if (this.unlocked && this.wantsMusic()) this.startProceduralMusic();
      return;
    }
    this.pendingScene = scene === this.activeScene ? null : scene;
  }

  /** Fully silences music (e.g. during the splash intro) until unpaused. */
  setMusicPaused(paused: boolean): void {
    if (this.musicPaused === paused) return;
    this.musicPaused = paused;
    if (paused) this.stopMusic();
    else this.restartMusic();
  }

  private trackMusicSource(source: AudioScheduledSourceNode): void {
    this.musicSources.add(source);
    source.onended = () => this.musicSources.delete(source);
  }

  private stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.pendingScene = null;
    const stopAt = (this.ctx?.currentTime ?? 0) + 0.02;
    for (const source of this.musicSources) {
      try { source.stop(stopAt); } catch { /* Already stopped. */ }
    }
    this.musicSources.clear();
    this.currentMusicBus?.disconnect();
    this.currentMusicBus = null;
    for (const retired of this.retiredMusicBuses) retired.node.disconnect();
    this.retiredMusicBuses = [];
    this.activeScene = this.scene;
  }

  private restartMusic(): void {
    this.stopMusic();
    if (!this.unlocked || !this.wantsMusic()) return;
    this.startProceduralMusic();
  }

  private createMusicBus(initialGain: number, time: number): GainNode | null {
    if (!this.ctx || !this.musicGain) return null;
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(Math.max(0.0001, initialGain), time);
    bus.connect(this.musicGain);
    return bus;
  }

  private transitionToPendingScene(time: number): void {
    if (!this.ctx || !this.pendingScene) return;
    const oldBus = this.currentMusicBus;
    const newBus = this.createMusicBus(0.0001, time);
    this.activeScene = this.pendingScene;
    this.pendingScene = null;
    if (!newBus) return;
    newBus.gain.exponentialRampToValueAtTime(1, time + MUSIC_SCENE_CROSSFADE_SECONDS);
    this.currentMusicBus = newBus;
    if (oldBus) {
      oldBus.gain.cancelScheduledValues(time);
      oldBus.gain.setValueAtTime(Math.max(0.0001, oldBus.gain.value), time);
      oldBus.gain.exponentialRampToValueAtTime(0.0001, time + MUSIC_SCENE_CROSSFADE_SECONDS);
      this.retiredMusicBuses.push({ node: oldBus, disconnectAt: time + MUSIC_SCENE_CROSSFADE_SECONDS + 0.08 });
    }
  }

  private cleanupRetiredMusicBuses(currentTime: number): void {
    this.retiredMusicBuses = this.retiredMusicBuses.filter(retired => {
      if (retired.disconnectAt > currentTime) return true;
      retired.node.disconnect();
      return false;
    });
  }

  private startProceduralMusic(): void {
    if (!this.ctx || !this.musicGain || !this.wantsMusic()) return;
    this.activeScene = this.scene;
    this.pendingScene = null;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    this.schedulerLagMs = 0;
    this.droppedSteps = 0;
    this.currentMusicBus = this.createMusicBus(1, this.ctx.currentTime);
    const schedule = (): void => {
      if (!this.ctx || !this.musicGain || !this.unlocked || !this.wantsMusic() || !this.currentMusicBus) return;
      this.cleanupRetiredMusicBuses(this.ctx.currentTime);
      let track = PROCEDURAL_TRACKS[this.activeScene];
      const recovery = recoverMusicClock(
        this.step,
        this.nextStepTime,
        this.ctx.currentTime,
        getMusicStepDuration(track.bpm),
      );
      this.step = recovery.step;
      this.nextStepTime = recovery.nextStepTime;
      if (recovery.droppedSteps > 0) {
        this.schedulerLagMs = Math.round(recovery.lagSeconds * 1000);
        this.droppedSteps += recovery.droppedSteps;
      }
      while (this.nextStepTime < this.ctx.currentTime + MUSIC_SCHEDULER_LOOKAHEAD_SECONDS) {
        if (this.pendingScene && this.step % 4 === 0) {
          this.transitionToPendingScene(this.nextStepTime);
          track = PROCEDURAL_TRACKS[this.activeScene];
        }
        const secondsPerStep = getMusicStepDuration(track.bpm);
        const scheduledTime = this.nextStepTime + getMusicSwingOffset(this.step, secondsPerStep, track.swing);
        this.scheduleStep(track, this.step, scheduledTime, this.currentMusicBus);
        this.nextStepTime += secondsPerStep;
        this.step = (this.step + 1) % 64;
      }
    };
    schedule();
    this.musicTimer = setInterval(schedule, 70);
  }

  private scheduleStep(track: ProceduralTrack, step: number, time: number, bus: GainNode): void {
    const index = step % track.melody.length;
    const melodyDegree = track.melody[index];
    const bassDegree = track.bass[index % track.bass.length];
    const chordRoot = track.chord[Math.floor(step / 4) % track.chord.length];
    const secondsPerStep = getMusicStepDuration(track.bpm);

    if (melodyDegree > -90) {
      const midi = this.degreeToMidi(track, melodyDegree + chordRoot, 12);
      this.scheduleTone(midiToFrequency(midi), track.leadWave, time, secondsPerStep * 0.72, track.leadGain, 0.008, bus);
    }
    if (bassDegree > -90 && step % 2 === 0) {
      const midi = this.degreeToMidi(track, bassDegree + chordRoot, -12);
      this.scheduleTone(midiToFrequency(midi), track.bassWave, time, secondsPerStep * 1.55, track.bassGain, 0.012, bus);
    }
    if (step % 4 === 0) this.scheduleKick(time, track.drumGain, bus);
    if (step % 4 === 2) this.scheduleHat(time, track.drumGain * 0.72, bus);
    if (step % 8 === 4 && track.drumGain > 0.04) this.scheduleSnare(time, track.drumGain * 0.68, bus);
  }

  private degreeToMidi(track: ProceduralTrack, degree: number, octaveOffset: number): number {
    const scaleLength = track.scale.length;
    const octave = Math.floor(degree / scaleLength);
    const wrapped = ((degree % scaleLength) + scaleLength) % scaleLength;
    return track.rootMidi + track.scale[wrapped] + octave * 12 + octaveOffset;
  }

  private scheduleTone(
    freq: number,
    wave: OscillatorType,
    time: number,
    duration: number,
    gainValue: number,
    attack: number,
    bus: GainNode,
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(bus);
    this.trackMusicSource(osc);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private scheduleKick(time: number, amount: number, bus: GainNode): void {
    if (!this.ctx || amount <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    gain.gain.setValueAtTime(amount, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    osc.connect(gain);
    gain.connect(bus);
    this.trackMusicSource(osc);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private scheduleHat(time: number, amount: number, bus: GainNode): void {
    this.scheduleTone(2600, "square", time, 0.025, Math.max(0.002, amount), 0.002, bus);
  }

  private scheduleSnare(time: number, amount: number, bus: GainNode): void {
    this.scheduleTone(190, "sawtooth", time, 0.07, Math.max(0.003, amount), 0.002, bus);
    this.scheduleTone(820, "square", time, 0.035, Math.max(0.002, amount * 0.5), 0.002, bus);
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
    } else if (style === "disc" || style === "yoyo") {
      this.playBeep(style === "yoyo" ? 740 : 680, "triangle", 0.11, volume * 0.85, 210);
    } else if (style === "water") {
      this.playBeep(360, "sine", 0.16, volume * 0.82, 640);
    } else if (style === "sword") {
      this.playBeep(820, "triangle", 0.12, volume, 250);
    } else if (style === "prism") {
      this.playBeep(1040, "sawtooth", 0.075, volume * 0.78, 520);
    } else if (style === "dragon") {
      this.playBeep(290, "triangle", 0.18, volume * 0.9, 860);
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
