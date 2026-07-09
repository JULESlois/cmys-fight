import { Enemy } from "./entities/Enemy";

export interface EnemySpawn {
  x: number;
  y: number;
  type: "melee" | "ranged" | "boss";
}

export interface Wave {
  delay: number; // Time before this wave starts spawning (after previous is cleared, or start of room)
  spawns: EnemySpawn[];
  telegraphTime: number; // How long the warning circle shows before enemy appears
}

export interface EncounterDef {
  id: string;
  waves: Wave[];
}

export class EncounterController {
  public active: boolean = false;
  private waves: Wave[] = [];
  private currentWaveIndex: number = 0;
  
  public state: "waiting_delay" | "telegraphing" | "spawning" | "combat" | "finished" = "finished";
  private timer: number = 0;
  
  public telegraphs: { x: number, y: number, timeLeft: number, type: "melee"|"ranged"|"boss" }[] = [];
  
  constructor() {}
  
  public start(encounter: EncounterDef) {
    this.waves = encounter.waves;
    this.currentWaveIndex = 0;
    this.active = true;
    this.telegraphs = [];
    this.setupNextWave();
  }
  
  private setupNextWave() {
    if (this.currentWaveIndex >= this.waves.length) {
      this.state = "finished";
      this.active = false;
      return;
    }
    const wave = this.waves[this.currentWaveIndex];
    this.timer = wave.delay;
    this.state = "waiting_delay";
  }
  
  public update(dt: number, currentEnemies: Enemy[], spawnCallback: (e: EnemySpawn) => void) {
    if (!this.active) return;
    
    if (this.state === "waiting_delay") {
      this.timer -= dt;
      if (this.timer <= 0) {
        // Start telegraphing
        const wave = this.waves[this.currentWaveIndex];
        this.timer = wave.telegraphTime;
        this.telegraphs = wave.spawns.map(s => ({ x: s.x, y: s.y, timeLeft: wave.telegraphTime, type: s.type }));
        this.state = "telegraphing";
      }
    } else if (this.state === "telegraphing") {
      this.timer -= dt;
      for (const t of this.telegraphs) {
        t.timeLeft -= dt;
      }
      if (this.timer <= 0) {
        // Spawn enemies
        const wave = this.waves[this.currentWaveIndex];
        for (const s of wave.spawns) {
          spawnCallback(s);
        }
        this.telegraphs = [];
        this.state = "combat";
      }
    } else if (this.state === "combat") {
      if (currentEnemies.length === 0) {
        // Wave cleared
        this.currentWaveIndex++;
        this.setupNextWave();
      }
    }
  }
}
