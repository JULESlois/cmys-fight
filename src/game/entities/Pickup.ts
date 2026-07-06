export class Pickup {
  public id: number;
  public x: number;
  public y: number;
  public radius: number = 6;
  public type: "hp" | "mana" | "coin" | "weapon";
  public value: number;
  public weaponId?: string;

  private static nextId = 0;

  constructor(x: number, y: number, type: "hp" | "mana" | "coin" | "weapon", value: number, weaponId?: string) {
    this.id = Pickup.nextId++;
    this.x = x;
    this.y = y;
    this.type = type;
    this.value = value;
    this.weaponId = weaponId;
  }
}
