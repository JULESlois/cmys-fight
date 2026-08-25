/**
 * StoryOverlay — the rendering and input surface for the story data layer.
 *
 * DungeonState (and any other caller) talks to a static API:
 *
 *   maybeTrigger(event, meta)  maps a game event onto the story tree and, when
 *                              an unseen node (or an ending) applies, activates
 *                              the overlay and returns true
 *   isActive()                 whether the overlay currently owns the screen
 *   update(dt, input)          typewriter + advance / choose / skip handling
 *   draw(ctx, language)        letterboxed bottom-third dialogue panel in the
 *                              PixelUi house style (320x240)
 *   consumeCompleted()         true exactly once after a sequence finishes so
 *                              the caller knows when to persist meta progress
 *
 * All narrative state flows through StorySystem: entering nodes marks them
 * seen, choices write flags, endings are recorded via recordEnding, and after
 * every mutation `meta.story` is replaced with `system.toProgress()` so the
 * persisted shape always comes out of the normalizing data layer.
 *
 * Trigger mapping (event -> story roots, unseen nodes only):
 *   chapter_start  chapter cutscene `ch{N}_open` (N = clamped routeDepth 1..4)
 *                  + chapter dialogue root: 1 -> archivist_intro,
 *                    3 -> faction_choice, 4 -> final_seal
 *                  + world-node encounter: cooling_canal -> vat_horse_cage,
 *                    deep_prison -> rooster_mercy, deep_archive -> final_seal
 *   run_defeat     old_memory (the first fall is where the recording plays)
 *   run_victory    always: the ending resolved from flags plays and is
 *                  recorded into meta.story.endingsSeen
 */

import type { Input } from "../Input";
import type { MetaProgress } from "../MetaProgress";
import { t, uiFont, type Language } from "../i18n";
import { DEFAULT_KEY_BINDINGS, formatBinding } from "../Settings";
import { UI_COLORS, drawBadge, drawPixelButton, drawPixelPanel } from "../render/PixelUi";
import { cursorPulse, easeOutCubic } from "../ui/UiMotion";
import { CHAPTER_CUTSCENES, type EndingId } from "./StoryTree";
import { StorySystem, normalizeStoryProgress, type StoryView } from "./StorySystem";
import { hasStoryText, storyText } from "./StoryText";

export interface StoryEvent {
  kind: "chapter_start" | "run_victory" | "run_defeat";
  worldNodeId?: string;
  routeDepth?: number;
}

type Segment =
  | { kind: "node"; nodeId: string }
  | { kind: "ending" };

/** Dialogue roots that open alongside a chapter's cutscene. */
const CHAPTER_DIALOGUE: Record<number, string> = {
  1: "archivist_intro",
  3: "faction_choice",
  4: "final_seal",
};

/** Optional encounters keyed by the world node the chapter starts in. */
const WORLD_NODE_ENCOUNTERS: Record<string, string> = {
  cooling_canal: "vat_horse_cage",
  deep_prison: "rooster_mercy",
  deep_archive: "final_seal",
};

/** Node that plays on the player's first defeat. */
const DEFEAT_NODE = "old_memory";

export const STORY_TYPEWRITER_CPS = 45;

/** Large enough to out-reveal any authored text instantly. */
const REVEAL_COMPLETE = 1e9;

/**
 * Typewriter cost multiplier per character. Punctuation gets a beat so the
 * line reads with a natural cadence rather than a constant tick.
 */
export function storyCharWeight(ch: string): number {
  return /[，。！？、；：.,!?…]/.test(ch) ? 1.6 : 1;
}

const tKey = (key: string) => key as Parameters<typeof t>[1];

export class StoryOverlay {
  private static system: StorySystem | null = null;
  private static meta: MetaProgress | null = null;
  private static segment: Segment | null = null;
  private static queue: Segment[] = [];
  private static view: StoryView | null = null;
  private static endingId: EndingId | null = null;
  private static endingLineKeys: string[] = [];
  private static selection = 0;
  private static revealTimer = 0;
  private static completed = false;
  private static language: Language = "en";
  private static continuePrompt = formatBinding(DEFAULT_KEY_BINDINGS.interact);
  private static skipPrompt = formatBinding(DEFAULT_KEY_BINDINGS.pause);

  // ------------------------------------------------------------ contract ----

  public static maybeTrigger(event: StoryEvent, meta: MetaProgress): boolean {
    if (this.isActive()) return false;
    const system = new StorySystem(normalizeStoryProgress(meta.story));
    const segments = this.planSegments(event, system);
    if (segments.length === 0) return false;

    const completedBefore = this.completed;
    this.system = system;
    this.meta = meta;
    this.queue = segments;
    this.startSegment(this.queue.shift()!);
    if (!this.isActive()) {
      // Every planned node failed to open; leave no trace of the attempt.
      this.completed = completedBefore;
      this.system = null;
      this.meta = null;
      this.queue = [];
      return false;
    }
    return true;
  }

  public static isActive(): boolean {
    return this.segment !== null;
  }

  public static update(dt: number, input: Input): void {
    if (!this.isActive()) return;
    // Captured here because draw() has no input handle: the hint always shows
    // the key the player is actually bound to, matching the other UI surfaces.
    this.continuePrompt = input.getPrompt("interact");
    this.skipPrompt = input.getPrompt("pause");
    this.revealTimer += Math.max(0, dt);

    const total = this.totalChars(this.language);
    const done = this.revealedChars(total) >= total;

    if (input.wasUiPressed("confirm")) {
      // One press does one thing: completing the typewriter never also
      // advances the node or commits a choice.
      if (!done) {
        this.revealTimer = REVEAL_COMPLETE;
        return;
      }
      this.commitOrAdvance();
      return;
    }

    if (input.wasActionPressed("pause") || input.wasUiPressed("cancel")) {
      // Skipping is only for non-choice content; a dialogue node keeps the
      // decision on screen no matter which button is mashed.
      if (this.isSkippable()) this.skipSegment();
      return;
    }

    if (done && this.view && this.view.kind === "dialogue" && this.view.choices.length > 0) {
      const count = this.view.choices.length;
      if (input.wasUiPressed("up")) this.selection = (this.selection + count - 1) % count;
      if (input.wasUiPressed("down")) this.selection = (this.selection + 1) % count;
    }
  }

  public static draw(ctx: CanvasRenderingContext2D, language: Language): void {
    if (!this.isActive()) return;
    this.language = language;
    const view = this.view;
    const isEnding = this.segment?.kind === "ending";

    ctx.save();
    // Cinematic letterbox: dimmed play field, hard bars top and bottom, the
    // dialogue panel living in the bottom third.
    ctx.fillStyle = "rgba(4, 7, 12, 0.55)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = UI_COLORS.backdrop;
    ctx.fillRect(0, 0, 320, 24);
    ctx.fillRect(0, 160, 320, 80);

    if (isEnding && this.endingId) {
      ctx.textAlign = "center";
      ctx.font = uiFont(language, 12, true);
      ctx.fillStyle = UI_COLORS.cyanBright;
      ctx.fillText(t(language, tKey(`ending.${this.endingId}`)), 160, 96);
      ctx.fillStyle = UI_COLORS.edge;
      ctx.fillRect(120, 104, 80, 1);
    }

    drawPixelPanel(ctx, 8, 164, 304, 68, isEnding ? "purple" : "cyan", true);

    const speakerLabel = !isEnding && view?.speaker
      ? t(language, tKey(`story.speaker.${view.speaker}`))
      : "";
    if (speakerLabel.length > 0) {
      ctx.font = uiFont(language, 6, true);
      const width = Math.min(140, Math.ceil(ctx.measureText(speakerLabel).width) + 10);
      // Nameplate slides in from the left over the first ~0.28s of the node.
      const slide = easeOutCubic(Math.min(1, this.revealTimer / 0.28));
      drawBadge(ctx, speakerLabel, Math.round(12 - 88 * (1 - slide)), 158, width, language, "cyan");
    }

    ctx.font = uiFont(language, 7);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.text;
    const rows = this.wrapRows(ctx, this.bodyTexts(language), 288);
    const total = rows.reduce((sum, row) => sum + row.length, 0);
    let remaining = this.revealedChars(total);
    const done = remaining >= total;
    let y = 178;
    for (const row of rows) {
      const visible = remaining >= row.length ? row : row.slice(0, Math.max(0, remaining));
      remaining -= row.length;
      ctx.fillText(visible, 16, y);
      y += 9;
      if (remaining <= 0 || y > 214) break;
    }

    if (done && view && view.kind === "dialogue" && view.choices.length > 0) {
      let cy = y + 2;
      const overflow = cy + view.choices.length * 12 - 227;
      if (overflow > 0) cy -= overflow;
      const selection = Math.min(this.selection, view.choices.length - 1);
      for (const choice of view.choices) {
        const selected = choice.slot === selection;
        drawPixelButton(ctx, 16, cy, 288, 11, selected, "cyan", selected ? cursorPulse(this.revealTimer * 2) : 0);
        ctx.font = uiFont(language, 7, selected);
        ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
        ctx.textAlign = "left";
        ctx.fillText(storyText(language, `${view.nodeId}.choice${choice.index}`), 22, cy + 8);
        cy += 12;
      }
    }

    ctx.font = uiFont(language, 6);
    if (done) {
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.cyan;
      ctx.fillText(t(language, "story.continue", { key: this.continuePrompt }), 306, 229);
    }
    if (this.isSkippable()) {
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.muted;
      ctx.fillText(t(language, "story.skip", { key: this.skipPrompt }), 14, 229);
    }
    ctx.restore();
  }

  public static consumeCompleted(): boolean {
    const done = this.completed;
    this.completed = false;
    return done;
  }

  // ------------------------------------------------------------- extras ----

  /** Test/diagnostic hook: the node currently on screen, if any. */
  public static getActiveNodeId(): string | null {
    return this.view?.nodeId ?? null;
  }

  /** Test/diagnostic hook: the ending currently playing, if any. */
  public static getActiveEndingId(): EndingId | null {
    return this.segment?.kind === "ending" ? this.endingId : null;
  }

  /** Clears all overlay state. Used by tests and full-game resets. */
  public static reset(): void {
    this.system = null;
    this.meta = null;
    this.segment = null;
    this.queue = [];
    this.view = null;
    this.endingId = null;
    this.endingLineKeys = [];
    this.selection = 0;
    this.revealTimer = 0;
    this.completed = false;
    this.language = "en";
    this.continuePrompt = formatBinding(DEFAULT_KEY_BINDINGS.interact);
    this.skipPrompt = formatBinding(DEFAULT_KEY_BINDINGS.pause);
  }

  // ------------------------------------------------------------ internals ----

  private static planSegments(event: StoryEvent, system: StorySystem): Segment[] {
    if (event.kind === "run_victory") {
      // Every victory closes with an ending; which one is a pure function of
      // the accumulated flags, resolved when the segment starts.
      return [{ kind: "ending" }];
    }

    const wanted: string[] = [];
    if (event.kind === "chapter_start") {
      const chapter = event.routeDepth
        ? Math.max(1, Math.min(4, Math.floor(event.routeDepth)))
        : null;
      if (chapter !== null) {
        const cutscene = CHAPTER_CUTSCENES[chapter];
        if (cutscene) wanted.push(cutscene);
        const dialogue = CHAPTER_DIALOGUE[chapter];
        if (dialogue) wanted.push(dialogue);
      }
      if (event.worldNodeId) {
        const encounter = WORLD_NODE_ENCOUNTERS[event.worldNodeId];
        if (encounter) wanted.push(encounter);
      }
    } else {
      wanted.push(DEFEAT_NODE);
    }

    return wanted
      .filter((nodeId, index) => wanted.indexOf(nodeId) === index && !system.hasSeen(nodeId))
      .map(nodeId => ({ kind: "node", nodeId }));
  }

  private static startSegment(segment: Segment): void {
    if (!this.system) return;
    this.selection = 0;
    this.revealTimer = 0;

    if (segment.kind === "ending") {
      this.segment = segment;
      this.view = null;
      this.endingId = this.system.resolveEnding();
      this.system.recordEnding(this.endingId);
      this.syncProgress();
      this.endingLineKeys = [];
      for (let index = 0; hasStoryText("en", `${this.endingId}.line${index}`); index++) {
        this.endingLineKeys.push(`${this.endingId}.line${index}`);
      }
      return;
    }

    const view = this.system.begin(segment.nodeId);
    this.syncProgress();
    if (!view) {
      this.finishSegment();
      return;
    }
    this.segment = segment;
    this.view = view;
  }

  private static finishSegment(): void {
    const next = this.queue.shift();
    if (next) {
      this.startSegment(next);
      return;
    }
    this.segment = null;
    this.view = null;
    this.endingId = null;
    this.endingLineKeys = [];
    this.system = null;
    this.meta = null;
    this.completed = true;
  }

  private static commitOrAdvance(): void {
    if (this.segment?.kind === "ending") {
      this.finishSegment();
      return;
    }
    const view = this.view;
    if (!view || !this.system) {
      this.finishSegment();
      return;
    }

    if (view.kind === "cutscene") {
      const next = this.system.advance();
      this.syncProgress();
      if (!next) {
        this.finishSegment();
        return;
      }
      this.view = next;
      this.selection = 0;
      this.revealTimer = 0;
      return;
    }

    // Dialogue: commit the highlighted choice. StorySystem.choose is the only
    // path that can move past a decision, so the no-shared-confirm guard the
    // system enforces stays intact through the overlay.
    if (view.choices.length === 0) {
      this.system.close();
      this.syncProgress();
      this.finishSegment();
      return;
    }
    const slot = Math.min(this.selection, view.choices.length - 1);
    const next = this.system.choose(slot);
    this.syncProgress();
    if (this.system.getCursor() === null) {
      this.finishSegment();
      return;
    }
    if (next && next.nodeId !== view.nodeId) {
      this.view = next;
      this.selection = 0;
      this.revealTimer = 0;
    }
  }

  private static isSkippable(): boolean {
    if (this.segment?.kind === "ending") return true;
    return this.view?.kind === "cutscene";
  }

  private static skipSegment(): void {
    if (!this.system || !this.segment) return;
    if (this.segment.kind === "ending") {
      this.finishSegment();
      return;
    }
    let guard = 0;
    while (this.view && this.view.kind === "cutscene" && guard++ < 64) {
      const next = this.system.advance();
      this.syncProgress();
      if (!next) {
        this.finishSegment();
        return;
      }
      this.view = next;
      if (next.kind !== "cutscene") {
        // The chain ran into a decision: stop skipping and present it.
        this.selection = 0;
        this.revealTimer = 0;
        return;
      }
    }
  }

  /** Persists narrative state through the normalizing data layer only. */
  private static syncProgress(): void {
    if (this.meta && this.system) this.meta.story = this.system.toProgress();
  }

  private static bodyTexts(language: Language): string[] {
    if (this.segment?.kind === "ending") {
      return this.endingLineKeys.map(key => storyText(language, key));
    }
    if (this.view) {
      // StorySystem emits `story.${nodeId}.line${i}` keys; the StoryText
      // table is keyed without the prefix.
      return this.view.lineKeys.map(key => storyText(language, key.replace(/^story\./, "")));
    }
    return [];
  }

  private static totalChars(language: Language): number {
    return this.bodyTexts(language).reduce((sum, line) => sum + line.length, 0);
  }

  /**
   * Typewriter reveal with punctuation pauses: full stops and commas cost ~1.6x
   * a letter, so sentence ends land with a beat instead of clipping along.
   * Returns the number of characters fully revealed under the current budget.
   */
  private static revealedChars(total: number): number {
    const weights = this.charCumulativeWeights(this.language);
    const budget = this.revealTimer * STORY_TYPEWRITER_CPS;
    let count = 0;
    while (count < total && weights[count] <= budget) count++;
    return count;
  }

  /** Cumulative per-character typewriter cost; length equals the char count. */
  private static charCumulativeWeights(language: Language): number[] {
    let acc = 0;
    const weights: number[] = [];
    for (const line of this.bodyTexts(language)) {
      for (const ch of line) {
        acc += storyCharWeight(ch);
        weights.push(acc);
      }
    }
    return weights;
  }

  /**
   * Splits authored lines into panel-width rows. Rows are contiguous
   * substrings of the source lines, so their summed length always matches
   * `totalChars` and the typewriter can slice across them.
   */
  private static wrapRows(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number): string[] {
    const rows: string[] = [];
    for (const line of lines) {
      if (line.length === 0) {
        rows.push("");
        continue;
      }
      let start = 0;
      while (start < line.length) {
        let end = start + 1;
        let lastSpace = -1;
        while (end <= line.length) {
          if (ctx.measureText(line.slice(start, end)).width > maxWidth && end - start > 1) {
            end -= 1;
            break;
          }
          if (line[end - 1] === " ") lastSpace = end;
          end += 1;
        }
        if (end > line.length) end = line.length;
        else if (lastSpace > start && end < line.length) end = lastSpace;
        rows.push(line.slice(start, end));
        start = end;
      }
    }
    return rows;
  }
}
