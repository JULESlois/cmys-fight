import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from "../AchievementSystem";
import { BUFFS } from "../combat/BuffSystem";
import { ENEMIES } from "../data/enemies";
import { WEAPONS } from "../data/weapons";
import {
  categoryLabel,
  getAchievementText,
  getBuffText,
  getWeaponMechanic,
  projectileLabel,
  rarityLabel,
  seriesLabel,
  t,
  uiFont,
  wrapLocalized,
} from "../i18n";
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
    if (this.engine.input.wasUiPressed("cancel")) {
      this.engine.switchState("hub");
      return;
    }
    if (this.engine.input.wasUiPressed("left")) {
      this.pageIndex = (this.pageIndex - 1 + PAGES.length) % PAGES.length;
      this.selectedIndex = 0;
    }
    if (this.engine.input.wasUiPressed("right")) {
      this.pageIndex = (this.pageIndex + 1) % PAGES.length;
      this.selectedIndex = 0;
    }
    const rows = this.getRows();
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + rows.length) % Math.max(1, rows.length);
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, rows.length);
    }
  }

  private pageLabel(page: RecordsPage): string {
    const language = this.engine.data.settings.language;
    return t(language, page === "buffs" ? "records.talents" : `records.${page}` as Parameters<typeof t>[1]);
  }

  private getRows(): RecordRow[] {
    const meta = this.engine.data.meta;
    const language = this.engine.data.settings.language;
    const page = PAGES[this.pageIndex];
    if (page === "achievements") {
      return ACHIEVEMENT_IDS.map(id => {
        const localized = getAchievementText(id, ACHIEVEMENTS[id], language);
        return {
          id,
          name: localized.name,
          description: `${localized.description} ${t(language, "records.reward", { reward: ACHIEVEMENTS[id].reward })}`,
          unlocked: meta.unlockedAchievements.includes(id),
        };
      });
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
        description: `${weapon.series ? `${seriesLabel(weapon.series, language)} // ` : ""}${rarityLabel(weapon.rarity, language)} ${categoryLabel(weapon.category, language)} // ${projectileLabel(weapon.projectileStyle, language)} // ${getWeaponMechanic(weapon.id, weapon.mechanic, language)}`,
        unlocked: meta.codex.weapons.includes(weapon.id),
      }));
    }
    return Object.values(BUFFS).map(buff => {
      const localized = getBuffText(buff.id, buff, language);
      return {
        id: buff.id,
        name: localized.name,
        description: `${buff.series ? `${seriesLabel(buff.series, language)} // ` : ""}${localized.description}`,
        unlocked: meta.codex.buffs.includes(buff.id),
      };
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    const rows = this.getRows();
    const page = PAGES[this.pageIndex];
    const selected = rows[this.selectedIndex];
    const pageSize = 8;
    const start = Math.floor(this.selectedIndex / pageSize) * pageSize;

    ctx.fillStyle = "#080D16";
    ctx.fillRect(0, 0, 320, 240);
    MenuRenderer.drawTitle(ctx, t(language, "records.title"), 160, 22, language);

    ctx.textAlign = "center";
    ctx.font = uiFont(language, language === "zh-CN" ? 6 : 7, true);
    PAGES.forEach((entry, index) => {
      ctx.fillStyle = index === this.pageIndex ? "#00F2FE" : "#4B5563";
      ctx.fillText(this.pageLabel(entry), 38 + index * 61, 40);
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
      ctx.font = uiFont(language, 8, true);
      ctx.fillStyle = row.unlocked ? "#ECF0F1" : "#4B5563";
      ctx.fillText(`${active ? ">" : " "} ${row.unlocked ? row.name : "???"}`, 40, y);
      ctx.textAlign = "right";
      ctx.fillStyle = row.unlocked ? "#2ECC71" : "#7F8C8D";
      ctx.fillText(t(language, row.unlocked ? "common.found" : "common.hidden"), 280, y);
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
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(selected.name, 104, 194);
      ctx.fillStyle = "#BDC3C7";
      ctx.font = uiFont(language, 6);
      ctx.fillText(selected.description, 104, 207);
      ctx.fillStyle = definition.color;
      ctx.fillText(`${definition.role.toUpperCase()} // HP ${definition.maxHp}`, 104, 219);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = selected?.unlocked ? "#BDC3C7" : "#4B5563";
      ctx.font = uiFont(language, 7);
      const detail = selected?.unlocked ? selected.description : t(language, "common.hidden");
      wrapLocalized(detail, language === "zh-CN" ? 38 : 48).slice(0, 2)
        .forEach((text, index) => ctx.fillText(text, 160, 200 + index * 10));
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = uiFont(language, 6);
    ctx.fillText(`${this.pageLabel(page)} ${rows.filter(row => row.unlocked).length}/${rows.length}`, 160, 229);
    ctx.fillText(t(language, "records.footer", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 238);
    ctx.textAlign = "left";
  }
}
