import { t, uiFont } from "../i18n";
import { GameState } from "./GameState";

type MenuOption = "resume" | "save" | "restore" | "reset";
const OPTIONS: MenuOption[] = ["resume", "save", "restore", "reset"];

export class MenuState extends GameState {
  private selection = 0;
  private confirmation: "restore" | "reset" | null = null;
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
    if (this.confirmation !== option) {
      this.confirmation = option;
      this.message = t(language, option === "restore" ? "menu.confirmRestore" : "menu.confirmReset", {
        confirm: this.engine.input.getConfirmPrompt(),
      });
      return;
    }
    this.confirmation = null;
    if (option === "restore") this.engine.reloadSaveFromMenu();
    else this.engine.resetGameFromMenu();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    ctx.fillStyle = "rgba(10, 15, 25, 0.78)";
    ctx.fillRect(0, 0, 320, 240);

    const vigGrad = ctx.createRadialGradient(160, 120, 110, 160, 120, 230);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.85)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 320, 240);

    ctx.fillStyle = "rgba(12, 18, 30, 0.96)";
    ctx.strokeStyle = "rgba(142, 68, 173, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(70, 30, 180, 180);
    ctx.strokeRect(70, 30, 180, 180);

    ctx.fillStyle = "#FFD700";
    ctx.font = uiFont(language, 10, true);
    ctx.textAlign = "center";
    ctx.fillText(t(language, "menu.title"), 160, 49);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(85, 57);
    ctx.lineTo(235, 57);
    ctx.stroke();

    OPTIONS.forEach((option, index) => {
      const y = 80 + index * 21;
      const selected = index === this.selection;
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.15)" : "transparent";
      if (selected) ctx.fillRect(86, y - 11, 148, 16);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#8E9EAB";
      ctx.font = uiFont(language, 8, selected);
      ctx.fillText(`${selected ? ">" : " "} ${t(language, `menu.${option}` as Parameters<typeof t>[1])}`, 91, y);
    });

    if (this.message) {
      ctx.textAlign = "center";
      ctx.fillStyle = this.confirmation ? "#E74C3C" : "#F1C40F";
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(this.message, 160, 171);
    }

    const p = this.engine.data.data.player;
    ctx.textAlign = "left";
    ctx.fillStyle = "#BDC3C7";
    ctx.font = uiFont(language, 7);
    ctx.fillText(t(language, "menu.level", { level: p.level }), 86, 186);
    ctx.fillText(t(language, "menu.health", { hp: p.hp, max: p.maxHp }), 86, 198);

    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "menu.footer", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 205);
    ctx.textAlign = "left";
  }
}
