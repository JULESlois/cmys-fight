import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";

export type CombatEventType = 
  | "player_perfect_dodge"
  | "player_hit_enemy"
  | "player_kill_enemy"
  | "player_damaged"
  | "player_weapon_swapped"
  | "player_room_cleared"
  | "player_room_entered";

export interface CombatEventPayloads {
  "player_perfect_dodge": { player: Player };
  "player_hit_enemy": { player: Player, enemy: Enemy, damage: number, isCrit: boolean };
  "player_kill_enemy": { player: Player, enemy: Enemy };
  "player_damaged": { player: Player, damage: number };
  "player_weapon_swapped": { player: Player, previousWeaponId: string, newWeaponId: string };
  "player_room_cleared": { player: Player, noDamageTaken: boolean };
  "player_room_entered": { player: Player };
}

export type CombatEventListener<T extends CombatEventType> = (payload: CombatEventPayloads[T]) => void;

class CombatEventDispatcherImpl {
  private listeners = new Map<CombatEventType, Array<CombatEventListener<any>>>();

  public on<T extends CombatEventType>(event: T, listener: CombatEventListener<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public off<T extends CombatEventType>(event: T, listener: CombatEventListener<T>) {
    if (!this.listeners.has(event)) return;
    const array = this.listeners.get(event)!;
    const index = array.indexOf(listener);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  public emit<T extends CombatEventType>(event: T, payload: CombatEventPayloads[T]) {
    if (!this.listeners.has(event)) return;
    const array = this.listeners.get(event)!;
    for (let i = 0; i < array.length; i++) {
      array[i](payload);
    }
  }
}

export const CombatEventDispatcher = new CombatEventDispatcherImpl();
