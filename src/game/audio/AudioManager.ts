export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterVolume = 1;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("WebAudio not supported");
    }
  }

  playBeep(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    if (!this.enabled || !this.ctx) return;
    try {
       const osc = this.ctx.createOscillator();
       const gain = this.ctx.createGain();
       osc.type = type;
       osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
       
       gain.gain.setValueAtTime(vol * this.masterVolume, this.ctx.currentTime);
       gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
       
       osc.connect(gain);
       gain.connect(this.ctx.destination);
       
       osc.start();
       osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  setMasterVolume(value: number) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
  }

  playShoot() {
    this.playBeep(400, "square", 0.1, 0.05);
  }

  playHit() {
    this.playBeep(150, "sawtooth", 0.1, 0.1);
  }

  playPickup() {
    this.playBeep(800, "sine", 0.2, 0.1);
  }

  playHurt() {
    this.playBeep(100, "sawtooth", 0.3, 0.2);
  }

  playClearRoom() {
    this.playBeep(600, "sine", 0.5, 0.1);
  }
}

export const audio = new AudioManager();
