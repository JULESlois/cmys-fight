import { SPRITES, DEFAULT_PALETTE } from "../data/sprites";

export interface SpriteOptions {
  flipX?: boolean;
  hitFlash?: boolean;
  paletteOverride?: Record<string, string>;
}

export class SpriteRenderer {
  static drawPixelSprite(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    scale: number = 1,
    options: SpriteOptions = {}
  ) {
    let spriteData = SPRITES[spriteName];
    if (!spriteData) {
       // Fallback logic
       if (spriteName.startsWith("player_")) {
           const parts = spriteName.split("_");
           if (parts.length >= 4) {
               // parts = ["player", id, state, facing, maybe frame]
               const charId = parts[1];
               const facing = parts[3];
               // If shoot/walk is missing, fallback to idle of same facing
               spriteData = SPRITES[`player_${charId}_idle_${facing}`];
               
               // If that specific character doesn't have that facing, try knight
               if (!spriteData) spriteData = SPRITES[`player_knight_idle_${facing}`];
           }
           
           // If still missing (e.g. facing was undefined or weird), fallback to down
           if (!spriteData) {
               spriteData = SPRITES[`player_${parts[1]}_idle_down`];
           }
           
           if (!spriteData) spriteData = SPRITES["player_knight_idle_down"];
       }
       else if (spriteName.startsWith("enemy_")) spriteData = SPRITES["enemy_melee_idle"];
       else if (spriteName.startsWith("pickup_")) spriteData = SPRITES["pickup_weapon"] || SPRITES["pickup_pistol"];
       
       // Global fallback box if still nothing
       if (!spriteData) {
         console.warn("Missing sprite", spriteName); ctx.fillStyle = "#FF00FF";
         ctx.fillRect(Math.round(x) - 4 * scale, Math.round(y) - 4 * scale, 8 * scale, 8 * scale);
         ctx.fillStyle = "white";
         ctx.font = "10px monospace";
         ctx.fillText(spriteName, x, y - 10);
         return;
       }
    }

    // Force scale to be integer
    scale = Math.max(1, Math.round(scale));

    const rows = spriteData.length;
    const cols = spriteData[0].length;
    const w = cols * scale;
    const h = rows * scale;
    
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    
    if (options.flipX) {
      ctx.scale(-1, 1);
    }
    
    // Draw centered
    const startX = Math.round(-w / 2);
    const startY = Math.round(-h / 2);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const char = spriteData[row][col];
        if (char === '.') continue;
        
        let color = DEFAULT_PALETTE[char] || "#FF00FF";
        if (options.paletteOverride && options.paletteOverride[char]) {
          color = options.paletteOverride[char];
        }
        
        if (options.hitFlash && char !== '.') {
          color = "#FFFFFF";
        }

        ctx.fillStyle = color;
        ctx.fillRect(startX + col * scale, startY + row * scale, scale, scale);
      }
    }
    
    ctx.restore();
  }
}
