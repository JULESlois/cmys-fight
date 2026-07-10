import { SPRITES, DEFAULT_PALETTE } from "../data/sprites";

export interface SpriteOptions {
  flipX?: boolean;
  hitFlash?: boolean;
  paletteOverride?: Record<string, string>;
  outlineColor?: string;
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
           spriteData = SPRITES["player_main_side_idle"];
       }
       else if (spriteName.startsWith("weapon_")) spriteData = SPRITES["weapon_pistol"];
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

    if (options.outlineColor) {
      ctx.fillStyle = options.outlineColor;
      const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (spriteData[row][col] === '.') continue;
          for (const [dx, dy] of neighbors) {
            const nr = row + dy;
            const nc = col + dx;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && spriteData[nr][nc] !== '.') continue;
            ctx.fillRect(startX + nc * scale, startY + nr * scale, scale, scale);
          }
        }
      }
    }

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
