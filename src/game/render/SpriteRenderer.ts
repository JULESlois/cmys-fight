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
    const spriteData = SPRITES[spriteName];
    if (!spriteData) return;

    const rows = spriteData.length;
    const cols = spriteData[0].length;
    const w = cols * scale;
    const h = rows * scale;
    
    ctx.save();
    ctx.translate(x, y);
    
    if (options.flipX) {
      ctx.scale(-1, 1);
    }
    
    // Draw centered
    const startX = -w / 2;
    const startY = -h / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const char = spriteData[row][col];
        if (char === '.') continue;
        
        let color = DEFAULT_PALETTE[char];
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
