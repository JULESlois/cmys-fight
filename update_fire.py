import re

with open("src/game/states/DungeonState.ts", "r") as f:
    text = f.read()

old_fire = """  private fireWeapon() {
    const weapon = WEAPONS[this.player.currentWeaponId];
    if (this.player.mana < weapon.manaCost) return;
    
    this.player.mana -= weapon.manaCost;
    this.player.fireCooldown = 1 / weapon.fireRate;
    this.player.muzzleFlash = 1.0;
    audio.playShoot();
    
    const baseAngle = this.player.aimAngle;
    
    const muzzle = this.player.getPlayerMuzzlePosition(baseAngle);"""

new_fire = """  private fireWeapon() {
    const weapon = WEAPONS[this.player.currentWeaponId];
    if (this.player.mana < weapon.manaCost) return;
    
    this.player.mana -= weapon.manaCost;
    this.player.fireCooldown = 1 / weapon.fireRate;
    this.player.muzzleFlash = 1.0;
    audio.playShoot();
    
    // Ensure aim angle and facing are up-to-date at the exact moment of firing
    const baseAngle = this.getPlayerAimAngle();
    this.player.aimAngle = baseAngle;
    this.player.facing = this.angleToFacing(baseAngle, this.player.facing);
    this.player.facingLeft = this.player.facing === "left";
    
    const muzzle = this.player.getPlayerMuzzlePosition(baseAngle);"""

if old_fire in text:
    text = text.replace(old_fire, new_fire)
else:
    print("Could not find old_fire in DungeonState.ts")

with open("src/game/states/DungeonState.ts", "w") as f:
    f.write(text)
