export class Enemy {
  public id: number;
  public x: number;
  public y: number;
  public radius: number = 8;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public type: "melee" | "ranged" | "boss";
  public shootCooldown: number = 0;
  public state: "idle" | "chase" | "flee" = "chase";
  public hitFlash: number = 0;

  private static nextId = 0;

  constructor(x: number, y: number, type: "melee" | "ranged" | "boss") {
    this.id = Enemy.nextId++;
    this.x = x;
    this.y = y;
    this.type = type;
    
    if (type === "melee") {
      this.maxHp = 10;
      this.speed = 40;
    } else if (type === "ranged") {
      this.maxHp = 6;
      this.speed = 25;
    } else {
      this.maxHp = 50;
      this.speed = 30;
    }
    this.hp = this.maxHp;
  }
}
