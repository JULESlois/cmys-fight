import type { Player } from "../entities/Player";
import type { CombatEventType, CombatEventPayloads } from "./CombatEvents";
import { CombatEventDispatcher } from "./CombatEvents";
import { SkillController } from "./SkillController";

export interface CharacterResourceContext {
  player: Player;
  activeWeaponId: string;
  activeWeaponResourceType: string;
}

export interface CharacterResource {
  readonly id: string;
  readonly characterId: string;
  value: number;
  max: number;
  active: boolean;

  update(dt: number, context: CharacterResourceContext): void;
  onCombatEvent<T extends CombatEventType>(event: T, payload: CombatEventPayloads[T], context: CharacterResourceContext): void;
  getHudState(): { value: number; max: number; active: boolean; label: string };
  reset(): void;
}

// ============================================================
// Mage: Arcane Echo (accumulator)
// ============================================================

export class MageArcaneEcho implements CharacterResource {
  readonly id = "arcane_echo";
  readonly characterId = "mage";
  value = 0;
  max = SkillController.MAGE_ECHO_THRESHOLD;
  active = false;

  update(_dt: number, _context: CharacterResourceContext): void {
    // Accumulator: no passive decay/gain
  }

  onCombatEvent<T extends CombatEventType>(event: T, payload: CombatEventPayloads[T], context: CharacterResourceContext): void {
    if (event === "weapon_fired") {
      const p = payload as CombatEventPayloads["weapon_fired"];
      if (p.resourceType === "battery") {
        const weapon = (require("../data/weapons") as typeof import("../data/weapons")).WEAPONS[p.weaponId];
        const cost = weapon?.manaCost ?? 0;
        if (cost > 0) {
          this.value += cost;
          if (this.value >= this.max) {
            this.value -= this.max;
            this.active = true;
            // The echo trigger is handled by WeaponController checking player.mageArcaneCharge
            // We sync back to the legacy field for now
            context.player.mageArcaneCharge = this.value;
          }
        }
      }
    } else if (event === "player_perfect_dodge") {
      this.value += 2;
      if (this.value >= this.max) {
        this.value -= this.max;
        this.active = true;
        context.player.mageArcaneCharge = this.value;
      }
    }
    // Sync to legacy field
    context.player.mageArcaneCharge = Math.min(this.max, this.value);
  }

  getHudState(): { value: number; max: number; active: boolean; label: string } {
    return { value: this.value, max: this.max, active: this.active, label: "ECHO" };
  }

  reset(): void {
    this.value = 0;
    this.active = false;
  }
}

// ============================================================
// Knight: Guardian Layer (state flag)
// ============================================================

export class KnightGuardianLayer implements CharacterResource {
  readonly id = "guardian_layer";
  readonly characterId = "knight";
  value = 0; // 0 = not ready, 1 = ready
  max = 1;
  active = false;

  update(_dt: number, context: CharacterResourceContext): void {
    // Sync from legacy field
    this.active = context.player.knightGuardReady;
    this.value = this.active ? 1 : 0;
  }

  onCombatEvent<T extends CombatEventType>(event: T, payload: CombatEventPayloads[T], context: CharacterResourceContext): void {
    if (event === "player_perfect_dodge") {
      this.active = true;
      this.value = 1;
      context.player.knightGuardReady = true;
    } else if (event === "player_damaged") {
      if (this.active) {
        this.active = false;
        this.value = 0;
        // DamageSystem handles the actual damage reduction
      }
    }
  }

  getHudState(): { value: number; max: number; active: boolean; label: string } {
    return { value: this.value, max: this.max, active: this.active, label: "GUARD" };
  }

  reset(): void {
    this.value = 0;
    this.active = false;
  }
}

// ============================================================
// Rogue: Momentum (timer)
// ============================================================

export class RogueMomentum implements CharacterResource {
  readonly id = "momentum";
  readonly characterId = "rogue";
  value = 0;
  max = SkillController.ROGUE_CRIT_DURATION;
  active = false;

  update(dt: number, context: CharacterResourceContext): void {
    if (this.value > 0) {
      this.value = Math.max(0, this.value - dt);
      context.player.rogueCritTimer = this.value;
    }
    this.active = this.value > 0;
  }

  onCombatEvent<T extends CombatEventType>(event: T, payload: CombatEventPayloads[T], context: CharacterResourceContext): void {
    if (event === "player_weapon_swapped") {
      // Fast swap grants momentum
      this.value = Math.min(this.max, this.value + 1.0);
      context.player.rogueCritTimer = this.value;
    } else if (event === "player_perfect_dodge") {
      // Perfect dodge grants crit window
      this.value = this.max;
      context.player.rogueCritTimer = this.value;
    } else if (event === "player_kill_enemy") {
      // Close kill extends momentum slightly
      const p = payload as CombatEventPayloads["player_kill_enemy"];
      const dx = p.enemy.x - context.player.x;
      const dy = p.enemy.y - context.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 48) {
        this.value = Math.min(this.max, this.value + 0.5);
        context.player.rogueCritTimer = this.value;
      }
    }
    this.active = this.value > 0;
  }

  getHudState(): { value: number; max: number; active: boolean; label: string } {
    return { value: this.value, max: this.max, active: this.active, label: "MOMENTUM" };
  }

  reset(): void {
    this.value = 0;
    this.active = false;
  }
}

// ============================================================
// Registry & Controller
// ============================================================

const RESOURCE_FACTORIES: Record<string, () => CharacterResource> = {
  mage: () => new MageArcaneEcho(),
  knight: () => new KnightGuardianLayer(),
  rogue: () => new RogueMomentum(),
};

class CharacterResourceControllerImpl {
  private resources = new Map<string, CharacterResource>();
  private listenersAttached = false;

  public getResource(characterId: string): CharacterResource | undefined {
    return this.resources.get(characterId);
  }

  public initForCharacter(characterId: string, player: Player): void {
    this.resources.clear();
    const factory = RESOURCE_FACTORIES[characterId];
    if (factory) {
      const resource = factory();
      this.resources.set(characterId, resource);
      // Restore from legacy fields
      if (characterId === "mage") {
        resource.value = Math.min(resource.max, player.mageArcaneCharge);
      } else if (characterId === "knight") {
        resource.active = player.knightGuardReady;
        resource.value = resource.active ? 1 : 0;
      } else if (characterId === "rogue") {
        resource.value = player.rogueCritTimer;
        resource.active = resource.value > 0;
      }
    }
    if (!this.listenersAttached) {
      this.attachListeners();
    }
  }

  public update(dt: number, context: CharacterResourceContext): void {
    for (const resource of this.resources.values()) {
      resource.update(dt, context);
    }
  }

  public getHudState(characterId: string): { value: number; max: number; active: boolean; label: string } | null {
    const resource = this.resources.get(characterId);
    return resource ? resource.getHudState() : null;
  }

  public resetAll(): void {
    for (const resource of this.resources.values()) {
      resource.reset();
    }
  }

  private attachListeners(): void {
    const events: CombatEventType[] = [
      "weapon_fired",
      "player_perfect_dodge",
      "player_damaged",
      "player_weapon_swapped",
      "player_kill_enemy",
    ];
    for (const event of events) {
      CombatEventDispatcher.on(event, ((payload: any) => {
        for (const resource of this.resources.values()) {
          const context: CharacterResourceContext = {
            player: payload.player,
            activeWeaponId: payload.player.currentWeaponId,
            activeWeaponResourceType: "",
          };
          resource.onCombatEvent(event, payload, context);
        }
      }) as any);
    }
    this.listenersAttached = true;
  }
}

export const CharacterResourceController = new CharacterResourceControllerImpl();
