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
  // Sub-theme world-node palettes: tinted from their base themes so each
  // node reads differently at a glance. The wall color intentionally stays
  // identical to the base theme (authored wall tiles carry the identity).
  overgrown_archive: {
    // Deeper vine green and rotten-wood brown over the forest base.
    bg: "#0E1B12",
    wall: "#314A37",
    floor: "#55684A",
    hazard1: "#1C5450",
    hazard2: "#7FCFA4",
    bridge: "#6E4A2A",
    portal: "#7FE8B0",
    player: "#F05D5E",
    enemy: "#B66BD1"
  },
  sealed_library: {
    // Purple ink and parchment yellow over the dungeon base.
    bg: "#130C20",
    wall: "#273246",
    floor: "#4C3F68",
    hazard1: "#43225E",
    hazard2: "#B583DE",
    bridge: "#8A6B3F",
    portal: "#D9A8FF",
    player: "#F05D5E",
    enemy: "#D65A68"
  },
  sealed_armory: {
    // Iron gray and army green over the dungeon base.
    bg: "#0D1210",
    wall: "#273246",
    floor: "#4C5651",
    hazard1: "#3A4A2C",
    hazard2: "#8FA85C",
    bridge: "#55604F",
    portal: "#A8C77D",
    player: "#F05D5E",
    enemy: "#D65A68"
  },
  ash_catacombs: {
    // Ash gray and smoldering dark red over the dungeon base.
    bg: "#141010",
    wall: "#273246",
    floor: "#544E4B",
    hazard1: "#5A1F1A",
    hazard2: "#C4573B",
    bridge: "#5F5852",
    portal: "#E0704A",
    player: "#F05D5E",
    enemy: "#D65A68"
  },
  deep_prison: {
    // Rust red and iron black over the dungeon base.
    bg: "#0E0B0A",
    wall: "#273246",
    floor: "#4A3B33",
    hazard1: "#4F2418",
    hazard2: "#B05A38",
    bridge: "#503F35",
    portal: "#D08050",
    player: "#F05D5E",
    enemy: "#D65A68"
  },
  deep_archive: {
    // Void purple and archive gold over the dungeon base.
    bg: "#0C081A",
    wall: "#273246",
    floor: "#453A6E",
    hazard1: "#3A1E66",
    hazard2: "#E3BC5E",
    bridge: "#57497E",
    portal: "#F0C75A",
    player: "#F05D5E",
    enemy: "#D65A68"
  },
  observatory: {
    // Deep blue-purple night and starlight cyan over the snow base.
    bg: "#1B2440",
    wall: "#79A9C2",
    floor: "#8FA3CF",
    hazard1: "#2C4A72",
    hazard2: "#7DE8F5",
    bridge: "#4A5378",
    portal: "#8FF6FF",
    player: "#E74C5B",
    enemy: "#24364A"
  },
  cooling_canal: {
    // Ice blue channels and copper piping over the snow base.
    bg: "#5E92AC",
    wall: "#79A9C2",
    floor: "#A8CFDF",
    hazard1: "#7FC2E0",
    hazard2: "#E8FBFF",
    bridge: "#8F6A4C",
    portal: "#66E0FF",
    player: "#E74C5B",
    enemy: "#1E3A52"
  },
  forge_core: {
    // Molten orange on charred iron over the lava base.
    bg: "#1A0602",
    wall: "#29202C",
    floor: "#4A1A1A",
    hazard1: "#E85A10",
    hazard2: "#FFC22E",
    bridge: "#3D2A24",
    portal: "#FFAE33",
    player: "#55B8FF",
    enemy: "#FF7040"
  }
};
