/**
 * Theme palettes. Every entry has the same 9 keys; consumers read a deep-route
 * theme directly and fall back to its base theme when a key is missing.
 * The four base themes drive tile-style selection; deep themes differentiate
 * via bg / portal / accent even though their tiles reuse the base theme's art.
 */
export const PALETTES: Record<string, any> = {
  forest: {
    bg: "#14231C",
    wall: "#314A37",
    floor: "#66785F",
    hazard1: "#1F607C",
    hazard2: "#79D5DF",
    bridge: "#8B5A2B",
    portal: "#5FFFE6",
    player: "#F05D5E",
    enemy: "#B66BD1"
  },
  dungeon: {
    bg: "#0B101A",
    wall: "#273246",
    floor: "#48556B",
    hazard1: "#4A2864",
    hazard2: "#A06CD5",
    bridge: "#596579",
    portal: "#C77DFF",
    player: "#F05D5E",
    enemy: "#D65A68"
  },
  snow: {
    bg: "#7FA9BE",
    wall: "#79A9C2",
    floor: "#BDD5DF",
    hazard1: "#8CC5DE",
    hazard2: "#F4FBFF",
    bridge: "#795548",
    portal: "#5DCBFF",
    player: "#E74C5B",
    enemy: "#24364A"
  },
  lava: {
    bg: "#16090C",
    wall: "#29202C",
    floor: "#4A3748",
    hazard1: "#D14C18",
    hazard2: "#FFB12B",
    bridge: "#3D4654",
    portal: "#FFD166",
    player: "#55B8FF",
    enemy: "#FF5D5D"
  },

  // Deep route — forest lineage. Walls and floors reuse the base theme because
  // wall/floor tile art is authored once per base theme; deep nodes diverge on
  // bg / hazard / portal / enemy accents.
  overgrown_archive: {
    bg: "#0E1B14",
    wall: "#314A37",
    floor: "#66785F",
    hazard1: "#1F607C",
    hazard2: "#79D5DF",
    bridge: "#6E4A28",
    portal: "#5FFFE6",
    player: "#F05D5E",
    enemy: "#8AC97A"
  },

  // Deep route — dungeon lineage, each with a distinct archival tone.
  sealed_library: {
    bg: "#0A1018",
    wall: "#273246",
    floor: "#48556B",
    hazard1: "#4A2864",
    hazard2: "#9D7BD8",
    bridge: "#4E5A70",
    portal: "#A06CD5",
    player: "#F05D5E",
    enemy: "#B66BD1"
  },
  sealed_armory: {
    bg: "#0B0E14",
    wall: "#273246",
    floor: "#48556B",
    hazard1: "#2E4057",
    hazard2: "#8FB4D9",
    bridge: "#55617A",
    portal: "#5DCBFF",
    player: "#F05D5E",
    enemy: "#C96A6A"
  },
  ash_catacombs: {
    bg: "#0E0C10",
    wall: "#273246",
    floor: "#48556B",
    hazard1: "#6B5A7A",
    hazard2: "#C9B8D9",
    bridge: "#4A4152",
    portal: "#C77DFF",
    player: "#F05D5E",
    enemy: "#A87DC9"
  },
  deep_prison: {
    bg: "#0B0F18",
    wall: "#273246",
    floor: "#48556B",
    hazard1: "#33425E",
    hazard2: "#7FA8C9",
    bridge: "#475468",
    portal: "#6FA8DC",
    player: "#F05D5E",
    enemy: "#6FA8DC"
  },
  deep_archive: {
    bg: "#080A12",
    wall: "#273246",
    floor: "#48556B",
    hazard1: "#3D2A63",
    hazard2: "#A583E8",
    bridge: "#3A4158",
    portal: "#B388FF",
    player: "#F05D5E",
    enemy: "#A583E8"
  },

  // Deep route — snow lineage.
  cooling_canal: {
    bg: "#5C8299",
    wall: "#79A9C2",
    floor: "#BDD5DF",
    hazard1: "#6FA8C9",
    hazard2: "#E8F7FF",
    bridge: "#5B6E80",
    portal: "#7FDBFF",
    player: "#E74C5B",
    enemy: "#2A3E52"
  },
  observatory: {
    bg: "#141A2E",
    wall: "#79A9C2",
    floor: "#BDD5DF",
    hazard1: "#33406E",
    hazard2: "#B9C8F2",
    bridge: "#2E3A58",
    portal: "#8FB4FF",
    player: "#E74C5B",
    enemy: "#7B93D6"
  },

  // Deep route — lava lineage.
  forge_core: {
    bg: "#170A09",
    wall: "#29202C",
    floor: "#4A3748",
    hazard1: "#E0561C",
    hazard2: "#FFC247",
    bridge: "#4A3A44",
    portal: "#FFD166",
    player: "#55B8FF",
    enemy: "#FF7A5C"
  },
};

/** Deep-route themes plus their intended base theme, for validation and lookup. */
export const DEEP_THEMES: Record<string, string> = {
  overgrown_archive: "forest",
  sealed_library: "dungeon",
  sealed_armory: "dungeon",
  ash_catacombs: "dungeon",
  deep_prison: "dungeon",
  deep_archive: "dungeon",
  cooling_canal: "snow",
  observatory: "snow",
  forge_core: "lava",
};
