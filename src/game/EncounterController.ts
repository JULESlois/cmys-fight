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

export interface SerializedEncounterState {
  active: boolean;
  state: "waiting_delay" | "telegraphing" | "spawning" | "combat" | "finished";
  waves: Wave[];
  currentWaveIndex: number;
  timer: number;
  telegraphs: { x: number, y: number, timeLeft: number, type: "melee"|"ranged"|"boss" }[];
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

  public serialize(): SerializedEncounterState {
    return {
      active: this.active,
      state: this.state,
      waves: this.waves.map(wave => ({
        ...wave,
        spawns: wave.spawns.map(spawn => ({ ...spawn }))
      })),
      currentWaveIndex: this.currentWaveIndex,
      timer: this.timer,
      telegraphs: this.telegraphs.map(telegraph => ({ ...telegraph }))
    };
  }

  public restore(saved: SerializedEncounterState): void {
    this.active = saved.active;
    this.state = saved.state;
    this.waves = saved.waves.map(wave => ({
      ...wave,
      spawns: wave.spawns.map(spawn => ({ ...spawn }))
    }));
    this.currentWaveIndex = saved.currentWaveIndex;
    this.timer = saved.timer;
    this.telegraphs = saved.telegraphs.map(telegraph => ({ ...telegraph }));
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
