import { Engine } from "../Engine";
import {
  getMetaBonuses,
  getUpgradeCost,
  META_UPGRADES,
  META_UPGRADE_IDS,
  type MetaUpgradeId,
} from "../MetaUpgrades";
import { audio } from "../audio/AudioManager";
import { MenuRenderer } from "../render/MenuRenderer";
import { GameState } from "./GameState";

export class HubState extends GameState {
  private selectedIndex = 0;
  private message = "";
  private refundArmed = false;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {
    this.engine.data.loadMeta();
    this.selectedIndex = Math.min(this.selectedIndex, META_UPGRADE_IDS.length - 1);
    this.message = "SPACE: PREPARE RUN";
    this.refundArmed = false;
  }

  exit() {}

  update() {
    if (this.engine.input.wasPressed("escape")) {
      this.engine.switchState("title");
      return;
    }
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedIndex = (this.selectedIndex - 1 + META_UPGRADE_IDS.length) % META_UPGRADE_IDS.length;
      this.refundArmed = false;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedIndex = (this.selectedIndex + 1) % META_UPGRADE_IDS.length;
      this.refundArmed = false;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("enter")) {
      this.purchaseSelected();
    }
    if (this.engine.input.wasPressed(" ")) {
      this.engine.switchState("character_select");
      return;
    }
    if (this.engine.input.wasPressed("h")) {
      if (!this.engine.data.meta.hardModeUnlocked) {
        this.message = "HARD MODE: COMPLETE A RUN FIRST";
        audio.playHurt();
      } else {
        const enabled = !this.engine.data.meta.preferredHardMode;
        this.engine.data.setPreferredHardMode(enabled);
        this.message = `HARD MODE ${enabled ? "ENABLED" : "DISABLED"}`;
        audio.playPickup();
      }
    }
    if (this.engine.input.wasPressed("r")) {
      this.refundArmed = true;
      this.message = "PRESS Y TO REFUND ALL UPGRADES";
    } else if (this.refundArmed && this.engine.input.wasPressed("y")) {
      const refunded = this.engine.data.refundMetaUpgrades();
      this.message = refunded > 0 ? `REFUNDED ${refunded} SHARDS` : "NO UPGRADES TO REFUND";
      this.refundArmed = false;
      refunded > 0 ? audio.playPickup() : audio.playHurt();
    }
  }

  private purchaseSelected() {
    const id = META_UPGRADE_IDS[this.selectedIndex] as MetaUpgradeId;
    const result = this.engine.data.purchaseMetaUpgrade(id);
    if (result.success) {
      this.message = `${META_UPGRADES[id].name} UPGRADED`;
      audio.playPickup();
    } else if (result.reason === "max") {
      this.message = "UPGRADE ALREADY MAXED";
      audio.playHurt();
    } else {
      this.message = `NEED ${result.cost} SHARDS`;
      audio.playHurt();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const meta = this.engine.data.meta;
    ctx.fillStyle = "#080D16";
    ctx.fillRect(0, 0, 320, 240);

    ctx.strokeStyle = "rgba(0, 242, 254, 0.08)";
    for (let x = 0; x <= 320; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 240); ctx.stroke();
    }
    for (let y = 0; y <= 240; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(320, y); ctx.stroke();
    }

    MenuRenderer.drawTitle(ctx, "THE DEEP HUB", 160, 22);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`SOUL SHARDS: ${meta.currency}`, 160, 39);

    META_UPGRADE_IDS.forEach((id, index) => {
      const definition = META_UPGRADES[id];
      const level = meta.upgrades[id];
      const cost = getUpgradeCost(id, level);
      const y = 56 + index * 22;
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.88)";
      ctx.fillRect(28, y - 11, 264, 18);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.strokeRect(28, y - 11, 264, 18);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#BDC3C7";
      ctx.font = "bold 8px monospace";
      ctx.fillText(`${selected ? ">" : " "} ${definition.name}`, 34, y);
      ctx.textAlign = "center";
      ctx.fillStyle = "#2ECC71";
      ctx.fillText(`LV ${level}/${definition.maxLevel}`, 212, y);
      ctx.textAlign = "right";
      ctx.fillStyle = cost === null ? "#7F8C8D" : meta.currency >= cost ? "#F1C40F" : "#E74C3C";
      ctx.fillText(cost === null ? "MAX" : `${cost} S`, 284, y);
    });

    const selectedId = META_UPGRADE_IDS[this.selectedIndex];
    const bonuses = getMetaBonuses(meta.upgrades);
    ctx.textAlign = "center";
    ctx.fillStyle = "#8E9EAB";
    ctx.font = "7px monospace";
    ctx.fillText(META_UPGRADES[selectedId].description, 160, 191);
    ctx.fillStyle = meta.hardModeUnlocked
      ? meta.preferredHardMode ? "#E74C3C" : "#BDC3C7"
      : "#4B5563";
    ctx.font = "bold 8px monospace";
    ctx.fillText(
      meta.hardModeUnlocked
        ? `H HARD MODE: ${meta.preferredHardMode ? "ON" : "OFF"}  (+50% SHARDS)`
        : "H HARD MODE: LOCKED (WIN A RUN)",
      160,
      205,
    );
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "6px monospace";
    ctx.fillText(
      `RUN BONUS HP+${bonuses.maxHp} AR+${bonuses.maxArmor} COIN+${bonuses.startingCoins} REROLL ${bonuses.buffRerolls}`,
      160,
      215,
    );
    ctx.fillStyle = this.refundArmed ? "#E74C3C" : "#00F2FE";
    ctx.font = "bold 7px monospace";
    ctx.fillText(this.message, 160, 225);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = "6px monospace";
    ctx.fillText("ENTER BUY | SPACE START | R REFUND | ESC TITLE", 160, 236);
    ctx.textAlign = "left";
  }
}
