import assert from "node:assert/strict";
import fs from "node:fs";
import { BUFFS } from "../src/game/combat/BuffSystem";
import { getBuffText, wrapLocalized } from "../src/game/i18n";

// #77: long buff descriptions must never be silently cut on the selection card.
// The card may compress to 3 lines + "…", but a full-text path must exist and
// re-wrap (not truncate) the complete rule text at wider width.

const rendererSrc = fs.readFileSync("src/game/render/BuffSelectionRenderer.ts", "utf8");
const dungeonSrc = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const i18nSrc = fs.readFileSync("src/game/i18n.ts", "utf8");

// 1) The previously-silent `.slice(0, 4)` that dropped rule tail is gone.
assert.equal(
  rendererSrc.includes("wrapLocalized(localized.description"),
  true,
  "card description wrap should still be present",
);
assert.equal(
  /\.slice\(0, 4\)\s*$/m.test(rendererSrc.replace(/\s+/g, " ").replace("…", "")),
  false,
  "renderer must not keep a bare .slice(0,4) that discards description text",
);

// 2) The known long-offender buffs really overflow a 4-line card in English, so
// the regression matters (en wraps at 19 cols on the card).
const OFFENDERS = ["execution_window", "momentum_store", "perfect_survey"] as const;
for (const id of OFFENDERS) {
  const en = getBuffText(id, BUFFS[id], "en").description;
  const cardLines = wrapLocalized(en, 19);
  assert.ok(
    cardLines.length > 4,
    `${id} should overflow the 4-line card in English (got ${cardLines.length} lines) — if this no longer overflows, the detail affordance may be moot`,
  );
  // And the full text is recoverable by re-wrapping at the wider detail width:
  // concatenating detail-width lines preserves every word (no info loss).
  const detailLines = wrapLocalized(en, 46);
  const rejoined = detailLines.join(" ").replace(/\s+/g, " ").trim();
  assert.equal(rejoined, en.replace(/\s+/g, " ").trim(), `${id} detail wrap must preserve full text`);
}

// 3) Renderer exposes a detail strip governed by a detailBuffId, with its own
// wider wrap and an explicit close hint — the accessible full-text path.
assert.match(rendererSrc, /detailBuffId: BuffId \| null/, "renderer must accept a detailBuffId");
assert.match(rendererSrc, /wrapLocalized\(dloc\.description, maxDetailCols\)/, "detail strip must re-wrap at wider column count");
assert.match(rendererSrc, /"buff\.detailHint"/, "detail strip must show a close/dismiss hint");
assert.match(rendererSrc, /"…"/, "card must draw an ellipsis indicator when truncated");

// 4) DungeonState wires a two-press confirm: first opens detail, second (or any
// navigation) closes it — acquisition requires the extra confirm, so opening
// detail can never consume the choice by accident.
assert.match(dungeonSrc, /buffDetailBuffId: BuffId \| null = null/, "state must track detail buff");
assert.match(dungeonSrc, /buffDescriptionOverflows/, "state must only open detail when the focused card overflows");
assert.match(dungeonSrc, /this\.buffDetailBuffId,\s*\)/, "state must pass detailBuffId to the renderer");
// Detail branch returns before acquire when open.
assert.match(dungeonSrc, /if \(this\.buffDetailBuffId !== null\) \{[\s\S]*?return;\s*\}\s*if \(this\.engine\.input\.wasUiPressed\("confirm"\) && this\.buffDescriptionOverflows/, "detail-open path must gate acquisition");

// 5) Both languages define the new affordance strings and they are non-empty.
for (const key of ['"buff.detail"', '"buff.detailHint"']) {
  assert.ok(i18nSrc.includes(key), `i18n must define ${key}`);
}
const footerEn = /"buff\.footer": "\[\{cycle\}\] CYCLE.*\{detail\}/.test(i18nSrc);
const footerZh = /"buff\.footer": "\[\{cycle\}\] 切换.*\{detail\}/.test(i18nSrc);
assert.ok(footerEn && footerZh, "both language footers must expose the {detail} slot");

// 6) Chinese text path: wrapLocalized at the narrower CJK card width also wraps
// (even if it doesn't overflow for these particular strings, the code path must
// be language-agnostic and the same ellipsis/detail flow applies).
for (const id of OFFENDERS) {
  const zh = getBuffText(id, BUFFS[id], "zh-CN").description;
  assert.ok(zh.length > 0, `${id} must have a zh-CN description`);
  const zhLines = wrapLocalized(zh, 16);
  assert.ok(zhLines.length >= 1, "zh-CN wrap must produce lines");
  const zhRejoined = zhLines.join(" ").replace(/\s+/g, "").trim();
  assert.equal(zhRejoined, zh.replace(/\s+/g, "").trim(), `${id} zh-CN wrap must preserve full text`);
}

console.log("buff-detail-smoke: ok");
