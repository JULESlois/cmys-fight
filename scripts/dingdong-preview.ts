import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DINGDONG_CHARACTER_SPRITES } from "../src/game/data/dingdongCharacterArt";
import { SPRITES, SPRITE_PALETTES } from "../src/game/data/sprites";

// Reproducible review sheet from the exact runtime pixels, including the
// renderer's one-pixel external outline. No image/model dependency is needed.
const output = process.argv[2] ?? "docs/art-proposals/dingdong-character-preview.svg";
const scale = 4;
const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="700" viewBox="0 0 1040 700">',
  '<rect width="1040" height="700" fill="#1c2633"/>',
  '<g fill="#f4fafa" font-family="monospace"><text x="28" y="36" font-size="23">DINGDONG / DABAI</text>',
  '<text x="28" y="62" font-size="14">32 x 32 native pixels | no arms | separate weapons and FX | mirror for left facing</text></g>',
];
const groups = [
  { label: "IDLE / planted feet", prefix: "idle", top: 102 },
  { label: "WALK / opposing steps", prefix: "walk", top: 300 },
  { label: "SKILL / wind-up - release - recovery", prefix: "skill", top: 498 },
];
for (const group of groups) {
  svg.push(`<text x="28" y="${group.top}" fill="#8bcfe0" font-family="monospace" font-size="15">${group.label}</text>`);
  const names = Object.keys(DINGDONG_CHARACTER_SPRITES).filter(name => name.startsWith(`player_dingdong_side_${group.prefix}`));
  names.forEach((name, index) => {
    const frame = SPRITES[name];
    const palette = SPRITE_PALETTES[name];
    const pixels = new Map<string, string>();
    frame.forEach((row, y) => [...row].forEach((pixel, x) => {
      if (pixel === ".") return;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!frame[y + dy]?.[x + dx] || frame[y + dy][x + dx] === ".") pixels.set(`${x + dx},${y + dy}`, "#09101A");
      }
    }));
    frame.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel !== ".") pixels.set(`${x},${y}`, palette[pixel]); }));
    svg.push(`<g transform="translate(${28 + index * 170},${group.top + 20})" shape-rendering="crispEdges">`);
    const paths = new Map<string, string[]>();
    for (const [key, color] of pixels) {
      const [x, y] = key.split(",").map(Number);
      if (!paths.has(color)) paths.set(color, []);
      paths.get(color)!.push(`M${x * scale},${y * scale}h${scale}v${scale}h-${scale}z`);
    }
    for (const [color, shapes] of paths) svg.push(`<path fill="${color}" d="${shapes.join("")}"/>`);
    svg.push(`</g><text x="${36 + index * 170}" y="${group.top + 169}" fill="#d8e4ea" font-family="monospace" font-size="14">${name.replace("player_dingdong_side_", "")}</text>`);
  });
}
svg.push('</svg>');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, svg.join("\n") + "\n");
console.log(`Wrote ${output}`);
