import re

with open("src/game/states/DungeonState.ts", "r") as f:
    text = f.read()

# Update angleToFacing to use jitter control based on current facing
old_angle_to_facing = """  private angleToFacing(angle: number): "right" | "left" | "up" | "down" {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    if (Math.abs(cosA) > Math.abs(sinA)) {
      return cosA > 0 ? "right" : "left";
    } else {
      return sinA > 0 ? "down" : "up";
    }
  }"""

new_angle_to_facing = """  private angleToFacing(angle: number, currentFacing: "right" | "left" | "up" | "down"): "right" | "left" | "up" | "down" {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    // Add hysteresis to prevent rapid jittering on boundaries
    if (currentFacing === "left" || currentFacing === "right") {
      if (Math.abs(sinA) > Math.abs(cosA) * 1.25) {
        return sinA > 0 ? "down" : "up";
      }
      return cosA > 0 ? "right" : "left";
    } else {
      if (Math.abs(cosA) > Math.abs(sinA) * 1.25) {
        return cosA > 0 ? "right" : "left";
      }
      return sinA > 0 ? "down" : "up";
    }
  }"""
text = text.replace(old_angle_to_facing, new_angle_to_facing)

# Rewrite updatePlayerFacingAndAnimation
old_update_player = """  private updatePlayerFacingAndAnimation(dt: number) {
    const axis = this.engine.input.getAxis();
    const isMoving = axis.x !== 0 || axis.y !== 0;
    const isShooting = this.engine.input.keys["Space"];
    const aimTarget = this.getClosestEnemy();

    // Body facing logic
    if (aimTarget || isShooting) {
      // Prioritize aim angle when aiming at enemy or shooting
      const targetFacing = this.angleToFacing(this.player.aimAngle);
      
      if (!isMoving && !isShooting && aimTarget) {
         // Auto-aim while stationary: only update left/right to prevent up/down jitter
         const cosA = Math.cos(this.player.aimAngle);
         this.player.facing = cosA > 0 ? "right" : "left";
      } else {
         this.player.facing = targetFacing;
      }
    } else if (isMoving) {
      // No enemies/shooting, use movement direction
      this.player.facing = this.axisToFacing(axis);
    }

    this.player.facingLeft = this.player.facing === "left";

    // Animation state logic
    if (isMoving) {
       this.player.animState = "walk";
       this.player.animTimer += dt;
       this.player.animFrame = Math.floor(this.player.animTimer * 8) % 2;
    } else {
       this.player.animState = "idle";
       this.player.animFrame = 0;
    }
  }"""

new_update_player = """  private updatePlayerFacingAndAnimation(dt: number) {
    const axis = this.engine.input.getAxis();
    const isMoving = axis.x !== 0 || axis.y !== 0;

    // Body facing logic always follows aimAngle
    this.player.facing = this.angleToFacing(this.player.aimAngle, this.player.facing);
    this.player.facingLeft = this.player.facing === "left";

    // Animation state logic solely based on movement
    if (isMoving) {
       this.player.animState = "walk";
       this.player.animTimer += dt;
       this.player.animFrame = Math.floor(this.player.animTimer * 8) % 2;
    } else {
       this.player.animState = "idle";
       this.player.animFrame = 0;
    }
  }"""

text = text.replace(old_update_player, new_update_player)

# Also fix fireWeapon to update facing correctly
old_fire_weapon = """  private fireWeapon(weapon: any) {
    if (this.player.mana < weapon.manaCost) return;
    this.player.mana -= weapon.manaCost;
    
    audio.playShoot();
    this.player.muzzleFlash = 1.0;
    
    // Use the stored aimAngle instead of recalculating
    const baseAngle = this.player.aimAngle;
    
    const muzzle = this.player.getPlayerMuzzlePosition(baseAngle);"""

new_fire_weapon = """  private fireWeapon(weapon: any) {
    if (this.player.mana < weapon.manaCost) return;
    this.player.mana -= weapon.manaCost;
    
    audio.playShoot();
    this.player.muzzleFlash = 1.0;
    
    // Ensure aim angle and facing are up-to-date at the exact moment of firing
    const baseAngle = this.getPlayerAimAngle();
    this.player.aimAngle = baseAngle;
    this.player.facing = this.angleToFacing(baseAngle, this.player.facing);
    this.player.facingLeft = this.player.facing === "left";
    
    const muzzle = this.player.getPlayerMuzzlePosition(baseAngle);"""

if "const baseAngle = this.player.aimAngle;" in text:
    text = text.replace(old_fire_weapon, new_fire_weapon)
else:
    print("Warning: Could not find old_fire_weapon in DungeonState.ts")


with open("src/game/states/DungeonState.ts", "w") as f:
    f.write(text)
