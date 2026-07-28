import assert from "node:assert/strict";
import fs from "node:fs";

const renderer = fs.readFileSync("src/game/render/MonsterModelRenderer.ts", "utf8");
const entity = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const enemies = fs.readFileSync("src/game/data/enemies.ts", "utf8");
const svg = fs.readFileSync("docs/art-proposals/2026-07-28-spore-mimic-redesign.svg", "utf8");

assert.match(renderer, /spore_mimic\(ctx[\s\S]*capOffsetY[\s\S]*capSpread[\s\S]*jawOpen[\s\S]*stalkCompress/);
assert.match(renderer, /spores:\s*3[\s\S]*spores:\s*5/, "windup progresses from sparse to solid spores");
assert.match(renderer, /#5B2936/);
assert.match(renderer, /#B34B5D/);
assert.match(renderer, /#6F8F4D/);
assert.match(renderer, /#F6C85A/);
assert.match(renderer, /#FFF7D8/);
assert.match(entity, /enemy\.enemyId === "spore_mimic"[\s\S]*enemy\.areaRadius/, "telegraph uses live damage radius");
assert.match(entity, /pointCount = progress < 0\.34 \? 8 : progress < 0\.72 \? 12 : 16/, "telegraph has three readable stages");
assert.match(enemies, /spore_mimic:[\s\S]*hitboxRadius:\s*19[\s\S]*hitboxOffsetY:\s*-15[\s\S]*shadowWidth:\s*27/);
assert.match(enemies, /spore_mimic:[\s\S]*attackWindup:\s*0\.82[\s\S]*areaRadius:\s*20/);
assert.match(svg, /<svg[^>]*width="1200"[^>]*height="820"[^>]*viewBox="0 0 1200 820"/);
for (const color of ["#5B2936", "#B34B5D", "#6F8F4D", "#F6C85A", "#FFF7D8"]) assert.ok(svg.toUpperCase().includes(color));
assert.doesNotMatch(renderer.slice(renderer.indexOf("spore_mimic(ctx"), renderer.indexOf("forest_guardian(ctx")), /Math\.random/);
console.log(JSON.stringify({ enemy: "spore_mimic", windup: 0.82, areaRadius: 20, stages: ["compress", "spore-ring", "open-mouth", "recover"] }));
