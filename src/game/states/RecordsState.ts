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
import { drawBadge, drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";
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

  enter(params?: { backState?: "title" | "hub" }) {
    this.engine.data.loadMeta();
    this.selectedIndex = 0;
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
      drawPixelPanel(ctx, x, y, width, 139, "neutral", true);
      drawSectionLabel(ctx, title, x + 8, y + 15, width - 16, language, "cyan");
      rows.forEach(([label, value], index) => {
        const rowY = y + 34 + index * 13;
        ctx.textAlign = "left";
        ctx.fillStyle = UI_COLORS.muted;
        ctx.font = uiFont(language, 6);
        ctx.fillText(label, x + 8, rowY);
        ctx.textAlign = "right";
        ctx.fillStyle = UI_COLORS.white;
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

    ctx.fillStyle = UI_COLORS.backdrop;
    ctx.fillRect(0, 0, 320, 240);
    MenuRenderer.drawTitle(ctx, t(language, "records.title"), 160, 22, language, 20);

    ctx.font = uiFont(language, language === "zh-CN" ? 5 : 6, true);
    PAGES.forEach((entry, index) => {
      const x = 11 + index * 50;
      drawPixelButton(ctx, x, 31, 47, 16, index === this.pageIndex, index === this.pageIndex ? "cyan" : "neutral");
      ctx.textAlign = "center";
      ctx.fillStyle = index === this.pageIndex ? UI_COLORS.white : UI_COLORS.muted;
      ctx.fillText(this.pageLabel(entry), x + 23.5, 42);
    });

    if (page === "overview") {
      this.drawOverview(ctx);
    } else {
      drawPixelPanel(ctx, 14, 53, 151, 172, "neutral", true);
      drawSectionLabel(ctx, `${this.pageLabel(page)} ${rows.filter(row => row.unlocked).length}/${rows.length}`, 23, 68, 133, language, "cyan");
      rows.slice(start, start + pageSize).forEach((row, localIndex) => {
        const absoluteIndex = start + localIndex;
        const y = 79 + localIndex * 17;
        const active = absoluteIndex === this.selectedIndex;
        drawPixelButton(ctx, 22, y - 10, 135, 14, active, "cyan");
        ctx.textAlign = "left";
        ctx.font = uiFont(language, 6, true);
        ctx.fillStyle = row.unlocked ? (active ? UI_COLORS.white : UI_COLORS.text) : UI_COLORS.muted;
        const label = row.unlocked ? row.name : "???";
        ctx.fillText(`${active ? ">" : " "} ${label.slice(0, language === "zh-CN" ? 13 : 18)}`, 28, y);
        ctx.fillStyle = row.unlocked ? UI_COLORS.green : UI_COLORS.edge;
        ctx.fillRect(148, y - 6, 4, 4);
      });

      drawPixelPanel(ctx, 172, 53, 134, 172, selected?.unlocked ? "cyan" : "neutral", true);
      const isMonsterPage = page === "enemies" || page === "bosses";
      const isWeaponPage = page === "weapons";
      if (isMonsterPage && selected?.unlocked) {
        const definition = ENEMIES[selected.id];
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(183, 66, 112, 82);
        ctx.strokeStyle = definition.color;
        ctx.strokeRect(183, 66, 112, 82);
        ctx.save();
        ctx.translate(239, 139);
        MonsterModelRenderer.drawPreview(ctx, definition.id, definition.color, definition.role, performance.now() / 1000, definition.role === "boss" ? 1.75 : 1.55);
        ctx.restore();
        ctx.textAlign = "left";
        ctx.fillStyle = UI_COLORS.white;
        ctx.font = uiFont(language, 8, true);
        ctx.fillText(selected.name, 183, 161);
        ctx.fillStyle = UI_COLORS.text;
        ctx.font = uiFont(language, 6);
        wrapLocalized(selected.description, language === "zh-CN" ? 18 : 24).slice(0, 2)
          .forEach((line, index) => ctx.fillText(line, 183, 174 + index * 8));
        ctx.fillStyle = definition.color;
        ctx.font = uiFont(language, 6, true);
        ctx.fillText(`${definition.role.toUpperCase()} · HP ${definition.maxHp}`, 183, 197);
        drawBadge(ctx, definition.behavior.toUpperCase(), 183, 204, 112, language, definition.role === "boss" ? "red" : "cyan");
      } else if (isWeaponPage && selected?.unlocked) {
        const weapon = WEAPONS[selected.id];
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(183, 66, 112, 72);
        ctx.strokeStyle = weapon.color;
        ctx.strokeRect(183, 66, 112, 72);
        const bob = Math.round(Math.sin(performance.now() / 360) * 1);
        if (weapon.dualWield) {
          ctx.save();
          ctx.globalAlpha = 0.72;
          SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 232, 95 + bob, 2);
          ctx.restore();
          SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 246, 112 - bob, 2);
        } else {
          SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 239, 104 + bob, 2);
        }
        ctx.textAlign = "left";
        ctx.fillStyle = UI_COLORS.white;
        ctx.font = uiFont(language, 8, true);
        wrapLocalized(selected.name, language === "zh-CN" ? 16 : 21).slice(0, 2)
          .forEach((line, index) => ctx.fillText(line, 183, 153 + index * 9));
        ctx.fillStyle = weapon.color;
        ctx.font = uiFont(language, 6, true);
        ctx.fillText(`${rarityLabel(weapon.rarity, language)} · D${weapon.damage} · R${weapon.fireRate}`, 183, 177);
        ctx.fillStyle = UI_COLORS.text;
        ctx.font = uiFont(language, 6);
        wrapLocalized(getWeaponMechanic(weapon.id, weapon.mechanic, language), language === "zh-CN" ? 34 : 42)
          .slice(0, 3)
          .forEach((text, index) => ctx.fillText(text, 183, 190 + index * 8));
      } else {
        ctx.textAlign = "center";
        ctx.fillStyle = selected?.unlocked ? UI_COLORS.text : UI_COLORS.muted;
        ctx.font = uiFont(language, 8, true);
        ctx.fillText(selected?.unlocked ? selected.name : "???", 239, 86);
        ctx.font = uiFont(language, 7);
        const detail = selected?.unlocked ? selected.description : t(language, "common.hidden");
        wrapLocalized(detail, language === "zh-CN" ? 20 : 27).slice(0, 6)
          .forEach((text, index) => ctx.fillText(text, 239, 110 + index * 11));
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, page === "overview" ? "records.overviewFooter" : "records.footer", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 236);
    ctx.textAlign = "left";
  }
}
