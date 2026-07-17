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
import { createRunProgressFromGlobalStage, getStageLabel } from "../RunProgress";
import { MenuRenderer } from "../render/MenuRenderer";
import { MonsterModelRenderer } from "../render/MonsterModelRenderer";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { GameState } from "./GameState";

type RecordsPage = "overview" | "achievements" | "enemies" | "bosses" | "weapons" | "buffs";
const PAGES: RecordsPage[] = ["overview", "achievements", "enemies", "bosses", "weapons", "buffs"];

interface RecordRow {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export class RecordsState extends GameState {
  private pageIndex = 0;
  private selectedIndex = 0;
  private backState: "title" | "hub" = "title";

  enter(params?: { backState?: "title" | "hub"; initialPage?: RecordsPage }) {
    this.engine.data.loadMeta();
    this.selectedIndex = 0;
    if (params?.initialPage && PAGES.includes(params.initialPage)) this.pageIndex = PAGES.indexOf(params.initialPage);
    this.backState = params?.backState === "hub" ? "hub" : "title";
  }

  exit() {}

  update() {
    if (this.engine.input.wasUiPressed("cancel")) {
      this.engine.switchState(this.backState);
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
    if (rows.length === 0) return;
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + rows.length) % rows.length;
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % rows.length;
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
    if (page === "overview") return [];
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

  private drawOverview(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const meta = this.engine.data.meta;
    const bestTime = meta.bestVictoryTime === null
      ? "--:--"
      : `${Math.floor(meta.bestVictoryTime / 60)}:${Math.floor(meta.bestVictoryTime % 60).toString().padStart(2, "0")}`;
    const highestStage = getStageLabel(createRunProgressFromGlobalStage(meta.highestStage));
    const regularEnemies = Object.values(ENEMIES).filter(enemy => enemy.role !== "boss");
    const bosses = Object.values(ENEMIES).filter(enemy => enemy.role === "boss");

    const leftRows: Array<[string, string]> = [
      [t(language, "records.shards"), String(meta.currency)],
      [t(language, "records.highestStage"), highestStage],
      [t(language, "records.victories"), String(meta.victories)],
      [t(language, "records.bestTime"), bestTime],
      [t(language, "records.totalRuns"), String(meta.totalRuns)],
      [t(language, "records.kills"), String(meta.lifetimeKills)],
      [t(language, "records.eliteKills"), String(meta.lifetimeEliteKills)],
      [t(language, "records.bossKills"), String(meta.lifetimeBossKills)],
    ];
    const rightRows: Array<[string, string]> = [
      [t(language, "records.achievements"), `${meta.unlockedAchievements.length}/${ACHIEVEMENT_IDS.length}`],
      [t(language, "records.enemies"), `${meta.codex.enemies.length}/${regularEnemies.length}`],
      [t(language, "records.bosses"), `${meta.codex.bosses.length}/${bosses.length}`],
      [t(language, "records.weapons"), `${meta.codex.weapons.length}/${Object.keys(WEAPONS).length}`],
      [t(language, "records.talents"), `${meta.codex.buffs.length}/${Object.keys(BUFFS).length}`],
    ];

    const drawPanel = (x: number, y: number, width: number, title: string, rows: Array<[string, string]>) => {
      ctx.fillStyle = "rgba(10, 15, 25, 0.88)";
      ctx.fillRect(x, y, width, 139);
      ctx.strokeStyle = "#263445";
      ctx.strokeRect(x, y, width, 139);
      ctx.textAlign = "center";
      ctx.fillStyle = "#00F2FE";
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(title, x + width / 2, y + 15);
      rows.forEach(([label, value], index) => {
        const rowY = y + 34 + index * 13;
        ctx.textAlign = "left";
        ctx.fillStyle = "#8E9EAB";
        ctx.font = uiFont(language, 6);
        ctx.fillText(label, x + 8, rowY);
        ctx.textAlign = "right";
        ctx.fillStyle = "#ECF0F1";
        ctx.font = uiFont(language, 7, true);
        ctx.fillText(value, x + width - 8, rowY);
      });
    };

    drawPanel(18, 55, 136, t(language, "records.runStats"), leftRows);
    drawPanel(166, 55, 136, t(language, "records.collection"), rightRows);
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
    ctx.font = uiFont(language, language === "zh-CN" ? 5 : 6, true);
    PAGES.forEach((entry, index) => {
      ctx.fillStyle = index === this.pageIndex ? "#00F2FE" : "#4B5563";
      ctx.fillText(this.pageLabel(entry), 28 + index * 53, 40);
    });

    if (page === "overview") {
      this.drawOverview(ctx);
    } else {
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
      const isWeaponPage = page === "weapons";
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
      } else if (isWeaponPage && selected?.unlocked) {
        const weapon = WEAPONS[selected.id];
        ctx.fillStyle = "rgba(9, 16, 26, 0.92)";
        ctx.fillRect(34, 183, 62, 43);
        ctx.strokeStyle = weapon.color;
        ctx.strokeRect(34, 183, 62, 43);
        const bob = Math.round(Math.sin(performance.now() / 360) * 1);
        if (weapon.dualWield) {
          ctx.save();
          ctx.globalAlpha = 0.72;
          SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 61, 202 + bob, 1);
          ctx.restore();
          SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 69, 210 - bob, 1);
        } else {
          SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 65, 205 + bob, 1);
        }
        ctx.textAlign = "left";
        ctx.fillStyle = "#ECF0F1";
        ctx.font = uiFont(language, 7, true);
        ctx.fillText(selected.name, 104, 193);
        ctx.fillStyle = weapon.color;
        ctx.font = uiFont(language, 6, true);
        ctx.fillText(
          `${rarityLabel(weapon.rarity, language)} // DMG ${weapon.damage} // RATE ${weapon.fireRate}`,
          104,
          204,
        );
        ctx.fillStyle = "#BDC3C7";
        ctx.font = uiFont(language, 5);
        wrapLocalized(getWeaponMechanic(weapon.id, weapon.mechanic, language), language === "zh-CN" ? 34 : 42)
          .slice(0, 2)
          .forEach((text, index) => ctx.fillText(text, 104, 214 + index * 8));
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
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, page === "overview" ? "records.overviewFooter" : "records.footer", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 238);
    ctx.textAlign = "left";
  }
}
