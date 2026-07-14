import { Room } from "../FloorGenerator";
import { getMapData, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, DOOR_ZONES } from "../MapData";
import { PALETTES } from "../data/palettes";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
}

function tileHash(x: number, y: number): number {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
}

function isTile(mapData: number[], x: number, y: number, tileId: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return false;
  return mapData[y * MAP_WIDTH + x] === tileId;
}

function drawForestFloorTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  hash: number,
): void {
  const variant = Math.floor(hash) % 4;
  ctx.fillStyle = variant === 0 ? "#566C50" : variant === 1 ? "#5B7053" : variant === 2 ? "#607458" : "#586D51";
  ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

  // Large, readable material patches replace per-tile pepper noise.
  if (variant === 0) {
    ctx.fillStyle = "#455D43";
    ctx.fillRect(tx + 1, ty + 10, 7, 4);
    ctx.fillStyle = "#779265";
    ctx.fillRect(tx + 9, ty + 2, 5, 3);
  } else if (variant === 1) {
    ctx.fillStyle = "#718A61";
    ctx.fillRect(tx + 2, ty + 2, 6, 4);
    ctx.fillStyle = "#4D6448";
    ctx.fillRect(tx + 10, ty + 9, 5, 5);
  } else if (variant === 2) {
    ctx.fillStyle = "#747A62";
    ctx.fillRect(tx + 3, ty + 5, 5, 3);
    ctx.fillRect(tx + 9, ty + 10, 4, 2);
    ctx.fillStyle = "#474F43";
    ctx.fillRect(tx + 4, ty + 8, 4, 1);
  } else {
    ctx.fillStyle = "#425B42";
    ctx.fillRect(tx + 6, ty + 1, 4, 8);
    ctx.fillStyle = "#75915F";
    ctx.fillRect(tx + 2, ty + 12, 7, 2);
  }

  // Grass clumps are sparse and directional, not random single-pixel static.
  if (Math.floor(hash) % 7 === 0) {
    ctx.fillStyle = "#86A95B";
    ctx.fillRect(tx + 4, ty + 7, 1, 5);
    ctx.fillRect(tx + 6, ty + 8, 1, 4);
    ctx.fillRect(tx + 8, ty + 6, 1, 6);
    ctx.fillStyle = "#B2CB72";
    ctx.fillRect(tx + 8, ty + 6, 1, 2);
  }
  if (Math.floor(hash) % 19 === 0) {
    ctx.fillStyle = "#E789AA";
    ctx.fillRect(tx + 3, ty + 4, 3, 3);
    ctx.fillStyle = "#FFE57A";
    ctx.fillRect(tx + 4, ty + 5, 1, 1);
  }

  // Only a minority of tiles keep a faint seam. A full border around every
  // cell made the clearing look like a checkerboard rather than soil.
  if (variant === 2) {
    ctx.fillStyle = "rgba(21, 37, 27, 0.11)";
    ctx.fillRect(tx + 3, ty + 15, 10, 1);
  } else if (variant === 3) {
    ctx.fillStyle = "rgba(21, 37, 27, 0.09)";
    ctx.fillRect(tx + 15, ty + 4, 1, 8);
  }
}

function drawForestStreamTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  time: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  ctx.fillStyle = "#174E62";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#236E7B";
  ctx.fillRect(tx + 1, ty + 3, 14, 10);
  ctx.fillStyle = "#51A9A9";
  const drift = Math.floor(time * 5 + tileX * 3 + tileY * 2) % 8;
  ctx.fillRect(tx + drift, ty + 5, 5, 1);
  ctx.fillRect(tx + ((drift + 6) % 11), ty + 10, 4, 1);
  ctx.fillStyle = "#8DD5C5";
  ctx.fillRect(tx + ((drift + 3) % 13), ty + 4, 2, 1);

  // Bank pixels respond to neighbouring land, so water reads as a stream.
  ctx.fillStyle = "#3E543B";
  if (!isTile(mapData, tileX - 1, tileY, 3)) ctx.fillRect(tx, ty, 3, 16);
  if (!isTile(mapData, tileX + 1, tileY, 3)) ctx.fillRect(tx + 13, ty, 3, 16);
  if (!isTile(mapData, tileX, tileY - 1, 3)) ctx.fillRect(tx, ty, 16, 3);
  if (!isTile(mapData, tileX, tileY + 1, 3)) ctx.fillRect(tx, ty + 13, 16, 3);
  ctx.fillStyle = "#7D9560";
  if (!isTile(mapData, tileX, tileY - 1, 3)) ctx.fillRect(tx + 2, ty + 2, 12, 1);
  if (!isTile(mapData, tileX, tileY + 1, 3)) ctx.fillRect(tx + 2, ty + 13, 12, 1);
}

function drawForestWallTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  hash: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const exposedTop = !isTile(mapData, tileX, tileY - 1, 1);
  const exposedBottom = !isTile(mapData, tileX, tileY + 1, 1);
  const exposedLeft = !isTile(mapData, tileX - 1, tileY, 1);
  const exposedRight = !isTile(mapData, tileX + 1, tileY, 1);

  ctx.fillStyle = "#243B2D";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#31523A";
  ctx.fillRect(tx + 2, ty + 1, 12, 14);
  ctx.fillStyle = "#416246";
  ctx.fillRect(tx + 3, ty + 2, 5, 12);
  ctx.fillStyle = "#1B3026";
  ctx.fillRect(tx + 11, ty + 3, 3, 12);

  // Vertical bark seams and roots create a continuous hedge/tree wall.
  ctx.fillStyle = "#5D4631";
  ctx.fillRect(tx + 5, ty + 4, 2, 12);
  if (Math.floor(hash) % 3 === 0) ctx.fillRect(tx + 10, ty + 7, 2, 9);
  ctx.fillStyle = "#795D3B";
  ctx.fillRect(tx + 5, ty + 4, 1, 7);

  if (exposedTop) {
    ctx.fillStyle = "#1B3024";
    ctx.fillRect(tx, ty, 16, 3);
    ctx.fillStyle = "#3E773F";
    ctx.fillRect(tx + 1, ty, 7, 5);
    ctx.fillRect(tx + 7, ty + 1, 8, 4);
    ctx.fillStyle = "#5E9A4C";
    ctx.fillRect(tx + 3, ty, 4, 2);
    ctx.fillRect(tx + 10, ty + 1, 3, 2);
  }
  if (exposedBottom) {
    ctx.fillStyle = "#17291F";
    ctx.fillRect(tx, ty + 13, 16, 3);
    ctx.fillStyle = "#503925";
    ctx.fillRect(tx + 2, ty + 12, 6, 4);
    ctx.fillRect(tx + 10, ty + 11, 5, 5);
  }
  if (exposedLeft) {
    ctx.fillStyle = "#182A21";
    ctx.fillRect(tx, ty, 3, 16);
    ctx.fillStyle = "#4A7147";
    ctx.fillRect(tx + 2, ty + 3, 2, 8);
  }
  if (exposedRight) {
    ctx.fillStyle = "#17281F";
    ctx.fillRect(tx + 13, ty, 3, 16);
    ctx.fillStyle = "#6C5034";
    ctx.fillRect(tx + 12, ty + 6, 2, 10);
  }

  if (Math.floor(hash) % 13 === 0 && exposedTop) {
    ctx.fillStyle = "#E682A5";
    ctx.fillRect(tx + 9, ty + 3, 3, 3);
    ctx.fillStyle = "#FFE177";
    ctx.fillRect(tx + 10, ty + 4, 1, 1);
  }
}

function drawDungeonFloorTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  hash: number,
): void {
  const variant = Math.floor(hash) % 5;
  const bases = ["#354154", "#394559", "#323E50", "#3B475A", "#344052"] as const;
  ctx.fillStyle = bases[variant];
  ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

  // Large crypt slabs replace the old per-cell dotted grid.
  ctx.fillStyle = variant % 2 === 0 ? "#414E64" : "#435066";
  if (variant === 0) {
    ctx.fillRect(tx + 1, ty + 2, 14, 5);
    ctx.fillRect(tx + 4, ty + 9, 11, 5);
  } else if (variant === 1) {
    ctx.fillRect(tx + 2, ty + 1, 6, 13);
    ctx.fillRect(tx + 10, ty + 4, 5, 10);
  } else if (variant === 2) {
    ctx.fillRect(tx + 1, ty + 1, 9, 7);
    ctx.fillRect(tx + 6, ty + 10, 9, 5);
  } else if (variant === 3) {
    ctx.fillRect(tx + 3, ty + 2, 12, 4);
    ctx.fillRect(tx + 1, ty + 8, 10, 6);
  } else {
    ctx.fillRect(tx + 1, ty + 3, 5, 11);
    ctx.fillRect(tx + 8, ty + 1, 7, 8);
  }

  ctx.fillStyle = "rgba(13, 18, 28, 0.5)";
  if (variant === 0 || variant === 3) {
    ctx.fillRect(tx + 2, ty + 7, 12, 2);
    ctx.fillRect(tx + 9, ty + 9, 2, 5);
  } else if (variant === 1) {
    ctx.fillRect(tx + 8, ty + 2, 2, 12);
    ctx.fillRect(tx + 10, ty + 7, 5, 2);
  } else if (variant === 2) {
    ctx.fillRect(tx + 1, ty + 8, 6, 2);
    ctx.fillRect(tx + 7, ty + 8, 2, 6);
  }

  // Sparse bones, rivets and faded runes identify the material without noise.
  if (Math.floor(hash) % 13 === 0) {
    ctx.fillStyle = "#8F9A99";
    ctx.fillRect(tx + 4, ty + 11, 7, 2);
    ctx.fillRect(tx + 3, ty + 10, 2, 4);
    ctx.fillRect(tx + 10, ty + 10, 2, 4);
  } else if (Math.floor(hash) % 17 === 0) {
    ctx.fillStyle = "rgba(151, 82, 183, 0.34)";
    ctx.fillRect(tx + 7, ty + 4, 2, 8);
    ctx.fillRect(tx + 4, ty + 7, 8, 2);
    ctx.fillStyle = "rgba(209, 159, 230, 0.4)";
    ctx.fillRect(tx + 7, ty + 7, 2, 2);
  } else if (Math.floor(hash) % 9 === 0) {
    ctx.fillStyle = "#667382";
    ctx.fillRect(tx + 3, ty + 3, 2, 2);
    ctx.fillRect(tx + 12, ty + 11, 2, 2);
  }
}

function drawDungeonAbyssTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  time: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const drift = Math.floor(time * 3 + tileX * 5 + tileY * 2) % 10;
  ctx.fillStyle = "#100D1B";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#21152F";
  ctx.fillRect(tx + 2, ty + 2, 12, 12);
  ctx.fillStyle = "#39204D";
  ctx.fillRect(tx + 3, ty + 5, 10, 6);
  ctx.fillStyle = "#7845A0";
  ctx.fillRect(tx + 2 + drift, ty + 6, 4, 1);
  ctx.fillRect(tx + ((drift + 5) % 11), ty + 11, 3, 1);
  ctx.fillStyle = "#C584EC";
  ctx.fillRect(tx + ((drift + 2) % 13), ty + 5, 2, 1);

  // Stone lips appear only on exposed edges, joining adjacent void cells.
  ctx.fillStyle = "#2D384A";
  if (!isTile(mapData, tileX - 1, tileY, 3)) ctx.fillRect(tx, ty, 3, 16);
  if (!isTile(mapData, tileX + 1, tileY, 3)) ctx.fillRect(tx + 13, ty, 3, 16);
  if (!isTile(mapData, tileX, tileY - 1, 3)) ctx.fillRect(tx, ty, 16, 3);
  if (!isTile(mapData, tileX, tileY + 1, 3)) ctx.fillRect(tx, ty + 13, 16, 3);
  ctx.fillStyle = "#657188";
  if (!isTile(mapData, tileX, tileY - 1, 3)) ctx.fillRect(tx + 2, ty + 2, 12, 1);
  if (!isTile(mapData, tileX, tileY + 1, 3)) ctx.fillRect(tx + 2, ty + 13, 12, 1);
  if (!isTile(mapData, tileX - 1, tileY, 3)) ctx.fillRect(tx + 2, ty + 2, 1, 12);
  if (!isTile(mapData, tileX + 1, tileY, 3)) ctx.fillRect(tx + 13, ty + 2, 1, 12);
}

function drawDungeonWallTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  hash: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const exposedTop = !isTile(mapData, tileX, tileY - 1, 1);
  const exposedBottom = !isTile(mapData, tileX, tileY + 1, 1);
  const exposedLeft = !isTile(mapData, tileX - 1, tileY, 1);
  const exposedRight = !isTile(mapData, tileX + 1, tileY, 1);

  ctx.fillStyle = "#182131";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#2A374C";
  ctx.fillRect(tx + 1, ty + 1, 14, 14);
  ctx.fillStyle = "#3A4860";
  ctx.fillRect(tx + 2, ty + 2, 9, 5);
  ctx.fillRect(tx + 5, ty + 9, 9, 5);
  ctx.fillStyle = "#202B3D";
  ctx.fillRect(tx + 1, ty + 7, 14, 2);
  ctx.fillRect(tx + 10, ty + 1, 2, 6);
  ctx.fillRect(tx + 3, ty + 9, 2, 6);

  if (Math.floor(hash) % 4 === 0) {
    ctx.fillStyle = "#56647A";
    ctx.fillRect(tx + 3, ty + 3, 5, 1);
    ctx.fillRect(tx + 8, ty + 4, 1, 4);
    ctx.fillRect(tx + 9, ty + 7, 4, 1);
  }
  if (Math.floor(hash) % 11 === 0) {
    ctx.fillStyle = "#8D5CAC";
    ctx.fillRect(tx + 6, ty + 10, 2, 4);
    ctx.fillStyle = "#D098EF";
    ctx.fillRect(tx + 6, ty + 10, 1, 2);
  }

  if (exposedTop) {
    ctx.fillStyle = "#101724";
    ctx.fillRect(tx, ty, 16, 4);
    ctx.fillStyle = "#4A5870";
    ctx.fillRect(tx + 1, ty, 5, 3);
    ctx.fillRect(tx + 8, ty, 7, 3);
    ctx.fillStyle = "#748096";
    ctx.fillRect(tx + 2, ty, 3, 1);
    ctx.fillRect(tx + 10, ty, 3, 1);
  }
  if (exposedBottom) {
    ctx.fillStyle = "#101722";
    ctx.fillRect(tx, ty + 13, 16, 3);
    ctx.fillStyle = "#242F40";
    ctx.fillRect(tx + 2, ty + 12, 6, 4);
    ctx.fillRect(tx + 10, ty + 11, 5, 5);
  }
  if (exposedLeft) {
    ctx.fillStyle = "#101724";
    ctx.fillRect(tx, ty, 3, 16);
    ctx.fillStyle = "#59677D";
    ctx.fillRect(tx + 2, ty + 4, 1, 8);
  }
  if (exposedRight) {
    ctx.fillStyle = "#0E1521";
    ctx.fillRect(tx + 13, ty, 3, 16);
    ctx.fillStyle = "#303D50";
    ctx.fillRect(tx + 13, ty + 3, 1, 10);
  }

  // Occasional iron bars break up long masonry runs.
  if (Math.floor(hash) % 19 === 0 && exposedTop) {
    ctx.fillStyle = "#121922";
    ctx.fillRect(tx + 4, ty + 3, 8, 12);
    ctx.fillStyle = "#75828A";
    ctx.fillRect(tx + 5, ty + 4, 2, 10);
    ctx.fillRect(tx + 9, ty + 4, 2, 10);
    ctx.fillStyle = "#A8B0B1";
    ctx.fillRect(tx + 5, ty + 4, 1, 5);
  }
}

function drawSnowFloorTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  hash: number,
): void {
  const variant = Math.floor(hash) % 5;
  const bases = ["#86AABA", "#8EB1BF", "#82A6B7", "#91B3C0", "#89ADBC"] as const;
  ctx.fillStyle = bases[variant];
  ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

  // Broad wind-packed snow shelves replace the old bright speckled checkerboard.
  ctx.fillStyle = variant % 2 === 0 ? "#A7C2CB" : "#AEC7CE";
  if (variant === 0) {
    ctx.fillRect(tx + 1, ty + 1, 9, 4);
    ctx.fillRect(tx + 7, ty + 6, 7, 3);
  } else if (variant === 1) {
    ctx.fillRect(tx + 4, ty + 2, 10, 4);
    ctx.fillRect(tx + 1, ty + 11, 7, 3);
  } else if (variant === 2) {
    ctx.fillRect(tx + 1, ty + 5, 6, 5);
    ctx.fillRect(tx + 9, ty + 2, 6, 3);
  } else if (variant === 3) {
    ctx.fillRect(tx + 1, ty + 1, 5, 4);
    ctx.fillRect(tx + 6, ty + 8, 8, 4);
  } else {
    ctx.fillRect(tx + 3, ty + 2, 11, 3);
    ctx.fillRect(tx + 1, ty + 10, 5, 4);
  }

  // Blue ice breaks through only in a minority of tiles and follows stepped cracks.
  ctx.fillStyle = "#6D9FB5";
  if (variant === 0 || variant === 3) {
    ctx.fillRect(tx + 2, ty + 11, 9, 3);
    ctx.fillRect(tx + 9, ty + 9, 3, 5);
    ctx.fillStyle = "#A7D7E2";
    ctx.fillRect(tx + 3, ty + 11, 6, 1);
  } else if (variant === 2) {
    ctx.fillRect(tx + 9, ty + 8, 6, 4);
    ctx.fillRect(tx + 7, ty + 10, 4, 2);
    ctx.fillStyle = "#B5E1E8";
    ctx.fillRect(tx + 10, ty + 8, 4, 1);
  }

  if (Math.floor(hash) % 13 === 0) {
    // Paired boot prints establish scale and direction without noisy single pixels.
    ctx.fillStyle = "#789EAE";
    ctx.fillRect(tx + 4, ty + 4, 3, 5);
    ctx.fillRect(tx + 9, ty + 9, 3, 5);
    ctx.fillStyle = "#A9C8D2";
    ctx.fillRect(tx + 5, ty + 4, 1, 2);
    ctx.fillRect(tx + 10, ty + 9, 1, 2);
  } else if ((Math.floor(hash) + tx * 3 + ty * 5) % 43 === 0) {
    // A buried quarantine marker ties the glacier to the sampler faction.
    ctx.fillStyle = "#557F91";
    ctx.fillRect(tx + 4, ty + 6, 8, 5);
    ctx.fillStyle = "#BFD7DC";
    ctx.fillRect(tx + 5, ty + 7, 6, 3);
    ctx.fillStyle = "#C94C55";
    ctx.fillRect(tx + 7, ty + 7, 2, 3);
    ctx.fillRect(tx + 6, ty + 8, 4, 1);
  }
}

function drawSnowCrevasseTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  time: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const drift = Math.floor(time * 3 + tileX * 4 + tileY * 3) % 9;
  ctx.fillStyle = "#193B52";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#245976";
  ctx.fillRect(tx + 2, ty + 2, 12, 12);
  ctx.fillStyle = "#367A94";
  ctx.fillRect(tx + 3, ty + 5, 10, 7);
  ctx.fillStyle = "#75BDD0";
  ctx.fillRect(tx + 2 + drift, ty + 5, 4, 1);
  ctx.fillRect(tx + ((drift + 4) % 11), ty + 10, 4, 1);
  ctx.fillStyle = "#D8F6FA";
  ctx.fillRect(tx + ((drift + 2) % 13), ty + 4, 2, 1);

  // Snow shelves and fractured ice appear only on exposed crevasse edges.
  const openLeft = isTile(mapData, tileX - 1, tileY, 3);
  const openRight = isTile(mapData, tileX + 1, tileY, 3);
  const openUp = isTile(mapData, tileX, tileY - 1, 3);
  const openDown = isTile(mapData, tileX, tileY + 1, 3);
  ctx.fillStyle = "#6F9FB2";
  if (!openLeft) ctx.fillRect(tx, ty, 4, 16);
  if (!openRight) ctx.fillRect(tx + 12, ty, 4, 16);
  if (!openUp) ctx.fillRect(tx, ty, 16, 4);
  if (!openDown) ctx.fillRect(tx, ty + 12, 16, 4);
  ctx.fillStyle = "#CBE2E7";
  if (!openLeft) ctx.fillRect(tx + 2, ty + 2, 2, 12);
  if (!openRight) ctx.fillRect(tx + 12, ty + 2, 2, 12);
  if (!openUp) ctx.fillRect(tx + 2, ty + 2, 12, 2);
  if (!openDown) ctx.fillRect(tx + 2, ty + 12, 12, 2);
  ctx.fillStyle = "#F1FAFB";
  if (!openUp) ctx.fillRect(tx + 3, ty + 1, 9, 1);
  if (!openLeft) ctx.fillRect(tx + 1, ty + 4, 1, 8);
}

function drawSnowWallTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  hash: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const exposedTop = !isTile(mapData, tileX, tileY - 1, 1);
  const exposedBottom = !isTile(mapData, tileX, tileY + 1, 1);
  const exposedLeft = !isTile(mapData, tileX - 1, tileY, 1);
  const exposedRight = !isTile(mapData, tileX + 1, tileY, 1);

  ctx.fillStyle = "#365B70";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#4E788B";
  ctx.fillRect(tx + 1, ty + 1, 14, 14);
  ctx.fillStyle = "#6792A2";
  ctx.fillRect(tx + 2, ty + 2, 8, 6);
  ctx.fillRect(tx + 6, ty + 9, 8, 5);
  ctx.fillStyle = "#2D5064";
  ctx.fillRect(tx + 10, ty + 1, 2, 7);
  ctx.fillRect(tx + 3, ty + 8, 2, 7);
  ctx.fillRect(tx + 1, ty + 7, 14, 2);

  if (Math.floor(hash) % 4 === 0) {
    ctx.fillStyle = "#8BB4C1";
    ctx.fillRect(tx + 3, ty + 3, 5, 2);
    ctx.fillRect(tx + 8, ty + 5, 2, 4);
    ctx.fillRect(tx + 9, ty + 9, 4, 2);
  }
  if (Math.floor(hash) % 15 === 0) {
    ctx.fillStyle = "#BFEAF1";
    ctx.fillRect(tx + 7, ty + 9, 3, 5);
    ctx.fillStyle = "#EDFEFF";
    ctx.fillRect(tx + 8, ty + 9, 1, 3);
  }

  if (exposedTop) {
    ctx.fillStyle = "#DCECEF";
    ctx.fillRect(tx, ty, 16, 5);
    ctx.fillRect(tx + 2, ty + 4, 6, 2);
    ctx.fillRect(tx + 10, ty + 4, 4, 3);
    ctx.fillStyle = "#F5FBFC";
    ctx.fillRect(tx + 1, ty, 11, 2);
    ctx.fillRect(tx + 4, ty + 2, 9, 1);
    ctx.fillStyle = "#A8CFD8";
    if (Math.floor(hash) % 3 === 0) {
      ctx.fillRect(tx + 3, ty + 5, 2, 5);
      ctx.fillRect(tx + 11, ty + 5, 2, 3);
      ctx.fillStyle = "#E9FAFC";
      ctx.fillRect(tx + 3, ty + 5, 1, 3);
    }
  }
  if (exposedBottom) {
    ctx.fillStyle = "#27485B";
    ctx.fillRect(tx, ty + 13, 16, 3);
    ctx.fillStyle = "#416B7D";
    ctx.fillRect(tx + 2, ty + 12, 6, 4);
    ctx.fillRect(tx + 10, ty + 11, 5, 5);
  }
  if (exposedLeft) {
    ctx.fillStyle = "#294A5D";
    ctx.fillRect(tx, ty, 3, 16);
    ctx.fillStyle = "#80A8B6";
    ctx.fillRect(tx + 2, ty + 4, 1, 8);
  }
  if (exposedRight) {
    ctx.fillStyle = "#28485B";
    ctx.fillRect(tx + 13, ty, 3, 16);
    ctx.fillStyle = "#436F82";
    ctx.fillRect(tx + 13, ty + 3, 1, 10);
  }
}

function drawLavaFloorTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  hash: number,
): void {
  const variant = Math.floor(hash) % 5;
  const bases = ["#3A3039", "#40343D", "#362D36", "#433640", "#3C3039"] as const;
  ctx.fillStyle = bases[variant];
  ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

  // Broad basalt plates replace the legacy dotted checkerboard.
  ctx.fillStyle = variant % 2 === 0 ? "#4B3D48" : "#51404B";
  if (variant === 0) {
    ctx.fillRect(tx + 1, ty + 1, 10, 6);
    ctx.fillRect(tx + 7, ty + 9, 8, 5);
  } else if (variant === 1) {
    ctx.fillRect(tx + 2, ty + 2, 6, 12);
    ctx.fillRect(tx + 10, ty + 5, 5, 9);
  } else if (variant === 2) {
    ctx.fillRect(tx + 1, ty + 3, 13, 5);
    ctx.fillRect(tx + 4, ty + 10, 10, 4);
  } else if (variant === 3) {
    ctx.fillRect(tx + 3, ty + 1, 11, 6);
    ctx.fillRect(tx + 1, ty + 9, 8, 5);
  } else {
    ctx.fillRect(tx + 1, ty + 2, 7, 11);
    ctx.fillRect(tx + 9, ty + 1, 6, 7);
  }

  // Deep seams stay broad and stepped so the floor reads as cooled rock.
  ctx.fillStyle = "#251D27";
  if (variant === 0 || variant === 3) {
    ctx.fillRect(tx + 2, ty + 7, 11, 2);
    ctx.fillRect(tx + 11, ty + 8, 2, 6);
  } else if (variant === 1) {
    ctx.fillRect(tx + 8, ty + 2, 2, 12);
    ctx.fillRect(tx + 10, ty + 8, 5, 2);
  } else if (variant === 2) {
    ctx.fillRect(tx + 2, ty + 8, 6, 2);
    ctx.fillRect(tx + 7, ty + 8, 2, 6);
  }

  // Only a minority of seams retain heat; constant orange lines made enemies disappear.
  if (Math.floor(hash) % 9 === 0) {
    ctx.fillStyle = "#8E3427";
    ctx.fillRect(tx + 5, ty + 8, 2, 5);
    ctx.fillRect(tx + 6, ty + 12, 5, 2);
    ctx.fillStyle = "#E45B25";
    ctx.fillRect(tx + 6, ty + 9, 1, 3);
    ctx.fillRect(tx + 7, ty + 12, 3, 1);
  } else if (Math.floor(hash) % 17 === 0) {
    // Sparse forge rivets and slag chips imply an industrial volcanic complex.
    ctx.fillStyle = "#76636A";
    ctx.fillRect(tx + 4, ty + 4, 3, 3);
    ctx.fillRect(tx + 11, ty + 10, 2, 2);
    ctx.fillStyle = "#A55235";
    ctx.fillRect(tx + 5, ty + 5, 1, 1);
  }
}

function drawLavaFlowTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  time: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const drift = Math.floor(time * 5 + tileX * 3 + tileY * 5) % 10;
  ctx.fillStyle = "#6E2118";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#B63717";
  ctx.fillRect(tx + 1, ty + 2, 14, 12);
  ctx.fillStyle = "#E85218";
  ctx.fillRect(tx + 2, ty + 4, 12, 8);
  ctx.fillStyle = "#FF8A1D";
  ctx.fillRect(tx + ((drift + 1) % 9), ty + 5, 7, 2);
  ctx.fillRect(tx + ((drift + 6) % 11), ty + 10, 5, 2);
  ctx.fillStyle = "#FFE05C";
  ctx.fillRect(tx + ((drift + 3) % 12), ty + 5, 3, 1);
  ctx.fillRect(tx + ((drift + 8) % 13), ty + 10, 2, 1);

  const connectedLeft = isTile(mapData, tileX - 1, tileY, 3);
  const connectedRight = isTile(mapData, tileX + 1, tileY, 3);
  const connectedUp = isTile(mapData, tileX, tileY - 1, 3);
  const connectedDown = isTile(mapData, tileX, tileY + 1, 3);

  // Cooled slag lips appear only on exposed edges, joining lava cells into one river.
  ctx.fillStyle = "#2B222A";
  if (!connectedLeft) ctx.fillRect(tx, ty, 4, 16);
  if (!connectedRight) ctx.fillRect(tx + 12, ty, 4, 16);
  if (!connectedUp) ctx.fillRect(tx, ty, 16, 4);
  if (!connectedDown) ctx.fillRect(tx, ty + 12, 16, 4);
  ctx.fillStyle = "#51404A";
  if (!connectedLeft) ctx.fillRect(tx + 2, ty + 2, 2, 12);
  if (!connectedRight) ctx.fillRect(tx + 12, ty + 2, 2, 12);
  if (!connectedUp) ctx.fillRect(tx + 2, ty + 2, 12, 2);
  if (!connectedDown) ctx.fillRect(tx + 2, ty + 12, 12, 2);
  ctx.fillStyle = "#8A3426";
  if (!connectedUp) ctx.fillRect(tx + 4, ty + 3, 8, 1);
  if (!connectedLeft) ctx.fillRect(tx + 3, ty + 5, 1, 7);
}

function drawLavaWallTile(
  ctx: CanvasRenderingContext2D,
  mapData: number[],
  tileX: number,
  tileY: number,
  hash: number,
): void {
  const tx = tileX * TILE_SIZE;
  const ty = tileY * TILE_SIZE;
  const exposedTop = !isTile(mapData, tileX, tileY - 1, 1);
  const exposedBottom = !isTile(mapData, tileX, tileY + 1, 1);
  const exposedLeft = !isTile(mapData, tileX - 1, tileY, 1);
  const exposedRight = !isTile(mapData, tileX + 1, tileY, 1);

  ctx.fillStyle = "#211A22";
  ctx.fillRect(tx, ty, 16, 16);
  ctx.fillStyle = "#372B35";
  ctx.fillRect(tx + 1, ty + 1, 14, 14);
  ctx.fillStyle = "#4A3742";
  ctx.fillRect(tx + 2, ty + 2, 8, 6);
  ctx.fillRect(tx + 6, ty + 9, 8, 5);
  ctx.fillStyle = "#261E27";
  ctx.fillRect(tx + 10, ty + 1, 2, 7);
  ctx.fillRect(tx + 3, ty + 8, 2, 7);
  ctx.fillRect(tx + 1, ty + 7, 14, 2);

  if (Math.floor(hash) % 4 === 0) {
    ctx.fillStyle = "#66505B";
    ctx.fillRect(tx + 3, ty + 3, 5, 2);
    ctx.fillRect(tx + 8, ty + 5, 2, 4);
    ctx.fillRect(tx + 9, ty + 10, 4, 2);
  }
  if (Math.floor(hash) % 13 === 0) {
    ctx.fillStyle = "#8F3428";
    ctx.fillRect(tx + 7, ty + 8, 3, 6);
    ctx.fillStyle = "#E45A26";
    ctx.fillRect(tx + 8, ty + 9, 1, 4);
  }

  if (exposedTop) {
    ctx.fillStyle = "#151117";
    ctx.fillRect(tx, ty, 16, 4);
    ctx.fillStyle = "#4D3C46";
    ctx.fillRect(tx + 1, ty, 6, 3);
    ctx.fillRect(tx + 9, ty, 6, 3);
    ctx.fillStyle = "#78616A";
    ctx.fillRect(tx + 2, ty, 3, 1);
    ctx.fillRect(tx + 10, ty, 3, 1);
    if (Math.floor(hash) % 3 === 0) {
      // Clinker teeth make exposed tops feel heat-fractured, not snow-capped.
      ctx.fillStyle = "#2C2028";
      ctx.fillRect(tx + 4, ty + 3, 3, 5);
      ctx.fillRect(tx + 11, ty + 3, 2, 3);
      ctx.fillStyle = "#8C3929";
      ctx.fillRect(tx + 5, ty + 4, 1, 3);
    }
  }
  if (exposedBottom) {
    ctx.fillStyle = "#151116";
    ctx.fillRect(tx, ty + 13, 16, 3);
    ctx.fillStyle = "#30242D";
    ctx.fillRect(tx + 2, ty + 12, 6, 4);
    ctx.fillRect(tx + 10, ty + 11, 5, 5);
  }
  if (exposedLeft) {
    ctx.fillStyle = "#171219";
    ctx.fillRect(tx, ty, 3, 16);
    ctx.fillStyle = "#59434D";
    ctx.fillRect(tx + 2, ty + 4, 1, 8);
  }
  if (exposedRight) {
    ctx.fillStyle = "#161218";
    ctx.fillRect(tx + 13, ty, 3, 16);
    ctx.fillStyle = "#382A33";
    ctx.fillRect(tx + 13, ty + 3, 1, 10);
  }

  // Occasional iron clamps tie long basalt walls to the foundry theme.
  if (Math.floor(hash) % 19 === 0 && exposedTop) {
    ctx.fillStyle = "#1B171D";
    ctx.fillRect(tx + 4, ty + 3, 8, 12);
    ctx.fillStyle = "#6E7477";
    ctx.fillRect(tx + 5, ty + 4, 2, 10);
    ctx.fillRect(tx + 9, ty + 4, 2, 10);
    ctx.fillStyle = "#A1AAA7";
    ctx.fillRect(tx + 5, ty + 4, 1, 5);
  }
}

export class RoomRenderer {
  private particles: Particle[] = [];
  private windTime: number = 0;

  constructor() {
    this.spawnParticles(15);
  }

  private spawnParticles(count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * 320,
        y: Math.random() * 240,
        vx: -0.2 - Math.random() * 0.4,
        vy: 0.3 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        spin: 0.02 + Math.random() * 0.05,
      });
    }
  }

  public update(dt: number) {
    this.windTime += dt;
    for (const p of this.particles) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.angle += p.spin * dt * 60;
      if (p.x < -10 || p.y > 250) {
        p.x = 330;
        p.y = -10;
      }
    }
  }

  public drawBackground(ctx: CanvasRenderingContext2D, currentRoom: Room | undefined, theme: string) {
    const mapData = getMapData(currentRoom, theme);

    // 1. DRAW BASE FLOOR
    const p = PALETTES[theme] || PALETTES["forest"];
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, 320, 240);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tileId === 0 || tileId === 2) {
          const hash = tileHash(x, y);
          if (theme === "forest") {
            drawForestFloorTile(ctx, tx, ty, hash);
          } else if (theme === "dungeon") {
            drawDungeonFloorTile(ctx, tx, ty, hash);
          } else if (theme === "snow") {
            drawSnowFloorTile(ctx, tx, ty, hash);
          } else if (theme === "lava") {
            drawLavaFloorTile(ctx, tx, ty, hash);
          } else {
            ctx.fillStyle = p.floor;
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "rgba(0,0,0,0.1)";
            if (hash % 10 > 7) {
              ctx.fillRect(tx + 2, ty + 2, 2, 2);
              ctx.fillRect(tx + 10, ty + 8, 2, 2);
            } else if (hash % 10 > 4) {
              ctx.fillRect(tx + 4, ty + 12, 4, 2);
              ctx.fillRect(tx + 8, ty + 2, 2, 2);
            } else {
              ctx.fillRect(tx + 12, ty + 4, 2, 2);
              ctx.fillRect(tx + 2, ty + 10, 2, 4);
            }

            if (theme === "snow") {
              ctx.fillStyle = "rgba(255,255,255,0.55)";
              if (hash % 10 > 5) {
                ctx.fillRect(tx + 2, ty + 3, 5, 1);
                ctx.fillRect(tx + 11, ty + 10, 2, 2);
              }
              ctx.fillStyle = "rgba(89, 170, 220, 0.18)";
              if (hash % 13 > 9) {
                ctx.fillRect(tx + 7, ty + 5, 1, 7);
                ctx.fillRect(tx + 4, ty + 8, 7, 1);
              }
            } else if (theme === "lava") {
              ctx.fillStyle = "rgba(12, 8, 20, 0.42)";
              ctx.fillRect(tx + 2, ty + 7, 5, 1);
              ctx.fillRect(tx + 6, ty + 7, 1, 5);
              ctx.fillRect(tx + 6, ty + 11, 6, 1);
              if (hash % 12 > 8) {
                ctx.fillStyle = "rgba(255, 105, 36, 0.46)";
                ctx.fillRect(tx + 6, ty + 8, 1, 3);
                ctx.fillRect(tx + 8, ty + 11, 3, 1);
              }
            }

            ctx.fillStyle = "rgba(0,0,0,0.05)";
            ctx.fillRect(tx, ty + TILE_SIZE - 1, TILE_SIZE, 1);
            ctx.fillRect(tx + TILE_SIZE - 1, ty, 1, TILE_SIZE);
          }
        } else if (tileId === 3) {
          if (theme === "forest") {
            drawForestStreamTile(ctx, mapData, x, y, this.windTime);
          } else if (theme === "snow") {
            drawSnowCrevasseTile(ctx, mapData, x, y, this.windTime);
          } else if (theme === "dungeon") {
            drawDungeonAbyssTile(ctx, mapData, x, y, this.windTime);
          } else if (theme === "lava") {
            drawLavaFlowTile(ctx, mapData, x, y, this.windTime);
          }
        }
      }
    }

    // Room identity decals make special rooms readable without relying on the HUD.
    if (currentRoom?.type === "shop") {
      ctx.fillStyle = theme === "lava" ? "rgba(122, 45, 26, 0.65)" : "rgba(56, 41, 78, 0.58)";
      ctx.fillRect(112, 84, 96, 72);
      ctx.strokeStyle = "rgba(241, 196, 15, 0.68)";
      ctx.lineWidth = 2;
      ctx.strokeRect(116, 88, 88, 64);
      ctx.fillStyle = "rgba(241, 196, 15, 0.22)";
      for (let x = 124; x < 204; x += 16) ctx.fillRect(x, 92, 4, 56);
    } else if (currentRoom?.type === "boss") {
      if (theme === "forest") {
        // A root-ring altar gives the forest bosses a physical arena rather
        // than the same abstract square decal used by every chapter.
        ctx.fillStyle = "#33442F";
        ctx.fillRect(144, 84, 32, 4);
        ctx.fillRect(132, 88, 56, 8);
        ctx.fillRect(124, 96, 72, 48);
        ctx.fillRect(132, 144, 56, 8);
        ctx.fillRect(144, 152, 32, 4);
        ctx.fillStyle = "#536847";
        ctx.fillRect(144, 90, 32, 4);
        ctx.fillRect(134, 94, 52, 6);
        ctx.fillRect(130, 100, 60, 40);
        ctx.fillRect(136, 140, 48, 6);
        ctx.fillRect(146, 146, 28, 4);
        ctx.fillStyle = "#718259";
        ctx.fillRect(146, 99, 28, 4);
        ctx.fillRect(139, 103, 42, 6);
        ctx.fillRect(136, 109, 48, 22);
        ctx.fillRect(141, 131, 38, 6);
        ctx.fillRect(149, 137, 22, 4);
        ctx.fillStyle = "#33422F";
        ctx.fillRect(151, 111, 18, 18);
        ctx.fillStyle = "#42523A";
        ctx.fillRect(154, 114, 12, 12);
        // Root veins curve around the hollow center. Avoid a literal cross,
        // which visually merged with the guardian's exposed core.
        ctx.fillStyle = "#725136";
        ctx.fillRect(143, 108, 14, 4);
        ctx.fillRect(153, 104, 7, 8);
        ctx.fillRect(164, 105, 5, 13);
        ctx.fillRect(168, 114, 12, 4);
        ctx.fillRect(174, 118, 5, 12);
        ctx.fillRect(163, 132, 13, 4);
        ctx.fillRect(159, 128, 7, 8);
        ctx.fillRect(145, 127, 13, 4);
        ctx.fillRect(141, 117, 5, 13);
        ctx.fillStyle = "#A58151";
        ctx.fillRect(146, 109, 9, 1);
        ctx.fillRect(155, 106, 3, 5);
        ctx.fillRect(166, 108, 1, 8);
        ctx.fillRect(170, 115, 8, 1);
        ctx.fillRect(175, 120, 1, 8);
        ctx.fillRect(165, 133, 9, 1);
        ctx.fillRect(161, 130, 3, 5);
        ctx.fillRect(147, 128, 9, 1);
        ctx.fillRect(143, 119, 1, 9);

        const roots = [
          [160, 82, 4, 18], [178, 88, 18, 4], [190, 104, 4, 18], [180, 142, 16, 4],
          [158, 144, 4, 18], [124, 142, 18, 4], [126, 118, 4, 18], [124, 92, 18, 4],
        ] as const;
        ctx.fillStyle = "#4A3324";
        for (const [x, y, w, h] of roots) ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#6F4F32";
        ctx.fillRect(160, 84, 2, 14);
        ctx.fillRect(180, 90, 14, 2);
        ctx.fillRect(128, 94, 12, 2);
        ctx.fillRect(128, 120, 2, 14);

        ctx.fillStyle = "#6C9C53";
        for (const [x, y] of [[140, 91], [184, 102], [181, 143], [132, 134], [142, 150], [193, 128]] as const) {
          ctx.fillRect(x, y, 5, 3);
          ctx.fillRect(x + 2, y - 2, 3, 3);
        }
        ctx.fillStyle = "#E782A4";
        ctx.fillRect(137, 99, 3, 3);
        ctx.fillRect(185, 136, 3, 3);
        ctx.fillStyle = "#FFE47A";
        ctx.fillRect(138, 100, 1, 1);
        ctx.fillRect(186, 137, 1, 1);
      } else if (theme === "dungeon") {
        // A broken ossuary seal anchors the crypt bosses without reusing the
        // generic square arena decal from the other chapters.
        ctx.fillStyle = "#141C2A";
        ctx.fillRect(144, 82, 32, 4);
        ctx.fillRect(132, 86, 56, 6);
        ctx.fillRect(124, 92, 72, 12);
        ctx.fillRect(118, 104, 84, 32);
        ctx.fillRect(124, 136, 72, 12);
        ctx.fillRect(132, 148, 56, 6);
        ctx.fillRect(144, 154, 32, 4);
        ctx.fillStyle = "#273246";
        ctx.fillRect(145, 86, 30, 4);
        ctx.fillRect(134, 91, 52, 6);
        ctx.fillRect(128, 98, 64, 12);
        ctx.fillRect(124, 110, 72, 20);
        ctx.fillRect(128, 130, 64, 12);
        ctx.fillRect(136, 142, 48, 7);
        ctx.fillRect(148, 149, 24, 4);

        // The center is an offset burial well, not a literal cross.
        ctx.fillStyle = "#0E141E";
        ctx.fillRect(145, 103, 30, 4);
        ctx.fillRect(138, 107, 44, 8);
        ctx.fillRect(134, 115, 52, 14);
        ctx.fillRect(140, 129, 40, 8);
        ctx.fillRect(149, 137, 22, 5);
        ctx.fillStyle = "#1B1425";
        ctx.fillRect(149, 108, 22, 4);
        ctx.fillRect(142, 112, 36, 7);
        ctx.fillRect(139, 119, 42, 8);
        ctx.fillRect(145, 127, 30, 6);
        ctx.fillRect(153, 133, 14, 5);
        ctx.fillStyle = "#4B2A60";
        ctx.fillRect(151, 113, 18, 3);
        ctx.fillRect(146, 117, 28, 4);
        ctx.fillRect(143, 121, 34, 4);
        ctx.fillRect(149, 125, 22, 4);
        ctx.fillRect(155, 129, 10, 3);
        ctx.fillStyle = "#8D4FA9";
        ctx.fillRect(157, 116, 6, 2);
        ctx.fillRect(153, 120, 14, 2);
        ctx.fillRect(157, 124, 6, 2);

        // Sarcophagus fragments radiate around the seal at uneven angles.
        const coffins = [
          [151, 88, 18, 7], [181, 98, 8, 18], [183, 132, 7, 16], [153, 145, 16, 7],
          [130, 135, 8, 16], [126, 104, 7, 17],
        ] as const;
        for (const [x, y, w, h] of coffins) {
          ctx.fillStyle = "#192333";
          ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
          ctx.fillStyle = "#465267";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#687582";
          if (w > h) ctx.fillRect(x + 2, y + 1, w - 4, 2);
          else ctx.fillRect(x + 1, y + 2, 2, h - 4);
        }

        // Broken chains arc around the burial well and leave its center open.
        const chainLinks = [
          [140, 100, 6, 3], [134, 106, 3, 6], [132, 128, 6, 3], [139, 139, 6, 3],
          [175, 99, 6, 3], [184, 112, 3, 6], [180, 136, 6, 3], [173, 142, 6, 3],
        ] as const;
        for (const [x, y, w, h] of chainLinks) {
          ctx.fillStyle = "#111820";
          ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
          ctx.fillStyle = "#69777F";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#3B4650";
          ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
        }

        // Bone piles and candles make the space read as an ossuary altar.
        ctx.fillStyle = "#A8B0AC";
        for (const [x, y] of [[123, 99], [193, 123], [126, 145], [188, 151], [143, 154]] as const) {
          ctx.fillRect(x, y, 7, 2);
          ctx.fillRect(x + 1, y - 1, 2, 4);
          ctx.fillRect(x + 5, y - 1, 2, 4);
        }
        for (const [x, y] of [[138, 96], [190, 106], [180, 151], [129, 132]] as const) {
          ctx.fillStyle = "#B7A989";
          ctx.fillRect(x, y, 3, 6);
          ctx.fillStyle = "#7F459F";
          ctx.fillRect(x, y - 2, 3, 3);
          ctx.fillStyle = "#C69BDA";
          ctx.fillRect(x + 1, y - 3, 1, 2);
        }
      } else if (theme === "snow") {
        // A ruptured glacier containment seal anchors both the titan and the
        // sampler faction without competing with their pale silhouettes.
        ctx.fillStyle = "#355C70";
        ctx.fillRect(146, 82, 28, 4);
        ctx.fillRect(132, 86, 56, 6);
        ctx.fillRect(124, 92, 72, 12);
        ctx.fillRect(118, 104, 84, 32);
        ctx.fillRect(124, 136, 72, 12);
        ctx.fillRect(134, 148, 52, 6);
        ctx.fillRect(148, 154, 24, 4);
        ctx.fillStyle = "#7198A8";
        ctx.fillRect(147, 86, 26, 4);
        ctx.fillRect(135, 91, 50, 6);
        ctx.fillRect(129, 98, 62, 12);
        ctx.fillRect(124, 110, 72, 20);
        ctx.fillRect(130, 130, 60, 12);
        ctx.fillRect(138, 142, 44, 7);
        ctx.fillStyle = "#BCD5DB";
        ctx.fillRect(145, 92, 30, 3);
        ctx.fillRect(132, 102, 56, 4);
        ctx.fillRect(127, 112, 66, 5);
        ctx.fillRect(133, 135, 54, 4);

        // Offset frozen chamber keeps the center readable beneath a large boss.
        ctx.fillStyle = "#23485E";
        ctx.fillRect(146, 104, 30, 4);
        ctx.fillRect(139, 108, 44, 8);
        ctx.fillRect(135, 116, 52, 14);
        ctx.fillRect(141, 130, 40, 8);
        ctx.fillRect(150, 138, 22, 5);
        ctx.fillStyle = "#36728A";
        ctx.fillRect(150, 109, 22, 4);
        ctx.fillRect(143, 113, 36, 7);
        ctx.fillRect(140, 120, 42, 8);
        ctx.fillRect(146, 128, 30, 6);
        ctx.fillRect(154, 134, 14, 5);
        ctx.fillStyle = "#75BDD0";
        ctx.fillRect(153, 114, 16, 3);
        ctx.fillRect(148, 118, 26, 4);
        ctx.fillRect(145, 122, 32, 4);
        ctx.fillRect(151, 126, 20, 4);
        ctx.fillStyle = "#D9F6F9";
        ctx.fillRect(157, 116, 7, 2);
        ctx.fillRect(153, 120, 14, 2);

        // Broken quarantine bands and sample canisters ring the seal.
        ctx.fillStyle = "#B8CED3";
        for (const [x, y, w, h] of [[150, 88, 20, 6], [183, 101, 7, 17], [180, 137, 8, 14], [151, 145, 18, 6], [129, 134, 7, 15], [126, 105, 7, 16]] as const) {
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#547B8B";
          if (w > h) ctx.fillRect(x + 2, y + 2, w - 4, 2);
          else ctx.fillRect(x + 2, y + 2, 2, h - 4);
          ctx.fillStyle = "#B8CED3";
        }
        for (const [x, y] of [[137, 99], [190, 119], [176, 151], [128, 128]] as const) {
          ctx.fillStyle = "#294B5C";
          ctx.fillRect(x - 1, y - 1, 8, 12);
          ctx.fillStyle = "#DDE8E9";
          ctx.fillRect(x, y, 6, 10);
          ctx.fillStyle = "#4AB2C1";
          ctx.fillRect(x + 1, y + 4, 4, 5);
          ctx.fillStyle = "#C94C55";
          ctx.fillRect(x + 2, y + 1, 2, 3);
        }

        // Jagged ice fractures radiate out, avoiding a generic cross-shaped rune.
        ctx.fillStyle = "#D9F2F5";
        ctx.fillRect(142, 109, 9, 2);
        ctx.fillRect(139, 106, 4, 5);
        ctx.fillRect(171, 110, 9, 2);
        ctx.fillRect(179, 108, 3, 6);
        ctx.fillRect(141, 132, 10, 2);
        ctx.fillRect(138, 134, 4, 5);
        ctx.fillRect(171, 133, 9, 2);
        ctx.fillRect(179, 135, 3, 5);
      } else if (theme === "lava") {
        // A ruptured foundry crucible anchors both the inferno reactor and the
        // vat-horse production line without hiding their dark silhouettes.
        ctx.fillStyle = "#20181F";
        ctx.fillRect(146, 82, 28, 4);
        ctx.fillRect(132, 86, 56, 6);
        ctx.fillRect(124, 92, 72, 12);
        ctx.fillRect(118, 104, 84, 32);
        ctx.fillRect(124, 136, 72, 12);
        ctx.fillRect(134, 148, 52, 6);
        ctx.fillRect(148, 154, 24, 4);
        ctx.fillStyle = "#483640";
        ctx.fillRect(147, 86, 26, 4);
        ctx.fillRect(135, 91, 50, 6);
        ctx.fillRect(129, 98, 62, 12);
        ctx.fillRect(124, 110, 72, 20);
        ctx.fillRect(130, 130, 60, 12);
        ctx.fillRect(138, 142, 44, 7);
        ctx.fillStyle = "#706069";
        ctx.fillRect(145, 92, 30, 3);
        ctx.fillRect(132, 102, 56, 4);
        ctx.fillRect(127, 112, 66, 5);
        ctx.fillRect(133, 135, 54, 4);

        // Offset crucible well keeps the center readable under either large boss.
        ctx.fillStyle = "#3E1918";
        ctx.fillRect(146, 104, 30, 4);
        ctx.fillRect(139, 108, 44, 8);
        ctx.fillRect(135, 116, 52, 14);
        ctx.fillRect(141, 130, 40, 8);
        ctx.fillRect(150, 138, 22, 5);
        ctx.fillStyle = "#7C241A";
        ctx.fillRect(150, 109, 22, 4);
        ctx.fillRect(143, 113, 36, 7);
        ctx.fillRect(140, 120, 42, 8);
        ctx.fillRect(146, 128, 30, 6);
        ctx.fillRect(154, 134, 14, 5);
        ctx.fillStyle = "#D84217";
        ctx.fillRect(153, 114, 16, 3);
        ctx.fillRect(148, 118, 26, 4);
        ctx.fillRect(145, 122, 32, 4);
        ctx.fillRect(151, 126, 20, 4);
        ctx.fillStyle = "#FF8A1E";
        ctx.fillRect(157, 116, 7, 2);
        ctx.fillRect(153, 120, 14, 2);
        ctx.fillStyle = "#FFE268";
        ctx.fillRect(159, 116, 3, 1);

        // Broken smelting rails and vat terminals ring the crucible.
        for (const [x, y, w, h] of [[150, 88, 20, 6], [183, 101, 7, 17], [180, 137, 8, 14], [151, 145, 18, 6], [129, 134, 7, 15], [126, 105, 7, 16]] as const) {
          ctx.fillStyle = "#171318";
          ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
          ctx.fillStyle = "#5A5960";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#929899";
          if (w > h) ctx.fillRect(x + 2, y + 2, w - 4, 2);
          else ctx.fillRect(x + 2, y + 2, 2, h - 4);
        }
        for (const [x, y, code] of [[137, 99, false], [190, 119, true], [176, 151, false], [128, 128, true]] as const) {
          ctx.fillStyle = "#171318";
          ctx.fillRect(x - 1, y - 1, 8, 12);
          ctx.fillStyle = "#4A5558";
          ctx.fillRect(x, y, 6, 10);
          ctx.fillStyle = code ? "#2ECC71" : "#D84B1F";
          ctx.fillRect(x + 1, y + 4, 4, 5);
          ctx.fillStyle = code ? "#A2FF9D" : "#FFB52C";
          ctx.fillRect(x + 2, y + 5, 2, 2);
        }

        // Jagged heat fractures radiate around, avoiding a generic cross rune.
        ctx.fillStyle = "#9E3320";
        ctx.fillRect(142, 109, 9, 2);
        ctx.fillRect(139, 106, 4, 5);
        ctx.fillRect(171, 110, 9, 2);
        ctx.fillRect(179, 108, 3, 6);
        ctx.fillRect(141, 132, 10, 2);
        ctx.fillRect(138, 134, 4, 5);
        ctx.fillRect(171, 133, 9, 2);
        ctx.fillRect(179, 135, 3, 5);
        ctx.fillStyle = "#F06421";
        ctx.fillRect(143, 109, 5, 1);
        ctx.fillRect(172, 110, 5, 1);
        ctx.fillRect(142, 132, 6, 1);
      } else {
        const accent = "rgba(174, 96, 255, 0.22)";
        ctx.fillStyle = accent;
        const outer = [
          [160, 78], [176, 82], [190, 90], [198, 104], [202, 120], [198, 136], [190, 150], [176, 158],
          [160, 162], [144, 158], [130, 150], [122, 136], [118, 120], [122, 104], [130, 90], [144, 82],
        ] as const;
        outer.forEach(([x, y], index) => ctx.fillRect(x - (index % 2 ? 2 : 3), y - 2, index % 2 ? 4 : 6, 4));
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(132, 92, 56, 56);
        ctx.lineWidth = 1;
        ctx.strokeRect(140, 100, 40, 40);
        ctx.fillRect(156, 116, 8, 8);
      }
    } else if (currentRoom?.type === "npc") {
      ctx.fillStyle = "rgba(155, 89, 182, 0.15)";
      ctx.fillRect(128, 88, 64, 64);
      ctx.strokeStyle = "rgba(217, 128, 250, 0.5)";
      ctx.strokeRect(132, 92, 56, 56);
      for (let x = 140; x <= 180; x += 8) {
        ctx.fillStyle = x % 16 === 0 ? "rgba(0,242,254,0.25)" : "rgba(241,196,15,0.2)";
        ctx.fillRect(x, 98, 4, 44);
      }
    } else if (currentRoom?.type === "wish_fountain") {
      ctx.fillStyle = "rgba(142, 68, 173, 0.18)";
      ctx.fillRect(112, 80, 96, 80);
      ctx.strokeStyle = "rgba(210, 180, 222, 0.62)";
      ctx.strokeRect(120, 88, 80, 64);
      ctx.strokeRect(136, 100, 48, 40);
      ctx.fillStyle = "rgba(88, 211, 247, 0.16)";
      ctx.fillRect(136, 112, 48, 20);
    } else if (currentRoom?.type === "photo_booth") {
      ctx.fillStyle = "rgba(142, 68, 173, 0.18)";
      ctx.fillRect(112, 80, 96, 80);
      ctx.strokeStyle = "rgba(217, 128, 250, 0.58)";
      ctx.strokeRect(120, 88, 80, 64);
      ctx.fillStyle = "rgba(240, 108, 168, 0.16)";
      for (let x = 124; x <= 196; x += 12) ctx.fillRect(x, 92, 5, 56);
    } else if (currentRoom?.type === "treasure") {
      ctx.strokeStyle = "rgba(241, 196, 15, 0.3)";
      ctx.strokeRect(136, 96, 48, 48);
      ctx.strokeRect(142, 102, 36, 36);
    } else if (currentRoom?.type === "start") {
      ctx.strokeStyle = "rgba(0, 242, 254, 0.22)";
      ctx.beginPath();
      ctx.moveTo(160, 101); ctx.lineTo(178, 120); ctx.lineTo(160, 139); ctx.lineTo(142, 120); ctx.closePath();
      ctx.stroke();
    }

    // Chapter materials continue across mandatory hazard crossings.
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tileIdY10 = mapData[10 * MAP_WIDTH + x];
      if (tileIdY10 === 3 && (x === 9 || x === 10)) {
        const tx = x * TILE_SIZE;
        const ty = 10 * TILE_SIZE;
        if (theme === "snow") {
          ctx.fillStyle = "#294A5B";
          ctx.fillRect(tx, ty - 1, TILE_SIZE, TILE_SIZE + 2);
          ctx.fillStyle = "#6D919E";
          ctx.fillRect(tx + 1, ty, TILE_SIZE - 2, TILE_SIZE);
          ctx.fillStyle = "#BBD4D9";
          ctx.fillRect(tx + 2, ty + 1, TILE_SIZE - 4, 4);
          ctx.fillStyle = "#3A6172";
          ctx.fillRect(tx + 3, ty, 2, TILE_SIZE);
          ctx.fillRect(tx + 11, ty, 2, TILE_SIZE);
          ctx.fillStyle = "#DFF1F3";
          ctx.fillRect(tx + 5, ty + 2, 5, 1);
        } else if (theme === "lava") {
          // Riveted iron grating spans molten channels without looking like a wooden bridge.
          ctx.fillStyle = "#171319";
          ctx.fillRect(tx, ty - 1, TILE_SIZE, TILE_SIZE + 2);
          ctx.fillStyle = "#4C4F55";
          ctx.fillRect(tx + 1, ty, TILE_SIZE - 2, TILE_SIZE);
          ctx.fillStyle = "#777E7F";
          ctx.fillRect(tx + 2, ty + 1, TILE_SIZE - 4, 3);
          ctx.fillRect(tx + 2, ty + 12, TILE_SIZE - 4, 2);
          ctx.fillStyle = "#242027";
          ctx.fillRect(tx + 4, ty, 2, TILE_SIZE);
          ctx.fillRect(tx + 10, ty, 2, TILE_SIZE);
          for (let bridgeY = ty + 5; bridgeY < ty + 12; bridgeY += 4) {
            ctx.fillRect(tx + 2, bridgeY, TILE_SIZE - 4, 2);
          }
          ctx.fillStyle = "#B4482F";
          ctx.fillRect(tx + 2, ty + 2, 2, 2);
          ctx.fillRect(tx + 12, ty + 12, 2, 2);
        } else {
          ctx.fillStyle = "#8B5A2B";
          ctx.fillRect(tx, ty - 1, TILE_SIZE, TILE_SIZE + 2);
          ctx.fillStyle = "#CD853F";
          ctx.fillRect(tx + 1, ty, TILE_SIZE - 2, TILE_SIZE);
          ctx.fillStyle = "#5C3815";
          ctx.fillRect(tx + 3, ty, 1, TILE_SIZE);
          ctx.fillRect(tx + 11, ty, 1, TILE_SIZE);
        }
      }
    }
  }

  public drawForeground(ctx: CanvasRenderingContext2D, currentRoom: Room | undefined, theme: string, isLocked: boolean = false) {
    const mapData = getMapData(currentRoom, theme);
    const p = PALETTES[theme] || PALETTES["forest"];

    // 2. DRAW SHADOWS
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE + 8;
        const ty = y * TILE_SIZE + 14;
        if (tileId === 1) {
          ctx.fillRect(tx - 9, ty, 18, 5);
          ctx.fillRect(tx - 6, ty + 5, 12, 2);
        } else if (tileId === 4) {
          ctx.fillRect(tx - 6, ty - 1, 12, 4);
          ctx.fillRect(tx - 3, ty + 3, 6, 2);
        }
      }
    }

    // 3. DRAW ENVIRONMENT & OBJECTS
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tileId === 1) {
          const hash = tileHash(x, y);
          if (theme === "forest") {
            drawForestWallTile(ctx, mapData, x, y, hash);
          } else if (theme === "dungeon") {
            drawDungeonWallTile(ctx, mapData, x, y, hash);
          } else if (theme === "snow") {
            drawSnowWallTile(ctx, mapData, x, y, hash);
          } else if (theme === "lava") {
            drawLavaWallTile(ctx, mapData, x, y, hash);
          } else {
            ctx.fillStyle = p.wall;
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fillRect(tx, ty, TILE_SIZE, 2);
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(tx, ty + TILE_SIZE - 2, TILE_SIZE, 2);
            ctx.fillRect(tx + TILE_SIZE - 2, ty, 2, TILE_SIZE);

            if (theme === "snow") {
              ctx.fillStyle = "#FFF";
              ctx.fillRect(tx, ty, TILE_SIZE, 4);
              if (hash % 10 > 5) {
                ctx.fillRect(tx + 4, ty + 4, 2, 4);
                ctx.fillRect(tx + 10, ty + 4, 2, 2);
              }
            } else if (theme === "lava") {
              ctx.fillStyle = "rgba(0,0,0,0.5)";
              if (hash % 10 > 5) {
                ctx.fillRect(tx + 4, ty, 2, 12);
                ctx.fillRect(tx + 6, ty + 6, 4, 2);
              } else {
                ctx.fillRect(tx + 8, ty, 2, 8);
                ctx.fillStyle = p.hazard1;
                ctx.fillRect(tx + 8, ty + 8, 2, 4);
              }
            }
          }
        } else if (tileId === 4) {
          if (theme === "forest") {
            // A small carved spirit lantern replaces the generic metal post.
            ctx.fillStyle = "#17271F";
            ctx.fillRect(tx + 4, ty + 5, 9, 11);
            ctx.fillStyle = "#5B402B";
            ctx.fillRect(tx + 5, ty + 6, 7, 10);
            ctx.fillStyle = "#7C5B36";
            ctx.fillRect(tx + 6, ty + 7, 5, 7);
            ctx.fillStyle = "#243D2B";
            ctx.fillRect(tx + 3, ty + 3, 11, 4);
            ctx.fillStyle = "#4E8044";
            ctx.fillRect(tx + 4, ty + 2, 5, 3);
            ctx.fillRect(tx + 9, ty + 3, 4, 3);
            ctx.fillStyle = "#FFE27A";
            ctx.fillRect(tx + 7, ty + 8, 3, 4);
            ctx.fillStyle = "#FFF3A6";
            ctx.fillRect(tx + 8, ty + 8, 1, 2);
          } else if (theme === "dungeon") {
            // Iron reliquary brazier with a contained violet soul flame.
            ctx.fillStyle = "#111824";
            ctx.fillRect(tx + 3, ty + 4, 11, 12);
            ctx.fillStyle = "#3C4856";
            ctx.fillRect(tx + 4, ty + 5, 9, 10);
            ctx.fillStyle = "#73808A";
            ctx.fillRect(tx + 5, ty + 6, 2, 8);
            ctx.fillRect(tx + 10, ty + 6, 2, 8);
            ctx.fillStyle = "#151B24";
            ctx.fillRect(tx + 3, ty + 8, 11, 2);
            ctx.fillRect(tx + 6, ty + 4, 1, 11);
            ctx.fillRect(tx + 10, ty + 4, 1, 11);
            ctx.fillStyle = "#2A1739";
            ctx.fillRect(tx + 6, ty + 8, 5, 6);
            ctx.fillStyle = "#A55BD0";
            ctx.fillRect(tx + 7, ty + 7, 3, 6);
            ctx.fillStyle = "#E2B5F5";
            ctx.fillRect(tx + 8, ty + 6, 2, 4);
            ctx.fillStyle = "#0D141E";
            ctx.fillRect(tx + 2, ty + 2, 13, 3);
            ctx.fillStyle = "#66737D";
            ctx.fillRect(tx + 4, ty + 3, 9, 1);
          } else if (theme === "snow") {
            // Survey beacon: a steel tripod cages a cold cyan signal core.
            ctx.fillStyle = "#29495A";
            ctx.fillRect(tx + 4, ty + 4, 9, 12);
            ctx.fillStyle = "#617F8B";
            ctx.fillRect(tx + 5, ty + 5, 7, 10);
            ctx.fillStyle = "#A8C5CC";
            ctx.fillRect(tx + 6, ty + 6, 2, 8);
            ctx.fillRect(tx + 10, ty + 6, 2, 8);
            ctx.fillStyle = "#203C4B";
            ctx.fillRect(tx + 3, ty + 3, 11, 3);
            ctx.fillRect(tx + 6, ty + 4, 1, 11);
            ctx.fillRect(tx + 10, ty + 4, 1, 11);
            ctx.fillStyle = "#3E8194";
            ctx.fillRect(tx + 7, ty + 7, 4, 6);
            ctx.fillStyle = "#8DE9F4";
            ctx.fillRect(tx + 8, ty + 6, 3, 6);
            ctx.fillStyle = "#E4FFFF";
            ctx.fillRect(tx + 9, ty + 6, 1, 3);
            ctx.fillStyle = "#D9E9EC";
            ctx.fillRect(tx + 4, ty + 2, 9, 2);
            ctx.fillRect(tx + 6, ty + 1, 5, 2);
          } else if (theme === "lava") {
            // Pressure vent: an iron cage contains a pulsing furnace core.
            ctx.fillStyle = "#171219";
            ctx.fillRect(tx + 3, ty + 4, 11, 12);
            ctx.fillStyle = "#4A3C42";
            ctx.fillRect(tx + 4, ty + 5, 9, 10);
            ctx.fillStyle = "#757C7D";
            ctx.fillRect(tx + 5, ty + 6, 2, 8);
            ctx.fillRect(tx + 10, ty + 6, 2, 8);
            ctx.fillStyle = "#21181E";
            ctx.fillRect(tx + 3, ty + 8, 11, 2);
            ctx.fillRect(tx + 6, ty + 4, 1, 11);
            ctx.fillRect(tx + 10, ty + 4, 1, 11);
            ctx.fillStyle = "#6E251D";
            ctx.fillRect(tx + 6, ty + 8, 5, 6);
            ctx.fillStyle = "#E34E1E";
            ctx.fillRect(tx + 7, ty + 7, 3, 6);
            ctx.fillStyle = "#FFB52D";
            ctx.fillRect(tx + 8, ty + 6, 2, 5);
            ctx.fillStyle = "#FFE66C";
            ctx.fillRect(tx + 9, ty + 6, 1, 3);
            ctx.fillStyle = "#111016";
            ctx.fillRect(tx + 2, ty + 2, 13, 3);
            ctx.fillStyle = "#646B6D";
            ctx.fillRect(tx + 4, ty + 3, 9, 1);
          } else {
            ctx.fillStyle = "#7F8C8D";
            ctx.fillRect(tx + 5, ty + 6, 6, 10);
            ctx.fillStyle = "#95A5A6";
            ctx.fillRect(tx + 3, ty + 3, 10, 3);
            ctx.fillStyle = "#34495E";
            ctx.fillRect(tx + 2, ty + 1, 12, 2);
            ctx.fillStyle = "#F1C40F";
            ctx.fillRect(tx + 7, ty + 4, 2, 2);
          }
        }
      }
    }

    if (theme === "forest" && currentRoom?.type === "start") {
      // The chapter entrance is a living root gate instead of a universal red torii.
      ctx.fillStyle = "#273B2C";
      ctx.fillRect(139, 14, 8, 35);
      ctx.fillRect(174, 14, 8, 35);
      ctx.fillRect(137, 12, 47, 8);
      ctx.fillStyle = "#5E432D";
      ctx.fillRect(141, 15, 5, 33);
      ctx.fillRect(175, 15, 5, 33);
      ctx.fillRect(139, 14, 43, 5);
      ctx.fillStyle = "#769653";
      ctx.fillRect(135, 10, 14, 6);
      ctx.fillRect(171, 9, 15, 7);
      ctx.fillRect(150, 11, 22, 4);
      ctx.fillStyle = "#E783A5";
      ctx.fillRect(145, 12, 3, 3);
      ctx.fillRect(178, 11, 3, 3);
    } else if (theme === "dungeon" && currentRoom?.type === "start") {
      // Dungeon alone keeps the prison vocabulary: a pointed ossuary arch,
      // descending portcullis, hanging chain and soul-lock keystone.
      ctx.fillStyle = "#0D131D";
      ctx.fillRect(136, 15, 10, 37);
      ctx.fillRect(174, 15, 10, 37);
      ctx.fillRect(140, 10, 40, 8);
      ctx.fillRect(145, 7, 30, 5);
      ctx.fillRect(151, 4, 18, 4);
      ctx.fillStyle = "#354258";
      ctx.fillRect(139, 16, 6, 35);
      ctx.fillRect(175, 16, 6, 35);
      ctx.fillRect(143, 11, 34, 5);
      ctx.fillRect(149, 8, 22, 4);
      ctx.fillRect(155, 5, 10, 3);
      ctx.fillStyle = "#718095";
      ctx.fillRect(140, 17, 2, 27);
      ctx.fillRect(178, 17, 2, 27);
      ctx.fillRect(146, 12, 28, 2);
      ctx.fillStyle = "#151D28";
      for (const x of [149, 156, 163, 170]) {
        ctx.fillRect(x, 17, 3, 32);
        ctx.fillRect(x - 1, 46, 5, 3);
      }
      ctx.fillRect(146, 31, 28, 3);
      ctx.fillStyle = "#75828C";
      for (const x of [150, 157, 164, 171]) ctx.fillRect(x, 18, 1, 27);
      ctx.fillRect(148, 32, 24, 1);
      // Offset chain links avoid a generic symmetrical cage silhouette.
      ctx.fillStyle = "#0E151E";
      ctx.fillRect(145, 20, 7, 4);
      ctx.fillRect(150, 23, 4, 7);
      ctx.fillRect(168, 18, 7, 4);
      ctx.fillRect(166, 21, 4, 7);
      ctx.fillStyle = "#7B8993";
      ctx.fillRect(147, 21, 3, 1);
      ctx.fillRect(169, 19, 3, 1);
      ctx.fillStyle = "#1B1326";
      ctx.fillRect(155, 24, 11, 11);
      ctx.fillStyle = "#A25DCC";
      ctx.fillRect(157, 26, 7, 7);
      ctx.fillStyle = "#E1B6F4";
      ctx.fillRect(160, 27, 2, 4);
    } else if (theme === "snow" && currentRoom?.type === "start") {
      // A sealed hexagonal research airlock replaces every trace of a barred
      // prison gate. Two insulated slabs meet at a lit quarantine seam.
      ctx.fillStyle = "#1B394A";
      ctx.fillRect(134, 17, 12, 34);
      ctx.fillRect(174, 17, 12, 34);
      ctx.fillRect(139, 10, 42, 10);
      ctx.fillRect(146, 6, 28, 6);
      ctx.fillStyle = "#5D8392";
      ctx.fillRect(137, 18, 8, 32);
      ctx.fillRect(175, 18, 8, 32);
      ctx.fillRect(141, 11, 38, 7);
      ctx.fillRect(149, 7, 22, 5);
      ctx.fillStyle = "#D6E8EB";
      ctx.fillRect(136, 16, 10, 5);
      ctx.fillRect(174, 16, 11, 5);
      ctx.fillRect(142, 9, 36, 4);
      ctx.fillRect(149, 5, 22, 3);
      ctx.fillStyle = "#274B5A";
      // Left and right pressure-door slabs, stepped into an octagonal opening.
      ctx.fillRect(146, 17, 13, 33);
      ctx.fillRect(161, 17, 13, 33);
      ctx.fillRect(143, 22, 16, 23);
      ctx.fillRect(161, 22, 16, 23);
      ctx.fillStyle = "#6F9EAA";
      ctx.fillRect(147, 19, 10, 28);
      ctx.fillRect(163, 19, 10, 28);
      ctx.fillStyle = "#A9CED5";
      ctx.fillRect(148, 20, 2, 25);
      ctx.fillRect(170, 20, 2, 25);
      ctx.fillStyle = "#173643";
      ctx.fillRect(158, 18, 4, 31);
      ctx.fillStyle = "#54BBC9";
      ctx.fillRect(159, 20, 2, 27);
      // Diagonal structural braces and frost wedges break the rectangular mass.
      ctx.fillStyle = "#365F6F";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(149 + i * 2, 24 + i * 4, 4, 3);
        ctx.fillRect(168 - i * 2, 24 + i * 4, 4, 3);
      }
      ctx.fillStyle = "#EFFBFC";
      ctx.fillRect(144, 14, 8, 2);
      ctx.fillRect(169, 13, 8, 2);
      ctx.fillRect(152, 10, 16, 2);
      ctx.fillStyle = "#C94C55";
      ctx.fillRect(140, 25, 4, 4);
      ctx.fillRect(176, 25, 4, 4);
      ctx.fillStyle = "#FFD16A";
      ctx.fillRect(141, 26, 2, 2);
      ctx.fillRect(177, 26, 2, 2);
      ctx.fillStyle = "#D8FFFF";
      ctx.fillRect(159, 28, 2, 7);
      // Pressure handles remain legible at native room scale.
      ctx.fillStyle = "#173643";
      ctx.fillRect(153, 31, 3, 7);
      ctx.fillRect(165, 31, 3, 7);
      ctx.fillStyle = "#A9CED5";
      ctx.fillRect(154, 32, 1, 5);
      ctx.fillRect(166, 32, 1, 5);
    } else if (theme === "lava" && currentRoom?.type === "start") {
      // An octagonal furnace iris and side pistons establish the foundry. The
      // silhouette is radial and solid, never another set of prison bars.
      ctx.fillStyle = "#120E13";
      ctx.fillRect(133, 18, 13, 33);
      ctx.fillRect(174, 18, 13, 33);
      ctx.fillRect(139, 10, 42, 10);
      ctx.fillRect(146, 6, 28, 6);
      ctx.fillStyle = "#493740";
      ctx.fillRect(136, 19, 9, 31);
      ctx.fillRect(175, 19, 9, 31);
      ctx.fillRect(142, 11, 36, 7);
      ctx.fillRect(149, 7, 22, 5);
      ctx.fillStyle = "#767D7F";
      ctx.fillRect(138, 21, 3, 25);
      ctx.fillRect(179, 21, 3, 25);
      ctx.fillRect(145, 12, 30, 2);
      // Octagonal outer furnace ring.
      ctx.fillStyle = "#21181E";
      ctx.fillRect(146, 17, 28, 34);
      ctx.fillRect(142, 22, 36, 24);
      ctx.fillStyle = "#5C454C";
      ctx.fillRect(148, 19, 24, 30);
      ctx.fillRect(144, 24, 32, 20);
      ctx.fillStyle = "#2B2026";
      ctx.fillRect(151, 21, 18, 26);
      ctx.fillRect(147, 26, 26, 16);
      // Six overlapping iris blades point toward the furnace eye.
      ctx.fillStyle = "#8A3B2B";
      ctx.fillRect(150, 23, 9, 7);
      ctx.fillRect(161, 23, 9, 7);
      ctx.fillRect(148, 30, 10, 7);
      ctx.fillRect(162, 30, 10, 7);
      ctx.fillRect(151, 37, 9, 7);
      ctx.fillRect(160, 37, 9, 7);
      ctx.fillStyle = "#B74A2D";
      ctx.fillRect(152, 24, 5, 2);
      ctx.fillRect(163, 24, 5, 2);
      ctx.fillRect(150, 32, 5, 2);
      ctx.fillRect(165, 32, 5, 2);
      ctx.fillRect(153, 40, 5, 2);
      ctx.fillRect(162, 40, 5, 2);
      ctx.fillStyle = "#5A211C";
      ctx.fillRect(155, 27, 11, 13);
      ctx.fillStyle = "#E34F1E";
      ctx.fillRect(157, 29, 7, 9);
      ctx.fillStyle = "#FFB52C";
      ctx.fillRect(159, 30, 4, 6);
      ctx.fillStyle = "#FFE86E";
      ctx.fillRect(161, 31, 1, 3);
      // Hydraulic rams make the entrance read as machinery rather than masonry.
      ctx.fillStyle = "#2A2027";
      ctx.fillRect(135, 27, 10, 8);
      ctx.fillRect(175, 27, 10, 8);
      ctx.fillStyle = "#8B8583";
      ctx.fillRect(137, 29, 8, 3);
      ctx.fillRect(175, 29, 8, 3);
      ctx.fillStyle = "#D94B1F";
      ctx.fillRect(141, 28, 3, 5);
      ctx.fillRect(176, 28, 3, 5);
      ctx.fillStyle = "#B6AAA5";
      for (const [rx, ry] of [[147, 20], [171, 20], [145, 42], [173, 42]] as const) {
        ctx.fillRect(rx, ry, 2, 2);
      }
    }

    if (currentRoom) {
      const drawDoor = (x: number, y: number, w: number, h: number) => {
         if (theme === "forest") {
           const horizontal = w > h;
           ctx.fillStyle = isLocked ? "rgba(51, 78, 45, 0.55)" : "rgba(28, 55, 38, 0.22)";
           ctx.fillRect(x, y, w, h);
           ctx.fillStyle = "#3E2B20";
           if (horizontal) {
             ctx.fillRect(x, y, w, 4);
             ctx.fillRect(x, y + h - 4, w, 4);
             ctx.fillStyle = "#6A4B31";
             ctx.fillRect(x + 1, y + 1, w - 2, 1);
             ctx.fillRect(x + 1, y + h - 3, w - 2, 1);
           } else {
             ctx.fillRect(x, y, 4, h);
             ctx.fillRect(x + w - 4, y, 4, h);
             ctx.fillStyle = "#6A4B31";
             ctx.fillRect(x + 1, y + 1, 1, h - 2);
             ctx.fillRect(x + w - 3, y + 1, 1, h - 2);
           }

           ctx.fillStyle = "#56864B";
           if (horizontal) {
             ctx.fillRect(x + 2, y + 3, 8, 3);
             ctx.fillRect(x + w - 10, y + h - 6, 8, 3);
           } else {
             ctx.fillRect(x + 3, y + 2, 3, 8);
             ctx.fillRect(x + w - 6, y + h - 10, 3, 8);
           }

           if (isLocked) {
             ctx.fillStyle = "#29472F";
             if (horizontal) {
               for (let i = x + 5; i < x + w - 3; i += 8) {
                 ctx.fillRect(i, y + 3, 3, h - 6);
                 ctx.fillStyle = "#81A957";
                 ctx.fillRect(i + 1, y + 5, 1, h - 10);
                 ctx.fillStyle = "#29472F";
               }
             } else {
               for (let i = y + 5; i < y + h - 3; i += 8) {
                 ctx.fillRect(x + 3, i, w - 6, 3);
                 ctx.fillStyle = "#81A957";
                 ctx.fillRect(x + 5, i + 1, w - 10, 1);
                 ctx.fillStyle = "#29472F";
               }
             }
             ctx.fillStyle = "#E783A5";
             ctx.fillRect(x + Math.floor(w / 2) - 1, y + Math.floor(h / 2) - 1, 3, 3);
             ctx.fillStyle = "#FFE47A";
             ctx.fillRect(x + Math.floor(w / 2), y + Math.floor(h / 2), 1, 1);
           }
           return;
         }

         if (theme === "dungeon") {
           const horizontal = w > h;
           ctx.fillStyle = isLocked ? "rgba(22, 15, 31, 0.78)" : "rgba(10, 15, 24, 0.45)";
           ctx.fillRect(x, y, w, h);

           // Layered stone jambs make the door read as part of the masonry.
           ctx.fillStyle = "#111925";
           if (horizontal) {
             ctx.fillRect(x, y, w, 5);
             ctx.fillRect(x, y + h - 5, w, 5);
           } else {
             ctx.fillRect(x, y, 5, h);
             ctx.fillRect(x + w - 5, y, 5, h);
           }
           ctx.fillStyle = "#3B485C";
           if (horizontal) {
             ctx.fillRect(x + 1, y + 1, w - 2, 3);
             ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
           } else {
             ctx.fillRect(x + 1, y + 1, 3, h - 2);
             ctx.fillRect(x + w - 4, y + 1, 3, h - 2);
           }
           ctx.fillStyle = "#718095";
           if (horizontal) {
             for (let i = x + 4; i < x + w - 2; i += 10) {
               ctx.fillRect(i, y + 1, 5, 1);
               ctx.fillRect(i + 2, y + h - 2, 5, 1);
             }
           } else {
             for (let i = y + 4; i < y + h - 2; i += 10) {
               ctx.fillRect(x + 1, i, 1, 5);
               ctx.fillRect(x + w - 2, i + 2, 1, 5);
             }
           }

           if (isLocked) {
             // A real portcullis replaces the universal red energy barrier.
             ctx.fillStyle = "#151C25";
             if (horizontal) {
               for (let i = x + 5; i < x + w - 3; i += 7) {
                 ctx.fillRect(i, y + 3, 3, h - 6);
                 ctx.fillRect(i - 1, y + h - 5, 5, 3);
               }
               ctx.fillRect(x + 3, y + Math.floor(h / 2) - 2, w - 6, 4);
             } else {
               for (let i = y + 5; i < y + h - 3; i += 7) {
                 ctx.fillRect(x + 3, i, w - 6, 3);
                 ctx.fillRect(x + w - 5, i - 1, 3, 5);
               }
               ctx.fillRect(x + Math.floor(w / 2) - 2, y + 3, 4, h - 6);
             }
             ctx.fillStyle = "#7B8993";
             if (horizontal) {
               for (let i = x + 6; i < x + w - 3; i += 7) ctx.fillRect(i, y + 4, 1, h - 9);
               ctx.fillRect(x + 4, y + Math.floor(h / 2) - 1, w - 8, 1);
             } else {
               for (let i = y + 6; i < y + h - 3; i += 7) ctx.fillRect(x + 4, i, w - 9, 1);
               ctx.fillRect(x + Math.floor(w / 2) - 1, y + 4, 1, h - 8);
             }

             // Offset chain links avoid another literal cross at the lock.
             ctx.fillStyle = "#111820";
             const cx = x + Math.floor(w / 2);
             const cy = y + Math.floor(h / 2);
             if (horizontal) {
               ctx.fillRect(cx - 12, cy - 5, 7, 4);
               ctx.fillRect(cx - 7, cy - 2, 4, 7);
               ctx.fillRect(cx + 3, cy - 5, 7, 4);
               ctx.fillRect(cx + 1, cy - 1, 4, 7);
             } else {
               ctx.fillRect(cx - 5, cy - 12, 4, 7);
               ctx.fillRect(cx - 2, cy - 7, 7, 4);
               ctx.fillRect(cx - 5, cy + 3, 4, 7);
               ctx.fillRect(cx - 1, cy + 1, 7, 4);
             }
             ctx.fillStyle = "#89969D";
             ctx.fillRect(cx - 7, cy - 3, 4, 2);
             ctx.fillRect(cx + 3, cy + 2, 4, 2);
             ctx.fillStyle = "#241531";
             ctx.fillRect(cx - 4, cy - 5, 9, 10);
             ctx.fillStyle = "#9E59C8";
             ctx.fillRect(cx - 2, cy - 3, 5, 6);
             ctx.fillStyle = "#E0B8F2";
             ctx.fillRect(cx, cy - 2, 2, 3);
           } else {
             // Open doors retain short iron teeth at the frame edges.
             ctx.fillStyle = "#6D7B85";
             if (horizontal) {
               ctx.fillRect(x + 4, y + 4, 3, 5);
               ctx.fillRect(x + w - 7, y + h - 9, 3, 5);
             } else {
               ctx.fillRect(x + 4, y + 4, 5, 3);
               ctx.fillRect(x + w - 9, y + h - 7, 5, 3);
             }
           }
           return;
         }

         if (theme === "snow") {
           const horizontal = w > h;
           ctx.fillStyle = isLocked ? "rgba(31, 73, 91, 0.72)" : "rgba(47, 92, 108, 0.28)";
           ctx.fillRect(x, y, w, h);

           // Steel jambs are buried under wind-packed ice at the room edge.
           ctx.fillStyle = "#294A5B";
           if (horizontal) {
             ctx.fillRect(x, y, w, 5);
             ctx.fillRect(x, y + h - 5, w, 5);
           } else {
             ctx.fillRect(x, y, 5, h);
             ctx.fillRect(x + w - 5, y, 5, h);
           }
           ctx.fillStyle = "#6F929E";
           if (horizontal) {
             ctx.fillRect(x + 1, y + 1, w - 2, 3);
             ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
           } else {
             ctx.fillRect(x + 1, y + 1, 3, h - 2);
             ctx.fillRect(x + w - 4, y + 1, 3, h - 2);
           }
           ctx.fillStyle = "#D9E8EB";
           if (horizontal) {
             ctx.fillRect(x + 2, y, w - 4, 2);
             ctx.fillRect(x + 6, y + h - 5, Math.max(2, w - 12), 1);
           } else {
             ctx.fillRect(x, y + 2, 2, h - 4);
             ctx.fillRect(x + w - 5, y + 6, 1, Math.max(2, h - 12));
           }

           if (isLocked) {
             // A solid two-piece quarantine airlock replaces the old repeated
             // bars. Stepped corners, a pressure seam and warning lamps make it
             // read as research hardware even at the room edge.
             const cx = x + Math.floor(w / 2);
             const cy = y + Math.floor(h / 2);
             ctx.fillStyle = "#284E5E";
             if (horizontal) {
               ctx.fillRect(x + 4, y + 3, w - 8, h - 6);
               ctx.fillRect(x + 8, y + 2, w - 16, h - 4);
               ctx.fillStyle = "#719EAA";
               ctx.fillRect(x + 6, y + 4, Math.max(3, cx - x - 8), h - 8);
               ctx.fillRect(cx + 2, y + 4, Math.max(3, x + w - cx - 8), h - 8);
               ctx.fillStyle = "#173744";
               ctx.fillRect(cx - 2, y + 3, 4, h - 6);
               ctx.fillStyle = "#55BBC9";
               ctx.fillRect(cx - 1, y + 4, 2, h - 8);
               ctx.fillStyle = "#B7D9DF";
               ctx.fillRect(x + 7, y + 4, 2, h - 8);
               ctx.fillRect(x + w - 9, y + 4, 2, h - 8);
             } else {
               ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
               ctx.fillRect(x + 2, y + 8, w - 4, h - 16);
               ctx.fillStyle = "#719EAA";
               ctx.fillRect(x + 4, y + 6, w - 8, Math.max(3, cy - y - 8));
               ctx.fillRect(x + 4, cy + 2, w - 8, Math.max(3, y + h - cy - 8));
               ctx.fillStyle = "#173744";
               ctx.fillRect(x + 3, cy - 2, w - 6, 4);
               ctx.fillStyle = "#55BBC9";
               ctx.fillRect(x + 4, cy - 1, w - 8, 2);
               ctx.fillStyle = "#B7D9DF";
               ctx.fillRect(x + 4, y + 7, w - 8, 2);
               ctx.fillRect(x + 4, y + h - 9, w - 8, 2);
             }
             ctx.fillStyle = "#21485A";
             ctx.fillRect(cx - 5, cy - 5, 11, 11);
             ctx.fillStyle = "#55BBC9";
             ctx.fillRect(cx - 3, cy - 3, 7, 7);
             ctx.fillStyle = "#E2FFFF";
             ctx.fillRect(cx, cy - 2, 2, 4);
             ctx.fillStyle = "#C94C55";
             ctx.fillRect(cx - 8, cy - 1, 3, 3);
             ctx.fillRect(cx + 6, cy - 1, 3, 3);
             ctx.fillStyle = "#FFD16A";
             ctx.fillRect(cx - 7, cy, 1, 1);
             ctx.fillRect(cx + 7, cy, 1, 1);
             ctx.fillStyle = "#173744";
             if (horizontal) {
               ctx.fillRect(cx - 7, cy - 3, 3, 7);
               ctx.fillRect(cx + 4, cy - 3, 3, 7);
             } else {
               ctx.fillRect(cx - 3, cy - 7, 7, 3);
               ctx.fillRect(cx - 3, cy + 4, 7, 3);
             }
           } else {
             // Open airlocks leave insulated pockets and short frost wedges.
             ctx.fillStyle = "#A9D4DC";
             if (horizontal) {
               ctx.fillRect(x + 5, y + 4, 3, 6);
               ctx.fillRect(x + w - 8, y + h - 10, 3, 6);
             } else {
               ctx.fillRect(x + 4, y + 5, 6, 3);
               ctx.fillRect(x + w - 10, y + h - 8, 6, 3);
             }
           }
           return;
         }

         if (theme === "lava") {
           const horizontal = w > h;
           ctx.fillStyle = isLocked ? "rgba(77, 29, 24, 0.76)" : "rgba(42, 29, 35, 0.38)";
           ctx.fillRect(x, y, w, h);

           // Heat-shielded basalt jambs and iron rails belong to the foundry walls.
           ctx.fillStyle = "#171219";
           if (horizontal) {
             ctx.fillRect(x, y, w, 5);
             ctx.fillRect(x, y + h - 5, w, 5);
           } else {
             ctx.fillRect(x, y, 5, h);
             ctx.fillRect(x + w - 5, y, 5, h);
           }
           ctx.fillStyle = "#493943";
           if (horizontal) {
             ctx.fillRect(x + 1, y + 1, w - 2, 3);
             ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
           } else {
             ctx.fillRect(x + 1, y + 1, 3, h - 2);
             ctx.fillRect(x + w - 4, y + 1, 3, h - 2);
           }
           ctx.fillStyle = "#777E7F";
           if (horizontal) {
             for (let i = x + 4; i < x + w - 2; i += 10) {
               ctx.fillRect(i, y + 1, 5, 1);
               ctx.fillRect(i + 2, y + h - 2, 5, 1);
             }
           } else {
             for (let i = y + 4; i < y + h - 2; i += 10) {
               ctx.fillRect(x + 1, i, 1, 5);
               ctx.fillRect(x + w - 2, i + 2, 1, 5);
             }
           }

           if (isLocked) {
             // A compact furnace iris replaces the old row of shutters. Six
             // overlapping hot plates converge on a central combustion lock.
             const cx = x + Math.floor(w / 2);
             const cy = y + Math.floor(h / 2);
             ctx.fillStyle = "#261C22";
             if (horizontal) {
               ctx.fillRect(x + 4, y + 3, w - 8, h - 6);
               ctx.fillStyle = "#5B454C";
               ctx.fillRect(x + 7, y + 4, Math.max(4, cx - x - 8), h - 8);
               ctx.fillRect(cx + 1, y + 4, Math.max(4, x + w - cx - 8), h - 8);
               ctx.fillStyle = "#913B2C";
               ctx.fillRect(cx - 14, y + 3, 9, 5);
               ctx.fillRect(cx + 5, y + 3, 9, 5);
               ctx.fillRect(cx - 10, y + h - 8, 8, 5);
               ctx.fillRect(cx + 2, y + h - 8, 8, 5);
               ctx.fillStyle = "#8A8583";
               ctx.fillRect(x + 5, cy - 1, 8, 3);
               ctx.fillRect(x + w - 13, cy - 1, 8, 3);
             } else {
               ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
               ctx.fillStyle = "#5B454C";
               ctx.fillRect(x + 4, y + 7, w - 8, Math.max(4, cy - y - 8));
               ctx.fillRect(x + 4, cy + 1, w - 8, Math.max(4, y + h - cy - 8));
               ctx.fillStyle = "#913B2C";
               ctx.fillRect(x + 3, cy - 14, 5, 9);
               ctx.fillRect(x + 3, cy + 5, 5, 9);
               ctx.fillRect(x + w - 8, cy - 10, 5, 8);
               ctx.fillRect(x + w - 8, cy + 2, 5, 8);
               ctx.fillStyle = "#8A8583";
               ctx.fillRect(cx - 1, y + 5, 3, 8);
               ctx.fillRect(cx - 1, y + h - 13, 3, 8);
             }
             ctx.fillStyle = "#5A211C";
             ctx.fillRect(cx - 5, cy - 5, 11, 11);
             ctx.fillStyle = "#E34F1E";
             ctx.fillRect(cx - 3, cy - 3, 7, 7);
             ctx.fillStyle = "#FFB52C";
             ctx.fillRect(cx - 1, cy - 2, 4, 4);
             ctx.fillStyle = "#FFE86E";
             ctx.fillRect(cx + 1, cy - 1, 1, 2);
             ctx.fillStyle = "#B2A6A1";
             if (horizontal) {
               ctx.fillRect(x + 7, cy - 1, 2, 2);
               ctx.fillRect(x + w - 9, cy - 1, 2, 2);
             } else {
               ctx.fillRect(cx - 1, y + 7, 2, 2);
               ctx.fillRect(cx - 1, y + h - 9, 2, 2);
             }
           } else {
             // Open furnace irises retain hydraulic sockets and hot teeth.
             ctx.fillStyle = "#8C4A37";
             if (horizontal) {
               ctx.fillRect(x + 5, y + 4, 3, 6);
               ctx.fillRect(x + w - 8, y + h - 10, 3, 6);
             } else {
               ctx.fillRect(x + 4, y + 5, 6, 3);
               ctx.fillRect(x + w - 10, y + h - 8, 6, 3);
             }
           }
           return;
         }

         const frameColor = isLocked ? "#C0392B" : "#27AE60";
         const innerColor = isLocked ? "rgba(231, 76, 60, 0.2)" : "rgba(46, 204, 113, 0.1)";
         
         ctx.fillStyle = innerColor;
         ctx.fillRect(x, y, w, h);
         
         ctx.fillStyle = frameColor;
         
         if (isLocked) {
             ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
             if (w > h) {
                // Horizontal barrier
                for (let i = x + 4; i < x + w; i += 8) {
                   ctx.fillRect(i, y + 2, 2, h - 4);
                }
             } else {
                // Vertical barrier
                for (let i = y + 4; i < y + h; i += 8) {
                   ctx.fillRect(x + 2, i, w - 4, 2);
                }
             }
             
             // Draw frame on edges
             ctx.fillStyle = frameColor;
             if (w > h) {
                 ctx.fillRect(x, y, w, 2);
                 ctx.fillRect(x, y + h - 2, w, 2);
             } else {
                 ctx.fillRect(x, y, 2, h);
                 ctx.fillRect(x + w - 2, y, 2, h);
             }
         } else {
             // Open door frame details (just sides)
             ctx.fillStyle = frameColor;
             if (w > h) {
                ctx.fillRect(x, y, 4, h);
                ctx.fillRect(x + w - 4, y, 4, h);
             } else {
                ctx.fillRect(x, y, w, 4);
                ctx.fillRect(x, y + h - 4, w, 4);
             }
         }
      };
      
      if (currentRoom.doors.left) drawDoor(0, DOOR_ZONES.left.yMin * TILE_SIZE, 16, (DOOR_ZONES.left.yMax - DOOR_ZONES.left.yMin + 1) * TILE_SIZE);
      if (currentRoom.doors.right) drawDoor((MAP_WIDTH - 1) * TILE_SIZE, DOOR_ZONES.right.yMin * TILE_SIZE, 16, (DOOR_ZONES.right.yMax - DOOR_ZONES.right.yMin + 1) * TILE_SIZE);
      if (currentRoom.doors.up) drawDoor(DOOR_ZONES.up.xMin * TILE_SIZE, 0, (DOOR_ZONES.up.xMax - DOOR_ZONES.up.xMin + 1) * TILE_SIZE, 16);
      if (currentRoom.doors.down) drawDoor(DOOR_ZONES.down.xMin * TILE_SIZE, (MAP_HEIGHT - 1) * TILE_SIZE, (DOOR_ZONES.down.xMax - DOOR_ZONES.down.xMin + 1) * TILE_SIZE, 16);
      

    }

    // Weather Effects
    const lanternPulse = 20 + Math.sin(this.windTime * 4) * 4;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        if (tileId === 4) {
          const lX = x * TILE_SIZE + 8;
          const lY = y * TILE_SIZE + 5;

          const glowSize = Math.round(lanternPulse);
          const outerGlow = theme === "dungeon" ? "rgba(166, 91, 208, 0.06)"
            : theme === "snow" ? "rgba(98, 208, 226, 0.07)"
              : "rgba(254, 211, 48, 0.05)";
          const middleGlow = theme === "dungeon" ? "rgba(181, 103, 221, 0.12)"
            : theme === "snow" ? "rgba(112, 222, 236, 0.13)"
              : "rgba(254, 211, 48, 0.1)";
          const innerGlow = theme === "dungeon" ? "rgba(224, 181, 245, 0.2)"
            : theme === "snow" ? "rgba(218, 255, 255, 0.22)"
              : "rgba(254, 211, 48, 0.2)";
          ctx.fillStyle = outerGlow;
          ctx.fillRect(lX - glowSize, lY - glowSize, glowSize * 2, glowSize * 2);
          ctx.fillStyle = middleGlow;
          ctx.fillRect(lX - 12, lY - 12, 24, 24);
          ctx.fillStyle = innerGlow;
          ctx.fillRect(lX - 6, lY - 6, 12, 12);
        }
      }
    }

    if (theme === "forest" || theme === "snow" || theme === "lava" || theme === "dungeon") {
      for (const p of this.particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        if (theme === "forest") {
          ctx.fillStyle = "rgba(232, 130, 164, 0.8)";
          ctx.fillRect(-Math.max(1, Math.round(p.size)), -1, Math.max(2, Math.round(p.size * 2)), 2);
        } else if (theme === "snow") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          const flake = Math.max(1, Math.round(p.size));
          ctx.fillRect(-Math.floor(flake / 2), -Math.floor(flake / 2), flake, flake);
        } else if (theme === "lava") {
          ctx.fillStyle = "rgba(243, 156, 18, 0.8)";
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        } else if (theme === "dungeon") {
          // Slow rectangular dust and soul motes suit the still crypt air.
          const mote = Math.max(1, Math.round(p.size / 2));
          ctx.fillStyle = "rgba(164, 101, 199, 0.45)";
          ctx.fillRect(-mote, -1, mote * 2 + 1, 2);
          ctx.fillStyle = "rgba(216, 184, 235, 0.38)";
          ctx.fillRect(0, -1, 1, 1);
        }
        ctx.restore();
      }
    }
  }
}
