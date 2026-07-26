import { GameState } from "./GameState";
import { MenuBackdropRenderer } from "../render/MenuBackdropRenderer";
import { uiFont } from "../i18n";
import { loreText, TITLE_TAGLINE } from "../narrative/StoryLore";

/**
 * SplashState — 启动闪屏。
 * 正常启动路径:Splash → Hub(README「Main flow」)。
 * 展示标题与故事副标题约 1.8 秒,任意确认/开火/暂停输入可跳过。
 */
export class SplashState extends GameState {
  private timer = 0;
  private leaving = false;

  enter() {
    this.timer = 0;
    this.leaving = false;
  }

  exit() {}

  private proceed(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.engine.input.suppressUntilReleased();
    this.engine.switchState("hub", { spawnAnchor: "rebirth_spring", fromSplash: true });
  }

  update(dt: number) {
    this.timer += dt;
    const skipRequested =
      this.engine.input.wasUiPressed("confirm") ||
      this.engine.input.wasActionPressed("fire") ||
      this.engine.input.wasActionPressed("pause");
    if (this.timer >= 1.8 || (this.timer >= 0.25 && skipRequested)) {
      this.proceed();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const time = this.engine.data.settings.dynamicBackground && !this.engine.isPerformanceDegraded()
      ? Date.now() / 1000
      : 0;
    MenuBackdropRenderer.draw(ctx, "title", time, this.engine.isPerformanceDegraded());

    const fade = Math.min(1, this.timer / 0.6);
    const language = this.engine.data.settings.language;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textAlign = "center";

    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#1a1c2c";
    ctx.fillText("CMYS FIGHT", 158, 102);
    ctx.fillText("CMYS FIGHT", 162, 102);
    ctx.fillStyle = "#00F2FE";
    ctx.fillText("CMYS FIGHT", 160, 102);

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#BDC3C7";
    ctx.fillText("DEEP ARCHIVE", 160, 118);

    ctx.font = uiFont(language, 7);
    ctx.fillStyle = "rgba(189, 195, 199, 0.6)";
    ctx.fillText(loreText(TITLE_TAGLINE, language), 160, 138);

    // 底部进入提示,后半段淡入
    if (this.timer > 0.9) {
      const pulse = 0.35 + 0.25 * Math.sin(this.timer * 4);
      ctx.globalAlpha = fade * pulse;
      ctx.font = uiFont(language, 6);
      ctx.fillStyle = "#00F2FE";
      ctx.fillText(
        language === "zh-CN" ? "正在接入深层档案…" : "CONNECTING TO THE DEEP ARCHIVE...",
        160,
        212,
      );
    }
    ctx.restore();
    ctx.textAlign = "left";
  }
}
