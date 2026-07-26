/**
 * Runtime traversal of the story tree.
 *
 * The system owns a flag set and a cursor. It is deliberately pure with respect
 * to rendering and input: a caller advances it and reads back what should be on
 * screen, which keeps the cutscene state and the NPC dialogue overlay sharing
 * one implementation.
 *
 * Flags live in meta progress, so a choice made in one run is still true in the
 * next. That is what makes the ending conditions meaningful across a roguelite
 * structure.
 */

import {
  CHAPTER_CUTSCENES,
  ENDINGS,
  STORY_NODES,
  isEndingId,
  isStoryFlag,
  isStoryNodeId,
  type EndingId,
  type StoryChoice,
  type StoryFlag,
  type StoryNode,
} from "./StoryTree";

export interface StoryProgress {
  /** Flags the player has accumulated. */
  flags: StoryFlag[];
  /** Nodes already seen, so cutscenes do not replay. */
  seenNodes: string[];
  /** Endings the player has reached, for the completion readout. Optional —
   * and omitted entirely while empty — so older saves and existing
   * `{ flags, seenNodes }` literals keep their exact shape. */
  endingsSeen?: EndingId[];
}

export function createDefaultStoryProgress(): StoryProgress {
  return { flags: [], seenNodes: [] };
}

export function normalizeStoryProgress(value: unknown): StoryProgress {
  const fallback = createDefaultStoryProgress();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<StoryProgress>;
  const endingsSeen = Array.isArray(raw.endingsSeen)
    ? [...new Set(raw.endingsSeen.filter(isEndingId))]
    : [];
  return {
    flags: Array.isArray(raw.flags) ? [...new Set(raw.flags.filter(isStoryFlag))] : [],
    seenNodes: Array.isArray(raw.seenNodes)
      ? [...new Set(raw.seenNodes.filter(isStoryNodeId))]
      : [],
    ...(endingsSeen.length > 0 ? { endingsSeen } : {}),
  };
}

/** A choice as the UI should present it: already filtered and re-indexed. */
export interface VisibleChoice {
  /** Original authored index, used to build the i18n key. */
  index: number;
  /** Position in the filtered list, used for cursor movement. */
  slot: number;
}

export interface StoryView {
  nodeId: string;
  kind: "cutscene" | "dialogue";
  speaker?: string;
  /** i18n key suffixes for the body lines, in order. */
  lineKeys: string[];
  /** Empty for cutscenes. */
  choices: VisibleChoice[];
  /** True when advancing ends the conversation. */
  terminal: boolean;
}

export class StorySystem {
  private flags: Set<StoryFlag>;
  private seen: Set<string>;
  private endings: Set<EndingId>;
  private cursor: string | null = null;

  constructor(progress: StoryProgress = createDefaultStoryProgress()) {
    this.flags = new Set(progress.flags);
    this.seen = new Set(progress.seenNodes);
    this.endings = new Set(progress.endingsSeen ?? []);
  }

  public toProgress(): StoryProgress {
    return {
      flags: [...this.flags],
      seenNodes: [...this.seen],
      ...(this.endings.size > 0 ? { endingsSeen: [...this.endings] } : {}),
    };
  }

  public hasFlag(flag: StoryFlag): boolean {
    return this.flags.has(flag);
  }

  public getFlags(): StoryFlag[] {
    return [...this.flags];
  }

  public hasSeen(nodeId: string): boolean {
    return this.seen.has(nodeId);
  }

  /**
   * Opens a node. Returns null when the id is unknown, so a caller can treat a
   * missing conversation as "nothing happens" rather than crashing a run.
   */
  public begin(nodeId: string): StoryView | null {
    if (!isStoryNodeId(nodeId)) return null;
    this.cursor = nodeId;
    this.applyNodeEntry(STORY_NODES[nodeId]);
    return this.view();
  }

  /** Chapter cutscene, or null when this chapter has none or it was seen. */
  public beginChapterCutscene(chapter: number): StoryView | null {
    const nodeId = CHAPTER_CUTSCENES[chapter];
    if (!nodeId || this.seen.has(nodeId)) return null;
    return this.begin(nodeId);
  }

  public getCursor(): string | null {
    return this.cursor;
  }

  public view(): StoryView | null {
    if (!this.cursor) return null;
    const node = STORY_NODES[this.cursor];
    if (!node) return null;

    const choices = this.visibleChoices(node);
    return {
      nodeId: node.id,
      kind: node.kind,
      speaker: node.speaker,
      lineKeys: Array.from({ length: node.lineCount }, (_, index) => `story.${node.id}.line${index}`),
      choices,
      terminal: node.kind === "cutscene"
        ? !node.next
        : choices.every(choice => this.choiceAt(node, choice.index)?.next == null),
    };
  }

  /**
   * Advances a cutscene. Dialogue nodes require `choose` instead; calling this
   * on one is a no-op so a shared "confirm" button cannot skip a decision.
   */
  public advance(): StoryView | null {
    if (!this.cursor) return null;
    const node = STORY_NODES[this.cursor];
    if (!node || node.kind !== "cutscene") return this.view();
    if (!node.next) { this.cursor = null; return null; }
    this.cursor = node.next;
    this.applyNodeEntry(STORY_NODES[node.next]);
    return this.view();
  }

  /**
   * Takes a choice by its position in the *visible* list, which is what the
   * cursor actually moves over. Returns the next view, or null when the
   * conversation closes.
   */
  public choose(slot: number): StoryView | null {
    if (!this.cursor) return null;
    const node = STORY_NODES[this.cursor];
    if (!node || node.kind !== "dialogue") return this.view();

    const visible = this.visibleChoices(node);
    const picked = visible[slot];
    if (!picked) return this.view();

    const choice = this.choiceAt(node, picked.index);
    if (!choice) return this.view();

    for (const flag of choice.sets ?? []) this.flags.add(flag);

    if (!choice.next) { this.cursor = null; return null; }
    this.cursor = choice.next;
    this.applyNodeEntry(STORY_NODES[choice.next]);
    return this.view();
  }

  public close(): void {
    this.cursor = null;
  }

  /**
   * Resolves the ending. Highest priority qualifying entry wins; the default
   * entry has no requirements so this always returns something.
   */
  public resolveEnding(): EndingId {
    const qualified = ENDINGS
      .filter(ending =>
        ending.requires.every(flag => this.flags.has(flag))
        && !(ending.excludes ?? []).some(flag => this.flags.has(flag)))
      .sort((a, b) => b.priority - a.priority);
    return qualified[0]?.id ?? "ending_default";
  }

  /** Marks an ending as reached so it persists into meta progress. */
  public recordEnding(id: EndingId): void {
    this.endings.add(id);
  }

  public getEndingsSeen(): EndingId[] {
    return [...this.endings];
  }

  public hasSeenEnding(id: EndingId): boolean {
    return this.endings.has(id);
  }

  /** Fraction of all flags collected, for a completion readout. */
  public getNarrativeCompletion(totalFlags: number): number {
    if (totalFlags <= 0) return 0;
    return Math.min(1, this.flags.size / totalFlags);
  }

  private applyNodeEntry(node: StoryNode | undefined): void {
    if (!node) return;
    this.seen.add(node.id);
    for (const flag of node.sets ?? []) this.flags.add(flag);
  }

  private choiceAt(node: StoryNode, index: number): StoryChoice | undefined {
    return (node.choices ?? []).find(choice => choice.index === index);
  }

  private visibleChoices(node: StoryNode): VisibleChoice[] {
    if (node.kind !== "dialogue") return [];
    const visible: VisibleChoice[] = [];
    for (const choice of node.choices ?? []) {
      if ((choice.requires ?? []).some(flag => !this.flags.has(flag))) continue;
      if ((choice.blockedBy ?? []).some(flag => this.flags.has(flag))) continue;
      visible.push({ index: choice.index, slot: visible.length });
    }
    return visible;
  }
}
