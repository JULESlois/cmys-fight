import assert from "node:assert/strict";
import fs from "node:fs";
import { getDailyChallengeId } from "../src/game/ChallengeSystem";
import { CHARACTERS } from "../src/game/data/characters";
import { RebirthLoadoutState } from "../src/game/states/RebirthLoadoutState";
import { HubState } from "../src/game/states/HubState";

function input(confirm = false) {
  return {
    wasUiPressed(action: string) { return confirm && action === "confirm"; },
    wasActionPressed() { return false; },
    wasPressed() { return false; },
    clearJustPressed() {},
    suppressUntilReleased() {},
    getConfirmPrompt: () => "K",
    getCancelPrompt: () => "ESC",
    getNavigationPrompt: () => "W/S",
    getPrompt: () => "K",
  } as any;
}

let savedLoadout = { characterId: "kanami", starterWeaponId: "finale" };
let rebirthSwitch: { state: string; params?: unknown } | null = null;
let runStarts = 0;
const rebirthEngine = {
  input: input(),
  data: {
    settings: { language: "en" },
    meta: { preferredHardMode: false },
    getHubLoadout: () => ({ ...savedLoadout }),
    isStarterWeaponUnlocked: () => true,
    isCharacterUnlocked: () => true,
    getStarterWeaponForCharacter: (characterId: string) => CHARACTERS[characterId]?.starterWeapon ?? "pistol",
    setHubLoadout(characterId: string, starterWeaponId?: string) {
      savedLoadout = { characterId, starterWeaponId: starterWeaponId ?? "pistol" };
    },
    startNewRun() { runStarts++; },
  },
  switchState(state: string, params?: unknown) { rebirthSwitch = { state, params }; },
} as any;

const rebirth = new RebirthLoadoutState(rebirthEngine) as any;
rebirth.enter();
assert.equal(rebirth.selectedCharacter.id, "kanami", "rebirth restores current Hub character");
assert.equal(rebirth.getUnlockedWeapons("kanami")[rebirth.selectedWeaponIndex].id, "finale", "rebirth restores current starter weapon");
rebirth.confirmLoadout(CHARACTERS.michele);
assert.deepEqual(savedLoadout, { characterId: "michele", starterWeaponId: "inspector" });
assert.equal(runStarts, 0, "rebirth loadout confirmation must not create a run");
assert.deepEqual(rebirthSwitch, { state: "hub", params: { spawnAnchor: "rebirth_spring" } });

function createHubHarness(validRun: boolean) {
  let activeRun = validRun;
  let switched = "";
  let startArgs: { characterId: string; weaponId?: string } | null = null;
  let abandonCount = 0;
  const meta = {
    hardModeUnlocked: true,
    preferredHardMode: false,
    preferredChallengeId: undefined as ReturnType<typeof getDailyChallengeId> | undefined,
  };
  const engine = {
    input: input(true),
    worldNotices: { showBottom() {}, showRegion() {} },
    data: {
      settings: { language: "en" },
      meta,
      hasValidSave: () => activeRun,
      getHubLoadout: () => ({ ...savedLoadout }),
      startNewRun(characterId: string, weaponId?: string) {
        startArgs = { characterId, weaponId };
        activeRun = true;
      },
      abandonRun() {
        abandonCount++;
        activeRun = false;
      },
      setPreferredHardMode(enabled: boolean) {
        meta.preferredHardMode = enabled;
        if (!enabled) meta.preferredChallengeId = undefined;
        return true;
      },
      setPreferredChallenge(challengeId?: ReturnType<typeof getDailyChallengeId>) {
        meta.preferredChallengeId = challengeId;
        return true;
      },
    },
    switchState(state: string) { switched = state; },
  } as any;
  const state = new HubState(engine) as any;
  return {
    state,
    meta,
    getStartArgs: () => startArgs,
    getSwitched: () => switched,
    getAbandonCount: () => abandonCount,
  };
}

savedLoadout = { characterId: "michele", starterWeaponId: "inspector" };
const newRun = createHubHarness(false);
newRun.state.selectedIndex = 1;
newRun.state.updateExpedition();
assert.deepEqual(newRun.getStartArgs(), { characterId: "michele", weaponId: "inspector" });
assert.equal(newRun.getSwitched(), "dungeon");

const continuing = createHubHarness(true);
savedLoadout = { characterId: "kanami", starterWeaponId: "finale" };
continuing.state.selectedIndex = 0;
continuing.state.updateExpedition();
assert.equal(continuing.getStartArgs(), null, "continue does not create a run from the later Hub loadout");
assert.equal(continuing.getSwitched(), "dungeon");

const replacing = createHubHarness(true);
replacing.state.selectedIndex = 1;
replacing.state.updateExpedition();
assert.equal(replacing.getStartArgs(), null, "first start press only arms active-run replacement");
assert.equal(replacing.state.confirmationAction, "start");
replacing.state.updateExpedition();
assert.deepEqual(replacing.getStartArgs(), { characterId: "kanami", weaponId: "finale" });
assert.equal(replacing.getAbandonCount(), 1);

const abandoning = createHubHarness(true);
abandoning.state.selectedIndex = 2;
abandoning.state.updateExpedition();
assert.equal(abandoning.getAbandonCount(), 0);
assert.equal(abandoning.state.confirmationAction, "abandon");
abandoning.state.updateExpedition();
assert.equal(abandoning.getAbandonCount(), 1);

const trial = createHubHarness(false);
trial.state.toggleHardMode();
assert.equal(trial.meta.preferredHardMode, true, "trial altar owns Hard Mode");
trial.state.toggleChallenge();
assert.equal(trial.meta.preferredChallengeId, getDailyChallengeId(), "trial altar owns daily Challenge");

const read = (path: string) => fs.readFileSync(path, "utf8");
const hubSource = read("src/game/states/HubState.ts");
const rebirthSource = read("src/game/states/RebirthLoadoutState.ts");
const engineSource = read("src/game/Engine.ts");
assert.match(hubSource, /EXPEDITION_ACTIONS: ExpeditionAction\[\] = \["continue", "start", "abandon", "close"\]/);
assert.match(hubSource, /TRIAL_ACTIONS: TrialAction\[\] = \["hard", "challenge", "close"\]/);
assert.doesNotMatch(hubSource, /switchState\("character_select"/);
assert.match(rebirthSource, /getHubLoadout\(\)/);
assert.match(rebirthSource, /setHubLoadout\(character\.id, starterWeaponId\)/);
assert.doesNotMatch(rebirthSource, /startNewRun|hubMode/);
assert.match(engineSource, /rebirth_loadout: new RebirthLoadoutState/);
assert.doesNotMatch(engineSource, /character_select: new/);

console.log(JSON.stringify({
  rebirth: "restores-and-saves-hub-loadout-without-run",
  expedition: ["continue", "start", "abandon", "close"],
  startUsesHubLoadout: newRun.getStartArgs(),
  continuePreservesRun: true,
  replacementConfirmation: true,
  trialAltar: "hard-and-daily-challenge",
  characterSelectRoute: "removed",
}));

