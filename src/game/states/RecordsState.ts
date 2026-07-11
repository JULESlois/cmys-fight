import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from "../AchievementSystem";
import { BUFFS } from "../combat/BuffSystem";
import { ENEMIES } from "../data/enemies";
import { WEAPONS } from "../data/weapons";
import { MenuRenderer } from "../render/MenuRenderer";
import { MonsterModelRenderer } from "../render/MonsterModelRenderer";
import { GameState } from "./GameState";

type RecordsPage = "achievements" | "enemies" | "bosses" | "weapons" | "buffs";
const PAGES: RecordsPage[] = ["achievements", "enemies", "bosses", "weapons", "buffs"];

interface RecordRow {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export class RecordsState extends GameState {
  private pageIndex = 0;
  private selectedIndex = 0;

  enter() {
    this.engine.data.loadMeta();
    this.selectedIndex = 0;
  }

  exit() {}

  update() {
    if (this.engine.input.wasPressed("escape") || this.engine.input.wasPressed("a")) {
      this.engine.switchState("hub");
      return;
    }
    if (this.engine.input.wasPressed("arrowleft") || this.engine.input.wasPressed("q")) {
      this.pageIndex = (this.pageIndex - 1 + PAGES.length) % PAGES.length;
      this.selectedIndex = 0;
    }
    if (this.engine.input.wasPressed("arrowright") || this.engine.input.wasPressed("e")) {
      this.pageIndex = (this.pageIndex + 1) % PAGES.length;
      this.selectedIndex = 0;
    }
    const rows = this.getRows();
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedIndex = (this.selectedIndex - 1 + rows.length) % Math.max(1, rows.length);
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, rows.length);
    }
  }

  private getRows(): RecordRow[] {
    const meta = this.engine.data.meta;
    const page = PAGES[this.pageIndex];
    if (page === "achievements") {
      return ACHIEVEMENT_IDS.map(id => ({
        id,
        name: ACHIEVEMENTS[id].name,
        description: `${ACHIEVEMENTS[id].description} (+${ACHIEVEMENTS[id].reward} Shards)`,
        unlocked: meta.unlockedAchievements.includes(id),
      }));
    }
    if (page === "enemies" || page === "bosses") {
      const bossPage = page === "bosses";
      return Object.values(ENEMIES)
        .filter(enemy => (enemy.role === "boss") === bossPage)
        .map(enemy => ({
          id: enemy.id,
          name: enemy.name.toUpperCase(),
          description: `${enemy.theme.toUpperCase()} // ${enemy.behavior.toUpperCase()}`,
          unlocked: (bossPage ? meta.codex.bosses : meta.codex.enemies).includes(enemy.id),
        }));
    }
    if (page === "weapons") {
      return Object.values(WEAPONS).map(weapon => ({
        id: weapon.id,
        name: weapon.name.toUpperCase(),
        description: `${weapon.series ? `${weapon.series.toUpperCase()} // ` : ""}${weapon.rarity.toUpperCase()} ${weapon.category.toUpperCase()} // DMG ${weapon.damage}`,
        unlocked: meta.codex.weapons.includes(weapon.id),
      }));
    }
    return Object.values(BUFFS).map(buff => ({
      id: buff.id,
      name: buff.name,
      description: `${buff.series ? `${buff.series.toUpperCase()} // ` : ""}${buff.description}`,
      unlocked: meta.codex.buffs.includes(buff.id),
    }));
  }

  draw(ctx: CanvasRenderingContext2D) {
    const rows = this.getRows();
    const page = PAGES[this.pageIndex];
    const selected = rows[this.selectedIndex];
    const pageSize = 8;
    const start = Math.floor(this.selectedIndex / pageSize) * pageSize;

    ctx.fillStyle = "#080D16";
    ctx.fillRect(0, 0, 320, 240);
    MenuRenderer.drawTitle(ctx, "ARCHIVE RECORDS", 160, 22);

    ctx.textAlign = "center";
    ctx.font = "bold 7px monospace";
    PAGES.forEach((entry, index) => {
      ctx.fillStyle = index === this.pageIndex ? "#00F2FE" : "#4B5563";
      ctx.fillText(entry === "buffs" ? "TALENTS" : entry.toUpperCase(), 38 + index * 61, 40);
    });

    rows.slice(start, start + pageSize).forEach((row, localIndex) => {
      const absoluteIndex = start + localIndex;
      const y = 58 + localIndex * 17;
      const active = absoluteIndex === this.selectedIndex;
      ctx.fillStyle = active ? "rgba(0, 242, 254, 0.16)" : "rgba(10, 15, 25, 0.86)";
      ctx.fillRect(34, y - 10, 252, 14);
      ctx.strokeStyle = active ? "#00F2FE" : "#263445";
      ctx.strokeRect(34, y - 10, 252, 14);
      ctx.textAlign = "left";
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = row.unlocked ? "#ECF0F1" : "#4B5563";
      ctx.fillText(`${active ? ">" : " "} ${row.unlocked ? row.name : "???"}`, 40, y);
      ctx.textAlign = "right";
      ctx.fillStyle = row.unlocked ? "#2ECC71" : "#7F8C8D";
      ctx.fillText(row.unlocked ? "FOUND" : "HIDDEN", 280, y);
    });

    const isMonsterPage = page === "enemies" || page === "bosses";
    if (isMonsterPage && selected?.unlocked) {
      const definition = ENEMIES[selected.id];
      ctx.fillStyle = "rgba(9, 16, 26, 0.92)";
      ctx.fillRect(34, 183, 62, 43);
      ctx.strokeStyle = definition.color;
      ctx.strokeRect(34, 183, 62, 43);
      ctx.save();
      ctx.translate(65, 220);
      MonsterModelRenderer.drawPreview(ctx, definition.id, definition.color, definition.role, performance.now() / 1000, definition.role === "boss" ? 1.55 : 1.35);
      ctx.restore();
      ctx.textAlign = "left";
      ctx.fillStyle = "#ECF0F1";
      ctx.font = "bold 7px monospace";
      ctx.fillText(selected.name, 104, 194);
      ctx.fillStyle = "#BDC3C7";
      ctx.font = "6px monospace";
      ctx.fillText(selected.description, 104, 207);
      ctx.fillStyle = definition.color;
      ctx.fillText(`${definition.role.toUpperCase()} // HP ${definition.maxHp}`, 104, 219);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = selected?.unlocked ? "#BDC3C7" : "#4B5563";
      ctx.font = "7px monospace";
      ctx.fillText(selected?.unlocked ? selected.description : "HIDDEN", 160, 205);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "6px monospace";
    ctx.fillText(`${page === "buffs" ? "TALENTS" : page.toUpperCase()} ${rows.filter(row => row.unlocked).length}/${rows.length}`, 160, 229);
    ctx.fillText("Q/E PAGE   W/S SELECT   ESC", 160, 238);
    ctx.textAlign = "left";
  }
}
