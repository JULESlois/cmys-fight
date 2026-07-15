import { t, uiFont } from "../i18n";
import { drawMeter, drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";
import { GameState } from "./GameState";

type MenuOption = "resume" | "save" | "restore" | "settings";
const OPTIONS: MenuOption[] = ["resume", "save", "restore", "settings"];

export class MenuState extends GameState {
  private selection = 0;
  private confirmation: "restore" | null = null;
  private message = "";

  enter() {
    this.selection = 0;
    this.confirmation = null;
    this.message = "";
  }

  exit() {}

  update(_dt?: number) {
    if (this.engine.input.wasUiPressed("cancel")) {
      if (this.confirmation) {
        this.confirmation = null;
        this.message = "";
      } else {
        this.engine.closeMenu();
      }
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.selection = (this.selection - 1 + OPTIONS.length) % OPTIONS.length;
      this.confirmation = null;
      this.message = "";
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selection = (this.selection + 1) % OPTIONS.length;
      this.confirmation = null;
      this.message = "";
    }
    if (this.engine.input.wasUiPressed("confirm")) this.handleSelect();
  }

  private handleSelect() {
    const option = OPTIONS[this.selection];
    const language = this.engine.data.settings.language;
    if (option === "resume") {
      this.engine.closeMenu();
      return;
    }
    if (option === "save") {
      this.engine.saveFromMenu();
      this.message = t(language, "menu.saved");
      return;
    }
    if (option === "settings") {
      this.engine.openSettingsFromMenu();
      return;
    }
    if (this.confirmation !== "restore") {
      this.confirmation = "restore";
      this.message = t(language, "menu.confirmRestore", {
        confirm: this.engine.input.getConfirmPrompt(),
      });
      return;
    }
    this.confirmation = null;
    this.engine.reloadSaveFromMenu();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    ctx.fillStyle = "rgba(3, 7, 13, 0.9)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 32, 24, 256, 190, "purple", true);
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 12, true);
    ctx.textAlign = "left";
    ctx.fillText(t(language, "menu.title"), 47, 47);
    ctx.fillStyle = UI_COLORS.purple;
    ctx.fillRect(47, 53, 226, 1);

    drawPixelPanel(ctx, 43, 62, 131, 112, "neutral");
    drawSectionLabel(ctx, "SYSTEM", 52, 76, 113, language, "cyan");

    OPTIONS.forEach((option, index) => {
      const y = 84 + index * 20;
      const selected = index === this.selection;
      drawPixelButton(ctx, 51, y - 10, 115, 16, selected, option === "restore" ? "red" : "cyan");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 7, selected);
      ctx.fillText(`${selected ? ">" : " "} ${t(language, `menu.${option}` as Parameters<typeof t>[1])}`, 58, y);
    });

    drawPixelPanel(ctx, 181, 62, 96, 112, "cyan");
    drawSectionLabel(ctx, "RUN DATA", 190, 76, 78, language, "yellow");
    const p = this.engine.data.data.player;
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6, true);
    ctx.fillText(t(language, "menu.level", { level: p.level }), 190, 93);
    ctx.fillText(t(language, "menu.health", { hp: p.hp, max: p.maxHp }), 190, 110);
    drawMeter(ctx, 190, 116, 77, 6, p.maxHp > 0 ? p.hp / p.maxHp : 0, UI_COLORS.red, 0);
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.fillText(`COINS ${p.coins}`, 190, 137);
    ctx.fillStyle = UI_COLORS.text;
    ctx.fillText(`WEAPON ${String(p.currentWeaponId ?? "-").toUpperCase()}`, 190, 153);

    if (this.message) {
      ctx.textAlign = "center";
      ctx.fillStyle = this.confirmation ? UI_COLORS.red : UI_COLORS.yellow;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(this.message, 160, 190);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "menu.footer", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 204);
    ctx.textAlign = "left";
  }
}
