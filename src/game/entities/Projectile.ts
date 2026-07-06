export class Projectile {
  public id: number;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public damage: number;
  public faction: "player" | "enemy";
  public life: number;
  public color: string;

  private static nextId = 0;

  constructor(
    x: number, y: number, 
    vx: number, vy: number, 
    radius: number, damage: number, 
    faction: "player" | "enemy", 
    life: number = 2.0,
    color: string = "#FFF"
  ) {
    this.id = Projectile.nextId++;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.faction = faction;
    this.life = life;
    this.color = color;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
}
