import { FloorData, Room } from "../FloorGenerator";

export class MinimapRenderer {
  static draw(ctx: CanvasRenderingContext2D, floor: FloorData) {
    const mmSize = 6;
    const padding = 2;
    
    // Find bounds to center minimap
    let minX = 999, maxX = -999, minY = 999, maxY = -999;
    for (const r of floor.rooms) {
      if (r.x < minX) minX = r.x;
      if (r.x > maxX) maxX = r.x;
      if (r.y < minY) minY = r.y;
      if (r.y > maxY) maxY = r.y;
    }
    
    const w = (maxX - minX + 1);
    const h = (maxY - minY + 1);
    
    // Top right position
    const startX = 320 - (w * mmSize) - 10;
    const startY = 10;
    
    // Background for minimap
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(startX - padding, startY - padding, w * mmSize + padding*2, h * mmSize + padding*2);
    
    for (const r of floor.rooms) {
       const rx = startX + (r.x - minX) * mmSize;
       const ry = startY + (r.y - minY) * mmSize;
       
       const isCurrent = (r.x === floor.currentRoomX && r.y === floor.currentRoomY);
       
       if (isCurrent) {
         ctx.fillStyle = "#FFF"; // Current
       } else if (r.type === "boss") {
         ctx.fillStyle = r.cleared ? "#C0392B" : "#E74C3C"; 
       } else if (r.type === "exit") {
         ctx.fillStyle = "#00F2FE";
       } else if (r.type === "treasure") {
         ctx.fillStyle = r.cleared ? "#F39C12" : "#F1C40F";
       } else if (r.type === "legacy_rpg" || r.type === "legacy_tactics") {
         ctx.fillStyle = r.cleared ? "#8E44AD" : "#9B59B6";
       } else {
         ctx.fillStyle = r.cleared ? "#7F8C8D" : "#34495E";
       }
       
       ctx.fillRect(rx, ry, mmSize - 1, mmSize - 1);
       
       // Draw doors on minimap
       ctx.fillStyle = "rgba(255,255,255,0.3)";
       if (r.doors.up) ctx.fillRect(rx + 2, ry, 1, 1);
       if (r.doors.down) ctx.fillRect(rx + 2, ry + mmSize - 2, 1, 1);
       if (r.doors.left) ctx.fillRect(rx, ry + 2, 1, 1);
       if (r.doors.right) ctx.fillRect(rx + mmSize - 2, ry + 2, 1, 1);
    }
  }
}
