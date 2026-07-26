/**
 * The story tree.
 *
 * One node type covers both narrative surfaces the game needs:
 *   - chapter cutscenes, which are nodes with no choices and an explicit `next`
 *   - NPC dialogue, which are nodes whose choices branch and set flags
 *
 * Keeping them in one graph means an ending can be gated on a choice made in a
 * chapter-2 side conversation without any cross-system plumbing.
 *
 * Text is stored as i18n key suffixes, never as literals: a node's line `i` is
 * looked up as `story.${nodeId}.line${i}` and a choice as
 * `story.${nodeId}.choice${j}`.
 */

/** Narrative flags. Closed union so a typo cannot silently create a dead flag. */
export type StoryFlag =
  | "met_archivist"
  | "spared_the_rooster"
  | "took_the_relic"
  | "refused_the_relic"
  | "learned_true_name"
  | "promised_return"
  | "broke_the_seal"
  | "sided_with_director"
  | "sided_with_overseer"
  | "found_old_memory"
  | "freed_the_vat_horse";

export const STORY_FLAGS: StoryFlag[] = [
  "met_archivist",
  "spared_the_rooster",
  "took_the_relic",
  "refused_the_relic",
  "learned_true_name",
  "promised_return",
  "broke_the_seal",
  "sided_with_director",
  "sided_with_overseer",
  "found_old_memory",
  "freed_the_vat_horse",
];

export type StoryNodeKind = "cutscene" | "dialogue";

export interface StoryChoice {
  /** Index into the node's `choice${j}` i18n keys. */
  index: number;
  /** Node to jump to. `null` closes the conversation. */
  next: string | null;
  /** Flags written when this choice is taken. */
  sets?: StoryFlag[];
  /** Choice is hidden unless every flag here is already set. */
  requires?: StoryFlag[];
  /** Choice is hidden if any flag here is set. */
  blockedBy?: StoryFlag[];
}

export interface StoryNode {
  id: string;
  kind: StoryNodeKind;
  /** i18n key suffix for the speaker label; omitted for narration. */
  speaker?: string;
  /** Number of `line${i}` keys this node owns. */
  lineCount: number;
  /** Cutscene-only: node that follows automatically. */
  next?: string | null;
  /** Dialogue-only. */
  choices?: StoryChoice[];
  /** Flags written just by reaching the node. */
  sets?: StoryFlag[];
  /** Chapter this node belongs to, for the cutscene trigger table. */
  chapter?: number;
}

export const STORY_NODES: Record<string, StoryNode> = {
  // ---- chapter cutscenes ----------------------------------------------
  ch1_open: {
    id: "ch1_open", kind: "cutscene", chapter: 1, lineCount: 3,
    speaker: "narrator", next: null,
  },
  ch2_open: {
    id: "ch2_open", kind: "cutscene", chapter: 2, lineCount: 3,
    speaker: "narrator", next: null,
  },
  ch3_open: {
    id: "ch3_open", kind: "cutscene", chapter: 3, lineCount: 3,
    speaker: "narrator", next: null,
  },
  ch4_open: {
    id: "ch4_open", kind: "cutscene", chapter: 4, lineCount: 4,
    speaker: "narrator", next: null,
  },

  // ---- the Archivist: the spine of the branching line -------------------
  archivist_intro: {
    id: "archivist_intro", kind: "dialogue", speaker: "archivist", lineCount: 2,
    sets: ["met_archivist"],
    choices: [
      { index: 0, next: "archivist_relic" },
      { index: 1, next: "archivist_deflect" },
    ],
  },
  archivist_deflect: {
    id: "archivist_deflect", kind: "dialogue", speaker: "archivist", lineCount: 1,
    choices: [
      { index: 0, next: "archivist_relic" },
      { index: 1, next: null },
    ],
  },
  archivist_relic: {
    id: "archivist_relic", kind: "dialogue", speaker: "archivist", lineCount: 2,
    choices: [
      { index: 0, next: "archivist_took", sets: ["took_the_relic"] },
      { index: 1, next: "archivist_refused", sets: ["refused_the_relic"] },
    ],
  },
  archivist_took: {
    id: "archivist_took", kind: "dialogue", speaker: "archivist", lineCount: 2,
    choices: [
      { index: 0, next: "archivist_name", sets: ["promised_return"] },
      { index: 1, next: null },
    ],
  },
  archivist_refused: {
    id: "archivist_refused", kind: "dialogue", speaker: "archivist", lineCount: 2,
    choices: [
      { index: 0, next: "archivist_name" },
      { index: 1, next: null },
    ],
  },
  archivist_name: {
    id: "archivist_name", kind: "dialogue", speaker: "archivist", lineCount: 2,
    sets: ["learned_true_name"],
    choices: [{ index: 0, next: null }],
  },

  // ---- faction split, chapter 3 ----------------------------------------
  faction_choice: {
    id: "faction_choice", kind: "dialogue", speaker: "signal", lineCount: 2,
    choices: [
      { index: 0, next: "faction_director", sets: ["sided_with_director"], blockedBy: ["sided_with_overseer"] },
      { index: 1, next: "faction_overseer", sets: ["sided_with_overseer"], blockedBy: ["sided_with_director"] },
      { index: 2, next: null, requires: ["learned_true_name"] },
    ],
  },
  faction_director: {
    id: "faction_director", kind: "dialogue", speaker: "director", lineCount: 2,
    choices: [{ index: 0, next: null }],
  },
  faction_overseer: {
    id: "faction_overseer", kind: "dialogue", speaker: "overseer", lineCount: 2,
    choices: [{ index: 0, next: null }],
  },

  // ---- optional encounters --------------------------------------------
  rooster_mercy: {
    id: "rooster_mercy", kind: "dialogue", speaker: "rooster", lineCount: 1,
    choices: [
      { index: 0, next: null, sets: ["spared_the_rooster"] },
      { index: 1, next: null },
    ],
  },
  old_memory: {
    id: "old_memory", kind: "dialogue", speaker: "memory", lineCount: 2,
    sets: ["found_old_memory"],
    choices: [{ index: 0, next: null }],
  },
  vat_horse_cage: {
    id: "vat_horse_cage", kind: "dialogue", speaker: "narrator", lineCount: 1,
    choices: [
      { index: 0, next: null, sets: ["freed_the_vat_horse"] },
      { index: 1, next: null },
    ],
  },
  final_seal: {
    id: "final_seal", kind: "dialogue", speaker: "narrator", lineCount: 2,
    choices: [
      { index: 0, next: null, sets: ["broke_the_seal"] },
      { index: 1, next: null },
    ],
  },
};

export const STORY_NODE_IDS = Object.keys(STORY_NODES);

/** Cutscene played when a chapter begins. */
export const CHAPTER_CUTSCENES: Record<number, string> = {
  1: "ch1_open",
  2: "ch2_open",
  3: "ch3_open",
  4: "ch4_open",
};

export type EndingId = "ending_archive" | "ending_ascent" | "ending_mercy" | "ending_true" | "ending_default";

export interface EndingDefinition {
  id: EndingId;
  /** All of these must be set. */
  requires: StoryFlag[];
  /** None of these may be set. */
  excludes?: StoryFlag[];
  /** Higher wins when several endings qualify. */
  priority: number;
}

/**
 * Endings are resolved by flag combination, highest priority first, so the
 * "true" ending can demand a strict superset of another ending's conditions
 * without the ordering being implicit in the array.
 */
export const ENDINGS: EndingDefinition[] = [
  {
    id: "ending_true",
    requires: ["learned_true_name", "found_old_memory", "broke_the_seal", "refused_the_relic"],
    priority: 40,
  },
  {
    id: "ending_mercy",
    requires: ["spared_the_rooster", "freed_the_vat_horse"],
    excludes: ["broke_the_seal"],
    priority: 30,
  },
  {
    id: "ending_ascent",
    requires: ["took_the_relic", "broke_the_seal"],
    priority: 20,
  },
  {
    id: "ending_archive",
    requires: ["met_archivist"],
    priority: 10,
  },
  { id: "ending_default", requires: [], priority: 0 },
];

export const ENDING_IDS: EndingId[] = ENDINGS.map(ending => ending.id);

export function isEndingId(value: unknown): value is EndingId {
  return typeof value === "string" && (ENDING_IDS as string[]).includes(value);
}

export function isStoryFlag(value: unknown): value is StoryFlag {
  return typeof value === "string" && (STORY_FLAGS as string[]).includes(value);
}

export function isStoryNodeId(value: unknown): value is string {
  return typeof value === "string" && value in STORY_NODES;
}

/**
 * Structural validation. Exercised by the smoke test so a malformed branch is
 * caught at build time rather than when a player walks into the NPC.
 */
export function findStoryTreeProblems(): string[] {
  const problems: string[] = [];
  for (const node of Object.values(STORY_NODES)) {
    if (node.lineCount < 1) problems.push(`${node.id}: lineCount must be >= 1`);

    if (node.kind === "cutscene") {
      if (node.choices) problems.push(`${node.id}: cutscene must not define choices`);
      if (node.next !== null && node.next !== undefined && !isStoryNodeId(node.next)) {
        problems.push(`${node.id}: next "${node.next}" does not exist`);
      }
      continue;
    }

    if (!node.choices || node.choices.length === 0) {
      problems.push(`${node.id}: dialogue node needs at least one choice`);
      continue;
    }
    const seen = new Set<number>();
    for (const choice of node.choices) {
      if (seen.has(choice.index)) problems.push(`${node.id}: duplicate choice index ${choice.index}`);
      seen.add(choice.index);
      if (choice.next !== null && !isStoryNodeId(choice.next)) {
        problems.push(`${node.id}: choice ${choice.index} points at missing node "${choice.next}"`);
      }
      for (const flag of [...(choice.sets ?? []), ...(choice.requires ?? []), ...(choice.blockedBy ?? [])]) {
        if (!isStoryFlag(flag)) problems.push(`${node.id}: choice ${choice.index} uses unknown flag "${flag}"`);
      }
    }
  }

  for (const [chapter, nodeId] of Object.entries(CHAPTER_CUTSCENES)) {
    if (!isStoryNodeId(nodeId)) problems.push(`chapter ${chapter}: cutscene "${nodeId}" does not exist`);
    else if (STORY_NODES[nodeId].kind !== "cutscene") problems.push(`chapter ${chapter}: "${nodeId}" is not a cutscene`);
  }

  // A reachable node is one some choice or cutscene points at, plus the roots
  // the game triggers directly.
  const roots = new Set<string>([
    ...Object.values(CHAPTER_CUTSCENES),
    "archivist_intro", "faction_choice", "rooster_mercy", "old_memory",
    "vat_horse_cage", "final_seal",
  ]);
  const reachable = new Set<string>(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...reachable]) {
      const node = STORY_NODES[id];
      if (!node) continue;
      const targets = node.kind === "cutscene"
        ? [node.next]
        : (node.choices ?? []).map(choice => choice.next);
      for (const target of targets) {
        if (target && !reachable.has(target)) { reachable.add(target); grew = true; }
      }
    }
  }
  for (const id of STORY_NODE_IDS) {
    if (!reachable.has(id)) problems.push(`${id}: unreachable from any root`);
  }

  return problems;
}
