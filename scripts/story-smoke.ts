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
import { StoryOverlay } from "../src/game/story/StoryOverlay";
import { t } from "../src/game/i18n";
import type { Input } from "../src/game/Input";
import type { MetaProgress } from "../src/game/MetaProgress";

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

// ------------------------------------------------------- ending epilogues ----

// Every ending needs body text in both languages so the overlay can play it.
for (const ending of ENDINGS) {
  assert.ok(hasStoryText("en", `${ending.id}.line0`), `${ending.id} needs an EN epilogue`);
  assert.ok(hasStoryText("zh-CN", `${ending.id}.line0`), `${ending.id} needs a ZH epilogue`);
}

// endingsSeen persists through the normalizer and drops garbage.
const cleanedEndings = normalizeStoryProgress({
  flags: [],
  seenNodes: [],
  endingsSeen: ["ending_true", "bogus_ending", "ending_true"],
});
assert.deepEqual(cleanedEndings.endingsSeen, ["ending_true"], "unknown endings are dropped and dupes collapsed");
const endingKeeper = new StorySystem(cleanedEndings);
assert.equal(endingKeeper.hasSeenEnding("ending_true"), true);
endingKeeper.recordEnding("ending_mercy");
assert.deepEqual(endingKeeper.toProgress().endingsSeen, ["ending_true", "ending_mercy"]);

// --------------------------------------------------------------- overlay ----

// A minimal Input: exactly the surface the overlay reads.
class FakeInput {
  public pressed = new Set<string>();
  getPrompt(action: string): string {
    return action === "interact" ? "K" : action === "pause" ? "ESC" : action.toUpperCase();
  }
  wasUiPressed(action: string): boolean { return this.pressed.has(action); }
  wasActionPressed(action: string): boolean { return this.pressed.has(action); }
}
const fakeInput = new FakeInput();
const asInput = fakeInput as unknown as Input;

function overlayFrame(dt: number, ...pressed: string[]): void {
  fakeInput.pressed = new Set(pressed);
  StoryOverlay.update(dt, asInput);
  fakeInput.pressed = new Set();
}

// A recording 2D context in the same spirit as weapon-hud-smoke's.
function createStoryContext() {
  const texts: string[] = [];
  const values: Record<string, unknown> = {};
  const target: Record<string, unknown> = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    fill() {}, stroke() {}, clip() {}, rect() {}, fillRect() {}, strokeRect() {},
    fillText(text: string) { texts.push(text); },
    measureText(text: string) { return { width: [...text].length * 4 }; },
  };
  const ctx = new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property as string];
      if (property in values) return values[property as string];
      return () => {};
    },
    set(_object, property, value) {
      values[property as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

function drawTexts(language: "en" | "zh-CN"): string[] {
  const { ctx, texts } = createStoryContext();
  StoryOverlay.draw(ctx, language);
  return texts;
}

StoryOverlay.reset();
assert.equal(StoryOverlay.isActive(), false);
assert.equal(StoryOverlay.consumeCompleted(), false, "nothing has completed yet");

// The overlay only needs meta.story, so the harness stays decoupled from the
// rest of MetaProgress.
const meta = { story: createDefaultStoryProgress() } as unknown as MetaProgress;

// Events with nothing mapped do not activate.
assert.equal(StoryOverlay.maybeTrigger({ kind: "chapter_start" }, meta), false, "no chapter, no world node, no trigger");

// -- chapter 1: cutscene then the Archivist spine ---------------------------

assert.equal(
  StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 1, worldNodeId: "overgrown_archive" }, meta),
  true,
  "chapter 1 start plays for a fresh meta",
);
assert.equal(StoryOverlay.isActive(), true);
assert.equal(StoryOverlay.getActiveNodeId(), "ch1_open");
assert.equal(
  StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 1, worldNodeId: "overgrown_archive" }, meta),
  false,
  "a second trigger while active is refused",
);

// Typewriter: partial reveal first, full text after the confirm press.
const ch1Line0 = storyText("en", "ch1_open.line0");
overlayFrame(0.1);
const partialTexts = drawTexts("en");
const partial = partialTexts.find(text => text.length > 0 && text.length < ch1Line0.length && ch1Line0.startsWith(text));
assert.ok(partial, "a short update reveals a strict prefix of the first line");
assert.ok(!partialTexts.includes(ch1Line0), "the full line is not visible yet");

overlayFrame(0, "confirm"); // completes the typewriter, must not advance
assert.equal(StoryOverlay.getActiveNodeId(), "ch1_open", "completing the reveal does not advance the node");
const fullTexts = drawTexts("en");
for (let index = 0; index < STORY_NODES.ch1_open.lineCount; index++) {
  assert.ok(fullTexts.includes(storyText("en", `ch1_open.line${index}`)), `line ${index} fully revealed`);
}
assert.ok(fullTexts.includes(t("en", "story.continue", { key: "K" })), "continue hint interpolates the bound key");
assert.ok(fullTexts.includes(t("en", "story.skip", { key: "ESC" })), "cutscenes offer the skip hint");

// The same frame draws in Chinese without throwing and with translated prose.
const zhTexts = drawTexts("zh-CN");
assert.ok(zhTexts.includes(storyText("zh-CN", "ch1_open.line0")), "ZH draw shows translated body text");
assert.ok(zhTexts.includes(t("zh-CN", "story.continue", { key: "K" })), "ZH continue hint renders");
drawTexts("en"); // restore language for the rest of the run

overlayFrame(0, "confirm"); // ch1_open is terminal -> next segment
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_intro", "chapter 1 chains into the Archivist");
assert.equal(StoryOverlay.consumeCompleted(), false, "the sequence is not finished yet");
assert.ok(meta.story.seenNodes.includes("ch1_open"), "seen nodes persist into meta.story");
assert.ok(meta.story.seenNodes.includes("archivist_intro"));
assert.ok(meta.story.flags.includes("met_archivist"), "entry flags land in meta.story");

// Skip must never bypass a decision, before or after the reveal completes.
overlayFrame(0, "pause");
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_intro", "skip is ignored mid-reveal on dialogue");
overlayFrame(0, "confirm"); // finish typewriter
overlayFrame(0, "pause");
overlayFrame(0, "cancel");
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_intro", "skip/cancel cannot bypass a choice");
assert.equal(StoryOverlay.isActive(), true);
const introTexts = drawTexts("en");
assert.ok(introTexts.includes(storyText("en", "archivist_intro.choice0")), "choices render after the reveal");
assert.ok(introTexts.includes(storyText("en", "archivist_intro.choice1")));
assert.ok(!drawTexts("en").includes(t("en", "story.skip", { key: "ESC" })), "dialogue hides the skip hint");

// Down selects the second choice; confirm commits it (branch proof).
overlayFrame(0, "down");
overlayFrame(0, "confirm");
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_deflect", "selection moved before committing");

overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "confirm"); // choice 0: "Fine. Talk."
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_relic");

overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "down");    // select "Leave it where it is."
overlayFrame(0, "confirm");
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_refused");
assert.ok(meta.story.flags.includes("refused_the_relic"), "the committed choice wrote its flag");
assert.ok(!meta.story.flags.includes("took_the_relic"));

overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "confirm"); // "What's my real name?"
assert.equal(StoryOverlay.getActiveNodeId(), "archivist_name");
assert.ok(meta.story.flags.includes("learned_true_name"));

overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "confirm"); // terminal choice closes the conversation
assert.equal(StoryOverlay.isActive(), false, "the chapter 1 sequence is over");
assert.equal(StoryOverlay.consumeCompleted(), true, "completion fires once");
assert.equal(StoryOverlay.consumeCompleted(), false, "and only once");

// Exactly once per meta.story state: the same trigger no longer fires.
assert.equal(
  StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 1, worldNodeId: "overgrown_archive" }, meta),
  false,
  "a seen chapter does not replay",
);

// -- chapter 2 via the cooling canal: skip cutscene, meet the vat -----------

assert.equal(
  StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 2, worldNodeId: "cooling_canal" }, meta),
  true,
);
assert.equal(StoryOverlay.getActiveNodeId(), "ch2_open");
overlayFrame(0, "pause"); // skip the cutscene entirely
assert.equal(StoryOverlay.getActiveNodeId(), "vat_horse_cage", "skip lands on the queued encounter");
overlayFrame(0, "pause");
assert.equal(StoryOverlay.getActiveNodeId(), "vat_horse_cage", "the encounter itself is not skippable");
overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "confirm"); // "Open it."
assert.equal(StoryOverlay.isActive(), false);
assert.equal(StoryOverlay.consumeCompleted(), true);
assert.ok(meta.story.flags.includes("freed_the_vat_horse"));

// -- first defeat plays the old memory --------------------------------------

assert.equal(StoryOverlay.maybeTrigger({ kind: "run_defeat" }, meta), true, "the first defeat has a scene");
assert.equal(StoryOverlay.getActiveNodeId(), "old_memory");
overlayFrame(0, "confirm");
overlayFrame(0, "confirm");
assert.equal(StoryOverlay.isActive(), false);
assert.equal(StoryOverlay.consumeCompleted(), true);
assert.ok(meta.story.flags.includes("found_old_memory"));
assert.equal(StoryOverlay.maybeTrigger({ kind: "run_defeat" }, meta), false, "the memory only plays once");

// -- chapter 3: the revealed true-name option closes the split --------------

assert.equal(
  StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 3, worldNodeId: "observatory" }, meta),
  true,
);
overlayFrame(0, "pause"); // skip ch3_open
assert.equal(StoryOverlay.getActiveNodeId(), "faction_choice");
overlayFrame(0, "confirm"); // reveal
const factionTexts = drawTexts("en");
assert.ok(
  factionTexts.includes(storyText("en", "faction_choice.choice2")),
  "knowing the true name reveals the third option through the overlay",
);
overlayFrame(0, "down");
overlayFrame(0, "down"); // slot 2: say the name
overlayFrame(0, "confirm");
assert.equal(StoryOverlay.isActive(), false);
assert.equal(StoryOverlay.consumeCompleted(), true);
assert.ok(!meta.story.flags.includes("sided_with_director"), "declining both factions sets neither flag");
assert.ok(!meta.story.flags.includes("sided_with_overseer"));

// -- chapter 4 via the deep prison: seal and rooster ------------------------

assert.equal(
  StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 4, worldNodeId: "deep_prison" }, meta),
  true,
);
overlayFrame(0, "pause"); // skip ch4_open
assert.equal(StoryOverlay.getActiveNodeId(), "final_seal");
overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "confirm"); // "Break the seal."
assert.ok(meta.story.flags.includes("broke_the_seal"));
assert.equal(StoryOverlay.getActiveNodeId(), "rooster_mercy", "the prison encounter follows the seal");
overlayFrame(0, "confirm"); // reveal
overlayFrame(0, "confirm"); // "Let it go."
assert.ok(meta.story.flags.includes("spared_the_rooster"));
assert.equal(StoryOverlay.isActive(), false);
assert.equal(StoryOverlay.consumeCompleted(), true);

// -- victory resolves, plays, and records the true ending -------------------

assert.equal(StoryOverlay.maybeTrigger({ kind: "run_victory" }, meta), true, "victory always plays an ending");
assert.equal(StoryOverlay.getActiveEndingId(), "ending_true", "the accumulated flags earn the true ending");
assert.equal(StoryOverlay.getActiveNodeId(), null, "an ending is not a tree node");
const endingTitleTexts = drawTexts("en");
assert.ok(endingTitleTexts.includes(t("en", "ending.ending_true")), "the localized ending title renders");
overlayFrame(0, "confirm"); // reveal epilogue
const endingBodyEn = drawTexts("en");
assert.ok(endingBodyEn.includes(storyText("en", "ending_true.line0")), "EN epilogue body renders");
const endingBodyZh = drawTexts("zh-CN");
assert.ok(endingBodyZh.includes(t("zh-CN", "ending.ending_true")), "ZH ending title renders");
assert.ok(endingBodyZh.includes(storyText("zh-CN", "ending_true.line0")), "ZH epilogue body renders");
drawTexts("en");
overlayFrame(0, "confirm"); // close the epilogue
assert.equal(StoryOverlay.isActive(), false);
assert.equal(StoryOverlay.consumeCompleted(), true);
assert.ok((meta.story.endingsSeen ?? []).includes("ending_true"), "the ending is recorded in meta.story");

// A later victory replays the finale (it is the run's closing scene) and the
// epilogue, being non-choice content, honors skip.
assert.equal(StoryOverlay.maybeTrigger({ kind: "run_victory" }, meta), true, "endings replay on every victory");
overlayFrame(0, "pause");
assert.equal(StoryOverlay.isActive(), false, "an ending can be skipped");
assert.equal(StoryOverlay.consumeCompleted(), true);
assert.deepEqual(meta.story.endingsSeen, ["ending_true"], "recording an ending twice keeps one entry");

// meta.story stayed normalizer-shaped throughout.
assert.deepEqual(normalizeStoryProgress(meta.story), meta.story, "overlay writes normalized progress only");

StoryOverlay.reset();

console.log(JSON.stringify({
  nodes: STORY_NODE_IDS.length,
  flags: STORY_FLAGS.length,
  endings: ENDINGS.length,
  chapters: Object.keys(CHAPTER_CUTSCENES).length,
  textKeys: getStoryTextKeys("en").length,
  bilingual: true,
  structuralProblems: 0,
  overlay: {
    triggers: ["chapter_start", "run_defeat", "run_victory"],
    typewriter: true,
    choiceGuard: true,
    endingRecorded: true,
  },
}));
