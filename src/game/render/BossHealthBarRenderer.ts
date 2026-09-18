import { uiFont, type Language } from "../i18n";
import { UI_COLORS } from "./PixelUi";

export interface BossVitals {
  enemyId: string;
  name: string;
  hp: number;
  maxHp: number;
  phase: number;
}

export interface BossHealthBarDrawOptions {
  language: Language;
  nowMs: number;
  reducedFlashing: boolean;
}

/**
 * Top-center boss vitals between the status panel and the minimap
 * reservation. The three phase ticks mirror DungeonState's boss phase
 * thresholds (66% / 33%) so a tick crossing reads as "phase is about to
 * change"; the fill brightens for a beat whenever the value drops so damage
 * stays legible even with floating numbers off screen.
 */
export class BossHealthBarRenderer {
  private static lastBossId = "";
  private static lastHp = -1;
  private static lastPhase = -1;
  private static damagePulseStartedAt = 0;
  private static phaseFlashStartedAt = 0;

  // 88..232 x 11..17 sits fully above the minimap reservation (y>=18) and to
  // the right of the status panel (ends x=85): 144px of clear top-center.
  private static readonly BAR = { x: 88, y: 11, width: 144, height: 6 } as const;
  private static readonly NAME_Y = 8;

  public static draw(
    ctx: CanvasRenderingContext2D,
    boss: BossVitals,
    options: BossHealthBarDrawOptions,
  ): void {
    const { language, nowMs, reducedFlashing } = options;
    if (boss.maxHp <= 0) return;

    if (boss.enemyId !== BossHealthBarRenderer.lastBossId) {
      BossHealthBarRenderer.lastBossId = boss.enemyId;
      BossHealthBarRenderer.lastHp = boss.hp;
      BossHealthBarRenderer.lastPhase = boss.phase;
      BossHealthBarRenderer.damagePulseStartedAt = 0;
      BossHealthBarRenderer.phaseFlashStartedAt = 0;
    }
    if (boss.hp !== BossHealthBarRenderer.lastHp) {
      BossHealthBarRenderer.lastHp = boss.hp;
      BossHealthBarRenderer.damagePulseStartedAt = nowMs;
    }
    if (boss.phase !== BossHealthBarRenderer.lastPhase) {
      BossHealthBarRenderer.lastPhase = boss.phase;
      BossHealthBarRenderer.phaseFlashStartedAt = nowMs;
    }

    const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    const bar = BossHealthBarRenderer.BAR;

    // Phase transition flash on the name: yellow for a beat, then back to the
    // steady red. Reduced flashing keeps the name red the whole fight.
    const phaseFlash = reducedFlashing
      ? 0
      : Math.max(0, 1 - (nowMs - BossHealthBarRenderer.phaseFlashStartedAt) / 400);
    const nameColor = phaseFlash > 0 ? UI_COLORS.yellow : UI_COLORS.red;

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = nameColor;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(boss.name.toUpperCase(), 160, BossHealthBarRenderer.NAME_Y);

    // Trough, fill, and a one-pixel top highlight — same visual language as
    // drawMeter, inlined here so the phase ticks can layer on top.
    ctx.fillStyle = UI_COLORS.dark;
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
    const fillWidth = Math.round((bar.width - 2) * ratio);
    ctx.fillStyle = UI_COLORS.red;
    ctx.fillRect(bar.x + 1, bar.y + 1, fillWidth, bar.height - 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(bar.x + 1, bar.y + 1, fillWidth, 1);

    if (BossHealthBarRenderer.damagePulseStartedAt > 0 && !reducedFlashing) {
      const pulse = Math.max(0, 1 - (nowMs - BossHealthBarRenderer.damagePulseStartedAt) / 300);
      if (pulse > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(pulse * 0.5).toFixed(2)})`;
        ctx.fillRect(bar.x + 1, bar.y + 1, fillWidth, bar.height - 2);
      }
    }

    // Phase ticks at 2/3 and 1/3: the fill drains right-to-left across them.
    for (const fraction of [2 / 3, 1 / 3]) {
      const tickX = bar.x + Math.round(bar.width * fraction);
      ctx.fillStyle = UI_COLORS.dark;
      ctx.fillRect(tickX, bar.y, 1, bar.height);
      ctx.fillStyle = phaseFlash > 0 ? UI_COLORS.yellow : UI_COLORS.edge;
      ctx.fillRect(tickX, bar.y - 1, 1, 1);
      ctx.fillRect(tickX, bar.y + bar.height, 1, 1);
    }

    ctx.strokeStyle = phaseFlash > 0 ? UI_COLORS.yellow : UI_COLORS.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(bar.x - 0.5, bar.y - 0.5, bar.width + 1, bar.height + 1);
    ctx.restore();
  }

  public static reset(): void {
    BossHealthBarRenderer.lastBossId = "";
    BossHealthBarRenderer.lastHp = -1;
    BossHealthBarRenderer.lastPhase = -1;
    BossHealthBarRenderer.damagePulseStartedAt = 0;
    BossHealthBarRenderer.phaseFlashStartedAt = 0;
  }
}
