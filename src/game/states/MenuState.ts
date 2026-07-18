import { t, uiFont } from "../i18n";
import { drawPixelPanel, UI_COLORS } from "../render/PixelUi";
import { GameState } from "./GameState";

type MenuOption = "resume" | "save" | "settings" | "quit";
const OPTIONS: MenuOption[] = ["resume", "save", "settings", "quit"];

export class MenuState extends GameState {
  private selection = 0;
  private message = "";

  enter() {
    this.selection = 0;
    this.message = "";
  }

  exit() {}

  update(_dt?: number) {
    if (this.engine.input.wasUiPressed("cancel")) {
      this.engine.closeMenu();
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.selection = (this.selection - 1 + OPTIONS.length) % OPTIONS.length;
      this.message = "";
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selection = (this.selection + 1) % OPTIONS.length;
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
    if (option === "quit") {
      this.engine.returnToHubFromRun();
      return;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    ctx.fillStyle = "rgba(3, 7, 13, 0.9)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 32, 24, 256, 190, "purple", true);
    
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 12, true);
    ctx.textAlign = "center";
    ctx.fillText(t(language, "menu.title"), 160, 47);
    
    ctx.fillStyle = UI_COLORS.purple;
    ctx.fillRect(47, 53, 226, 1);

    OPTIONS.forEach((option, index) => {
      const y = 90 + index * 26;
      const selected = index === this.selection;
      
      ctx.textAlign = "center";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, selected ? 8 : 7, selected);
      ctx.fillText(t(language, `menu.${option}` as Parameters<typeof t>[1]), 160, y);
    });

    if (this.message) {
      ctx.textAlign = "center";
      ctx.fillStyle = UI_COLORS.yellow;
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
