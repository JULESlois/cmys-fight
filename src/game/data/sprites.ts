import { WEAPON_PALETTES, WEAPON_SPRITES } from "./weaponArt";
import {
  CELESTIA_CHARACTER_PALETTE,
  CELESTIA_CHARACTER_SPRITES,
  ESPER_ZERO_CHARACTER_PALETTE,
  ESPER_ZERO_CHARACTER_SPRITES,
  KANAMI_CHARACTER_SPRITES,
  KANAMI_CHARACTER_PALETTE,
  MICHELE_CHARACTER_SPRITES,
  MICHELE_CHARACTER_PALETTE,
  NANALLY_CHARACTER_PALETTE,
  NANALLY_CHARACTER_SPRITES,
} from "./characterArt";

export type SpriteData = string[];

const WEAPON_SPRITE_ENTRIES: Record<string, SpriteData> = Object.fromEntries(
  Object.entries(WEAPON_SPRITES).map(([weaponId, sprite]) => [`weapon_${weaponId}`, sprite]),
);

export const SPRITES: Record<string, SpriteData> = {
  player_main_side_idle: [
    "......111.......",
    ".....12221......",
    "....1222221.....",
    "...122222221....",
    "...133332221....",
    "..1344444221....",
    "..1445555421....",
    "...144444411....",
    "...16676661.....",
    "...16677661.....",
    "...16666661.....",
    "....177771......",
    "....188881......",
    "....188881......",
    "....19..91......",
    "................"
  ],
  player_main_side_walk_0: [
    "......111.......",
    ".....12221......",
    "....1222221.....",
    "...122222221....",
    "...133332221....",
    "..1344444221....",
    "..1445555421....",
    "...144444411....",
    "...16676661.....",
    "...16677661.....",
    "...16666661.....",
    "....177771......",
    "....188881......",
    "....1881........",
    "....19..........",
    "................"
  ],
  player_main_side_walk_1: [
    "......111.......",
    ".....12221......",
    "....1222221.....",
    "...122222221....",
    "...133332221....",
    "..1344444221....",
    "..1445555421....",
    "...144444411....",
    "...16676661.....",
    "...16677661.....",
    "...16666661.....",
    "....177771......",
    "....188881......",
    ".......1881.....",
    "........91......",
    "................"
  ],

  ...MICHELE_CHARACTER_SPRITES,
  ...KANAMI_CHARACTER_SPRITES,
  ...CELESTIA_CHARACTER_SPRITES,
  ...ESPER_ZERO_CHARACTER_SPRITES,
  ...NANALLY_CHARACTER_SPRITES,

  enemy_melee_idle: [
    "...11......11...",
    "..1881....1881..",
    "..188811118881..",
    "...1888888881...",
    "...1811881181...",
    "...1888888881...",
    "....11888811....",
    "...1888888881...",
    "..188188881881..",
    "..188188881881..",
    "..188111111881..",
    "...11.1881.11...",
    "......1881......",
    ".....11..11.....",
    ".....1....1.....",
    "................"
  ],
  enemy_ranged_idle: [
    "......1111......",
    ".....155551.....",
    "....15555551....",
    "...1552222551...",
    "...1528888251...",
    "...1528888251...",
    "...1552222551...",
    "....11555511....",
    "...1555555551...",
    "..155155551551..",
    "..155155551551..",
    "..155111111551..",
    "...11.1551.11...",
    "......1551......",
    ".....11..11.....",
    "................"
  ],
  enemy_boss_idle: [
    "......1111......",
    "....11888811....",
    "...1888888881...",
    "..188118811881..",
    ".18888888888881.",
    ".18811188111881.",
    ".18888888888881.",
    "..118888888811..",
    "....11888811....",
    "...1888888881...",
    "..188188881881..",
    ".18881888818881.",
    ".18881111118881.",
    "..111.1881.111..",
    "......1111......",
    "................"
  ],
  pickup_hp: [
    "................",
    "......111.......",
    ".....12221......",
    ".....11111......",
    "....1888881.....",
    "...189888881....",
    "...188888881....",
    "...188818881....",
    "...188181881....",
    "...188818881....",
    "...188888881....",
    "....1888881.....",
    ".....11111......",
    "................",
    "................",
    "................"
  ],
  pickup_mana: [
    "................",
    "......11........",
    ".....1661.......",
    "....169661......",
    "...16966661.....",
    "..1696666661....",
    "..1666666661....",
    "..1666666661....",
    "...16666661.....",
    "....166661......",
    ".....1661.......",
    "......11........",
    "................",
    "................",
    "................",
    "................"
  ],
  pickup_coin: [
    "................",
    ".....11111......",
    "...117777711....",
    "..17779777771...",
    ".1777997777771..",
    ".1777971117771..",
    ".1777717771771..",
    ".1777717771771..",
    ".1777717771771..",
    ".1777711117771..",
    ".1777777777771..",
    "..17777777771...",
    "...117777711....",
    ".....11111......",
    "................",
    "................"
  ],
  pickup_pistol: [
    "................",
    "................",
    "................",
    "....1111111.....",
    "...122222221....",
    "...144412211....",
    "...1441.11......",
    "....11..........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ],
  pickup_shotgun: [
    "................",
    "................",
    "....111111111...",
    "...12222222221..",
    "...14444111221..",
    "...14441..111...",
    "....111.........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ],
  pickup_laser: [
    "................",
    "................",
    "....111111111...",
    "...19999999991..",
    "...15555111991..",
    "...15551..111...",
    "....111.........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ],
  portal_core: [
    "......1111......",
    "....11555511....",
    "...1556666551...",
    "..156699996651..",
    ".15699999999651.",
    ".15699999999651.",
    ".15699999999651.",
    ".15699999999651.",
    "..156699996651..",
    "...1556666551...",
    "....11555511....",
    "......1111......",
    "................",
    "................",
    "................",
    "................"
  ],
  ...WEAPON_SPRITE_ENTRIES,
};

// 0 = transparent
// 1 = black outline
// 2 = silver/gray
// 3 = skin
// 4 = dark gray/brown
// 5 = purple
// 6 = blue
// 7 = gold/yellow
// 8 = red
// 9 = light yellow / white
export const DEFAULT_PALETTE: Record<string, string> = {
  ".": "transparent",
  "1": "#1a1c2c",
  "2": "#5d275d",
  "3": "#f4cd82",
  "4": "#333c57",
  "5": "#b13e53",
  "6": "#29adff",
  "7": "#ffcd75",
  "8": "#e43b44",
  "9": "#fff1e8"
};

export const SPRITE_PALETTES: Record<string, Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(WEAPON_PALETTES).map(([weaponId, palette]) => [`weapon_${weaponId}`, palette]),
  ),
  ...Object.fromEntries(
    Object.keys(MICHELE_CHARACTER_SPRITES).map(spriteName => [spriteName, MICHELE_CHARACTER_PALETTE]),
  ),
  ...Object.fromEntries(
    Object.keys(KANAMI_CHARACTER_SPRITES).map(spriteName => [spriteName, KANAMI_CHARACTER_PALETTE]),
  ),
  ...Object.fromEntries(
    Object.keys(CELESTIA_CHARACTER_SPRITES).map(spriteName => [spriteName, CELESTIA_CHARACTER_PALETTE]),
  ),
  ...Object.fromEntries(
    Object.keys(ESPER_ZERO_CHARACTER_SPRITES).map(spriteName => [spriteName, ESPER_ZERO_CHARACTER_PALETTE]),
  ),
  ...Object.fromEntries(
    Object.keys(NANALLY_CHARACTER_SPRITES).map(spriteName => [spriteName, NANALLY_CHARACTER_PALETTE]),
  ),
};


export const KANAMI_PLAYER_PALETTE: Record<string, string> = KANAMI_CHARACTER_PALETTE;

export const MICHELE_PLAYER_PALETTE: Record<string, string> = MICHELE_CHARACTER_PALETTE;

export const CELESTIA_PLAYER_PALETTE: Record<string, string> = CELESTIA_CHARACTER_PALETTE;

export const ESPER_ZERO_PLAYER_PALETTE: Record<string, string> = ESPER_ZERO_CHARACTER_PALETTE;

export const NANALLY_PLAYER_PALETTE: Record<string, string> = NANALLY_CHARACTER_PALETTE;

export const PLAYER_PALETTE: Record<string, string> = {
  ".": "transparent",
  "1": "#1a1c2c",
  "2": "#c9859d",
  "3": "#8a5a44",
  "4": "#f4c99b",
  "5": "#7a4a17",
  "6": "#f5f1e8",
  "7": "#17304f",
  "8": "#111827",
  "9": "#ffffff"
};
