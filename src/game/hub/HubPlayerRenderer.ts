import {
  CELESTIA_PLAYER_PALETTE,
  ESPER_ZERO_PLAYER_PALETTE,
  KANAMI_PLAYER_PALETTE,
  MICHELE_PLAYER_PALETTE,
  NANALLY_PLAYER_PALETTE,
  PLAYER_PALETTE,
} from "../data/sprites";
import { usesDetailedCharacterArt } from "../data/characters";
import type { Player } from "../entities/Player";
import { SpriteRenderer } from "../render/SpriteRenderer";

export class HubPlayerRenderer {
  public static draw(ctx: CanvasRenderingContext2D, player: Player, reducedFlashing: boolean): void {
    const detailed = {
      michele: { prefix: "player_michele_side", palette: MICHELE_PLAYER_PALETTE },
      kanami: { prefix: "player_kanami_side", palette: KANAMI_PLAYER_PALETTE },
      celestia: { prefix: "player_celestia_side", palette: CELESTIA_PLAYER_PALETTE },
      esper_zero: { prefix: "player_esper_zero_side", palette: ESPER_ZERO_PLAYER_PALETTE },
      nanally: { prefix: "player_nanally_side", palette: NANALLY_PLAYER_PALETTE },
    }[player.characterId];
    const hasDetailedArt = usesDetailedCharacterArt(player.characterId);
    const prefix = detailed?.prefix ?? "player_main_side";
    let sprite = `${prefix}_idle`;
    if (player.animState === "walk") sprite = `${prefix}_walk_${hasDetailedArt ? player.animFrame % 4 : player.animFrame % 2}`;
    else if (hasDetailedArt && player.animFrame % 2 === 1) sprite = `${prefix}_idle_1`;

    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.fillRect(-9, 7, 18, 4);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(-6, 11, 12, 2);
    SpriteRenderer.drawPixelSprite(ctx, sprite, 0, -8, hasDetailedArt ? 1 : 2, {
      hitFlash: player.hitFlash > 0 && !reducedFlashing,
      flipX: player.facing === "left",
      paletteOverride: detailed?.palette ?? PLAYER_PALETTE,
      outlineColor: "#09101A",
    });
    ctx.restore();
  }
}
