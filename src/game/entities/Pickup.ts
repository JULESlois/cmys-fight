export type PickupType = "hp" | "mana" | "coin" | "weapon";

export class Pickup {
  public id = 0;
  public x = 0;
  public y = 0;
  public radius = 6;
  public type: PickupType = "coin";
  public value = 0;
  public weaponId?: string;
  public blockedUntilPlayerLeaves = false;

  private static nextId = 0;

  constructor(x: number, y: number, type: PickupType, value: number, weaponId?: string) {
    this.reset(x, y, type, value, weaponId);
  }

  reset(x: number, y: number, type: PickupType, value: number, weaponId?: string): this {
    this.id = Pickup.nextId++;
    this.x = x;
    this.y = y;
    this.radius = 6;
    this.type = type;
    this.value = value;
    this.weaponId = weaponId;
    this.blockedUntilPlayerLeaves = false;
    delete (this as any).bounceTimer;
    delete (this as any).baseY;
    return this;
  }
}
