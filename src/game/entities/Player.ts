export class Player {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  
  public radius: number = 6;
  public hp: number;
  public maxHp: number;
  public armor: number = 0;
  public maxArmor: number = 5;
  public mana: number;
  public maxMana: number;
  
  public speed: number = 80;
  public characterId: string = "knight";
  public currentWeaponId: string = "pistol";
  public fireCooldown: number = 0;
  
  public facingLeft: boolean = false;
  public muzzleFlash: number = 0;
  public hitFlash: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.maxMana = 100;
    this.mana = this.maxMana;
    this.armor = this.maxArmor;
  }
}
