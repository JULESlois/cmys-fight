import assert from "node:assert/strict";
import {
  CHAPTER_CUTSCENES,
  ENDINGS,
  STORY_FLAGS,
  STORY_NODES,
  STORY_NODE_IDS,
  findStoryTreeProblems,
  isStoryFlag,
  isStoryNodeId,
} from "../src/game/story/StoryTree";
import {
  StorySystem,
  createDefaultStoryProgress,
  normalizeStoryProgress,
} from "../src/game/story/StorySystem";
import { getStoryTextKeys, hasStoryText, storyText } from "../src/game/story/StoryText";
import { t } from "../src/game/i18n";

// ----------------------------------------------------------- structure ----

assert.deepEqual(findStoryTreeProblems(), [], "the story tree must be structurally sound");
assert.ok(STORY_NODE_IDS.length > 0);
assert.equal(isStoryFlag("met_archivist"), true);
assert.equal(isStoryFlag("not_a_flag"), false);
assert.equal(isStoryNodeId("archivist_intro"), true);
assert.equal(isStoryNodeId("nope"), false);

// Every chapter has a cutscene, and cutscenes never ask for a decision.
for (const chapter of [1, 2, 3, 4]) {
  const nodeId = CHAPTER_CUTSCENES[chapter];
  assert.ok(nodeId, `chapter ${chapter} has a cutscene`);
  assert.equal(STORY_NODES[nodeId].kind, "cutscene");
  assert.equal(STORY_NODES[nodeId].chapter, chapter);
}

// ---------------------------------------------------------------- text ----

// Every authored line and choice must have text in both languages, or a
// cutscene renders a raw key at the player.
for (const node of Object.values(STORY_NODES)) {
  for (let index = 0; index < node.lineCount; index++) {
    const key = `${node.id}.line${index}`;
    assert.ok(hasStoryText("en", key), `missing EN text for ${key}`);
    assert.ok(hasStoryText("zh-CN", key), `missing ZH text for ${key}`);
  }
  for (const choice of node.choices ?? []) {
    const key = `${node.id}.choice${choice.index}`;
    assert.ok(hasStoryText("en", key), `missing EN text for ${key}`);
    assert.ok(hasStoryText("zh-CN", key), `missing ZH text for ${key}`);
  }
}

// The two tables must not drift apart in either direction.
assert.deepEqual(
  getStoryTextKeys("en").sort(),
  getStoryTextKeys("zh-CN").sort(),
  "EN and ZH story tables must cover the same keys",
);

// Unknown keys degrade to the key itself rather than throwing mid-cutscene.
assert.equal(storyText("en", "does.not.exist"), "does.not.exist");
assert.notEqual(storyText("zh-CN", "ch1_open.line0"), storyText("en", "ch1_open.line0"));

// Speaker labels and prompts live in the UI table and must exist in both.
for (const speaker of ["narrator", "archivist", "signal", "director", "overseer", "rooster", "memory"]) {
  const key = `story.speaker.${speaker}` as Parameters<typeof t>[1];
  assert.equal(typeof t("en", key), "string");
  assert.equal(typeof t("zh-CN", key), "string");
}
assert.match(t("en", "story.continue", { key: "K" }), /K/);
assert.match(t("zh-CN", "story.continue", { key: "K" }), /K/);

// Every ending has a localized name.
for (const ending of ENDINGS) {
  const key = `ending.${ending.id}` as Parameters<typeof t>[1];
  assert.ok(t("en", key).length > 0, `${ending.id} needs an EN name`);
  assert.ok(t("zh-CN", key).length > 0, `${ending.id} needs a ZH name`);
}

// ------------------------------------------------------------ traversal ----

// A cutscene runs to its end and then closes.
const cutscene = new StorySystem();
const opened = cutscene.beginChapterCutscene(1);
assert.ok(opened);
assert.equal(opened!.kind, "cutscene");
assert.equal(opened!.lineKeys.length, STORY_NODES.ch1_open.lineCount);
assert.equal(opened!.choices.length, 0);
assert.equal(opened!.terminal, true, "ch1 ends the cutscene chain");
assert.equal(cutscene.advance(), null);
assert.equal(cutscene.getCursor(), null);

// Seen cutscenes do not replay.
assert.equal(cutscene.hasSeen("ch1_open"), true);
assert.equal(cutscene.beginChapterCutscene(1), null, "a seen cutscene does not replay");
assert.ok(cutscene.beginChapterCutscene(2), "an unseen chapter still plays");

// Entering a node applies its flags.
const spine = new StorySystem();
spine.begin("archivist_intro");
assert.equal(spine.hasFlag("met_archivist"), true, "entry flags apply on arrival");

// Choices branch and write their flags.
const view = spine.view()!;
assert.equal(view.kind, "dialogue");
assert.equal(view.choices.length, 2);
const relic = spine.choose(0);
assert.equal(relic!.nodeId, "archivist_relic");
spine.choose(1); // refuse the relic
assert.equal(spine.hasFlag("refused_the_relic"), true);
assert.equal(spine.hasFlag("took_the_relic"), false);

// `advance` must not skip a decision.
const guarded = new StorySystem();
guarded.begin("archivist_intro");
const before = guarded.getCursor();
guarded.advance();
assert.equal(guarded.getCursor(), before, "advance cannot skip a dialogue choice");

// An out-of-range choice is ignored rather than closing the conversation.
assert.equal(guarded.choose(99)!.nodeId, "archivist_intro");
assert.equal(guarded.getCursor(), "archivist_intro");

// Unknown nodes are survivable.
assert.equal(new StorySystem().begin("no_such_node"), null);

// ------------------------------------------------- conditional choices ----

// `requires` hides a choice until its flag is held.
const gated = new StorySystem();
gated.begin("faction_choice");
assert.equal(gated.view()!.choices.length, 2, "the true-name option is hidden without the flag");

const informed = new StorySystem({ flags: ["learned_true_name"], seenNodes: [] });
informed.begin("faction_choice");
assert.equal(informed.view()!.choices.length, 3, "learning the name reveals a third option");
// Slots are re-indexed over the visible list, so slot 2 is the revealed one.
assert.equal(informed.view()!.choices[2].index, 2);

// `blockedBy` removes the opposing faction once one is chosen.
const committed = new StorySystem({ flags: ["sided_with_director"], seenNodes: [] });
committed.begin("faction_choice");
const remaining = committed.view()!.choices.map(choice => choice.index);
assert.ok(!remaining.includes(1), "siding with one faction removes the other");

// -------------------------------------------------------------- endings ----

// Highest priority wins when several qualify.
const trueRun = new StorySystem({
  flags: ["learned_true_name", "found_old_memory", "broke_the_seal", "refused_the_relic", "met_archivist"],
  seenNodes: [],
});
assert.equal(trueRun.resolveEnding(), "ending_true", "the strictest ending outranks the ones it subsumes");

// `excludes` actually disqualifies.
const mercy = new StorySystem({ flags: ["spared_the_rooster", "freed_the_vat_horse"], seenNodes: [] });
assert.equal(mercy.resolveEnding(), "ending_mercy");
const brokenMercy = new StorySystem({
  flags: ["spared_the_rooster", "freed_the_vat_horse", "broke_the_seal"],
  seenNodes: [],
});
assert.notEqual(brokenMercy.resolveEnding(), "ending_mercy", "breaking the seal disqualifies the mercy route");

assert.equal(new StorySystem().resolveEnding(), "ending_default", "an empty run still resolves");
assert.equal(
  new StorySystem({ flags: ["met_archivist"], seenNodes: [] }).resolveEnding(),
  "ending_archive",
);

// Every ending except the default must be reachable by some flag combination
// that the tree can actually produce.
const producible = new Set(STORY_FLAGS);
for (const ending of ENDINGS) {
  for (const flag of ending.requires) {
    assert.ok(producible.has(flag), `${ending.id} requires "${flag}" which no node sets`);
  }
}
// And each required flag must be written by at least one node or choice.
const written = new Set<string>();
for (const node of Object.values(STORY_NODES)) {
  for (const flag of node.sets ?? []) written.add(flag);
  for (const choice of node.choices ?? []) for (const flag of choice.sets ?? []) written.add(flag);
}
for (const ending of ENDINGS) {
  for (const flag of ending.requires) {
    assert.ok(written.has(flag), `${ending.id} requires "${flag}" which is never set by the tree`);
  }
}

// ----------------------------------------------------------- persistence ----

const saved = trueRun.toProgress();
assert.equal(saved.flags.length, 5);
const restored = new StorySystem(saved);
assert.equal(restored.resolveEnding(), "ending_true", "progress round-trips");

assert.deepEqual(normalizeStoryProgress(undefined), createDefaultStoryProgress());
assert.deepEqual(normalizeStoryProgress("garbage"), createDefaultStoryProgress());
const cleaned = normalizeStoryProgress({
  flags: ["met_archivist", "bogus_flag", "met_archivist"],
  seenNodes: ["ch1_open", "not_a_node"],
});
assert.deepEqual(cleaned.flags, ["met_archivist"], "unknown flags are dropped and dupes collapsed");
assert.deepEqual(cleaned.seenNodes, ["ch1_open"], "unknown nodes are dropped");

const completion = new StorySystem({ flags: ["met_archivist", "broke_the_seal"], seenNodes: [] });
assert.equal(completion.getNarrativeCompletion(STORY_FLAGS.length), 2 / STORY_FLAGS.length);
assert.equal(completion.getNarrativeCompletion(0), 0, "no division by zero");

console.log(JSON.stringify({
  nodes: STORY_NODE_IDS.length,
  flags: STORY_FLAGS.length,
  endings: ENDINGS.length,
  chapters: Object.keys(CHAPTER_CUTSCENES).length,
  textKeys: getStoryTextKeys("en").length,
  bilingual: true,
  structuralProblems: 0,
}));
