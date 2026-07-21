import { GameState } from "./GameState";
import { events } from "../EventBus";
import { generateFloor } from "../FloorGenerator";
import { t, uiFont } from "../i18n";

interface EnemyUnit {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  action: "slash" | "shoot" | "charge";
  actionDir: "up" | "down" | "left" | "right" | "all";
}

export class LegacyTacticsState extends GameState {
  // 5x5 Tactical Board Coordinates
  private boardX = 80;
  private boardY = 40;
  private tileSize = 24;

  // Player Grid Position (0 to 4)
  private px = 2;
  private py = 4;

  // Enemy Units on Board
  private enemies: EnemyUnit[] = [];
  
  // Tactical phase & Selection state
  private phase: "player_turn" | "enemy_turn" | "end" = "player_turn";
  
  private message = "";
  private timer = 0;
  private params: any;
  private battleResult: "win" | "loss" | null = null;

  enter(params?: any) {
    if (params?.resume) return;

    this.params = params;
    this.battleResult = null;
    this.px = 2;
    this.py = 4;
    this.phase = "player_turn";
    const language = this.engine.data.settings.language;
    this.message = t(language, "legacyTactics.start");

    const floor = this.engine.data.data.floor;
    const currentRoom = floor?.rooms?.find(r => r?.x === floor?.currentRoomX && r?.y === floor?.currentRoomY);

    if (currentRoom?.type === "boss") {
      this.enemies = [
        {
          id: "boss1",
          name: "Cyber Shogun",
          x: 2,
          y: 0,
          hp: 40,
          maxHp: 40,
          action: "shoot",
          actionDir: "down",
        }
      ];
      this.message = t(language, "legacyTactics.boss");
    } else {
      // Spawn 1 or 2 distinct high-readability anime enemies (Shogun Showdown style)
      this.enemies = [
        {
          id: "e1",
          name: "Neon Slime",
          x: 1,
          y: 1,
          hp: 15,
          maxHp: 15,
          action: "slash",
          actionDir: "down",
        },
        {
          id: "e2",
          name: "Shadow Ronin",
          x: 3,
          y: 0,
          hp: 18,
          maxHp: 18,
          action: "shoot",
          actionDir: "down",
        }
      ];
    }

    this.updateThreats();
  }

  exit() {}

  // Recalculate intended actions and warning spots
  private updateThreats() {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;

      // Randomly change enemy target/action direction to keep player thinking
      const directions: ("up" | "down" | "left" | "right" | "all")[] = ["up", "down", "left", "right"];
      e.actionDir = directions[Math.floor(Math.random() * directions.length)];
      
      const actions: ("slash" | "shoot" | "charge")[] = ["slash", "shoot", "charge"];
      e.action = actions[Math.floor(Math.random() * actions.length)];
    }
  }

  update(dt: number) {
    if (this.phase === "end") {
      if (this.engine.input.wasUiPressed("confirm")) {
        events.emit("state:change", this.params?.returnState || "dungeon", {
          fromLegacy: true,
          legacyType: "legacy_tactics",
          sourceRoomId: this.params?.sourceRoomId,
          result: this.battleResult
        });
      }
      return;
    }

    if (this.phase === "enemy_turn") {
      this.timer += dt;
      if (this.timer > 1.2) {
        this.executeEnemyTurn();
      }
      return;
    }

    // Player Phase: Direct Input
    if (this.phase === "player_turn") {
      let dx = 0;
      let dy = 0;

      if (this.engine.input.wasUiPressed("up")) dy = -1;
      else if (this.engine.input.wasUiPressed("down")) dy = 1;
      else if (this.engine.input.wasUiPressed("left")) dx = -1;
      else if (this.engine.input.wasUiPressed("right")) dx = 1;

      if (dx !== 0 || dy !== 0) {
        this.handlePlayerAction(dx, dy);
      }
    }
  }

  private handlePlayerAction(dx: number, dy: number) {
    const targetX = this.px + dx;
    const targetY = this.py + dy;

    if (targetX < 0 || targetX > 4 || targetY < 0 || targetY > 4) {
      this.message = t(this.engine.data.settings.language, "legacyTactics.outside");
      return;
    }

    const p = this.engine.data.data.legacyData.player;
    const targetEnemy = this.enemies.find(e => e.hp > 0 && e.x === targetX && e.y === targetY);

    if (targetEnemy) {
      // Melee strike
      const dmg = 4 + p.level;
      targetEnemy.hp -= dmg;
      this.message = t(this.engine.data.settings.language, "legacyTactics.slash", {
        enemy: targetEnemy.name,
        damage: dmg,
      });
    } else {
      // Move
      this.px = targetX;
      this.py = targetY;
      this.message = t(this.engine.data.settings.language, "legacyTactics.moved", {
        x: targetX,
        y: targetY,
      });
    }

    // Check if enemies are defeated
    const allDefeated = this.enemies.every(e => e.hp <= 0);
    if (allDefeated) {
      this.winBattle();
    } else {
      this.phase = "enemy_turn";
      this.timer = 0;
    }
  }

  private executeEnemyTurn() {
    const p = this.engine.data.data.legacyData.player;
    let hitCount = 0;
    let damageTaken = 0;

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;

      // Check if player is standing on the enemy's hazard line or square
      let isHit = false;

      if (e.action === "slash") {
        // Slashes adjacent tiles in their actionDir
        let targetX = e.x;
        let targetY = e.y;
        if (e.actionDir === "up") targetY -= 1;
        if (e.actionDir === "down") targetY += 1;
        if (e.actionDir === "left") targetX -= 1;
        if (e.actionDir === "right") targetX += 1;

        if (this.px === targetX && this.py === targetY) {
          isHit = true;
        }
      } else if (e.action === "shoot") {
        // Shoots along a whole line in actionDir
        let currentX = e.x;
        let currentY = e.y;
        let dx = 0, dy = 0;
        if (e.actionDir === "up") dy = -1;
        if (e.actionDir === "down") dy = 1;
        if (e.actionDir === "left") dx = -1;
        if (e.actionDir === "right") dx = 1;

        for (let step = 1; step < 5; step++) {
          currentX += dx;
          currentY += dy;
          if (this.px === currentX && this.py === currentY) {
            isHit = true;
            break;
          }
        }
      } else if (e.action === "charge") {
        // Attacks adjacent plus own square
        if (Math.abs(e.x - this.px) + Math.abs(e.y - this.py) <= 1) {
          isHit = true;
        }
      }

      if (isHit) {
        const dmg = 3 + Math.floor(Math.random() * 2);
        damageTaken += dmg;
        hitCount++;
      }
    }

    if (hitCount > 0) {
      p.hp -= damageTaken;
      this.message = t(this.engine.data.settings.language, "legacyTactics.hit", { damage: damageTaken });
    } else {
      this.message = t(this.engine.data.settings.language, "legacyTactics.evaded");
    }

    // Check game over
    if (p.hp <= 0) {
      this.battleResult = "loss";
      p.hp = p.maxHp; // Auto revive for good game-loop flow
      this.message = t(this.engine.data.settings.language, "legacyTactics.revived");
      this.phase = "end";
      this.engine.data.logEvent("Defeated in combat");
    } else {
      // Next Turn preparation
      this.updateThreats();
      this.phase = "player_turn";
    }
  }

  private winBattle() {
    this.battleResult = "win";
    const p = this.engine.data.data.legacyData.player;
    p.exp += 8;
    this.message = t(this.engine.data.settings.language, "legacyTactics.victory");
    this.phase = "end";
    this.engine.data.logEvent("Vanquished pixel ghosts");

    if (p.exp >= 20) {
      p.level++;
      p.maxHp += 5;
      p.hp = p.maxHp;
      p.exp = 0;
      this.message = t(this.engine.data.settings.language, "legacyTactics.levelUp");
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    const floor = this.engine.data.data.floor;
    const theme = floor?.theme || "forest";

    // Elegant Cyber-Fantasy Tatami Battle background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 240);
    if (theme === "forest") {
      bgGrad.addColorStop(0, "#0F172A"); 
      bgGrad.addColorStop(1, "#1E1E2F");
    } else if (theme === "dungeon") {
      bgGrad.addColorStop(0, "#171018"); 
      bgGrad.addColorStop(1, "#261A2B");
    } else if (theme === "snow") {
      bgGrad.addColorStop(0, "#192734"); 
      bgGrad.addColorStop(1, "#253A51");
    } else if (theme === "lava") {
      bgGrad.addColorStop(0, "#2C1210"); 
      bgGrad.addColorStop(1, "#1E0F14");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 320, 240);

    // Warm radial focus light on the board
    const boardGlow = ctx.createRadialGradient(160, 100, 20, 160, 100, 110);
    if (theme === "forest") {
      boardGlow.addColorStop(0, "rgba(142, 68, 173, 0.2)");
    } else if (theme === "dungeon") {
      boardGlow.addColorStop(0, "rgba(155, 89, 182, 0.2)");
    } else if (theme === "snow") {
      boardGlow.addColorStop(0, "rgba(52, 152, 219, 0.2)");
    } else if (theme === "lava") {
      boardGlow.addColorStop(0, "rgba(231, 76, 60, 0.2)");
    }
    boardGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = boardGlow;
    ctx.fillRect(0, 0, 320, 240);

    // Vignette
    const vigGrad = ctx.createRadialGradient(160, 120, 110, 160, 120, 230);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.8)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 320, 240);

    // Draw Board Headers & Info
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 9px monospace";
    let title = "FOREST TACTICAL ARENA";
    if (theme === "dungeon") title = "DUNGEON TACTICAL ARENA";
    else if (theme === "snow") title = "SNOW TACTICAL ARENA";
    else if (theme === "lava") title = "VOLCANIC TACTICAL ARENA";
    ctx.fillText(title, 15, 20);

    const p = this.engine.data.data.legacyData.player;
    ctx.font = "8px monospace";
    ctx.fillStyle = "#5DADE2";
    ctx.fillText(`PLAYER HP: ${p.hp}/${p.maxHp} (LVL ${p.level})`, 180, 20);

    // Draw Board Tiles
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const tx = this.boardX + c * this.tileSize;
        const ty = this.boardY + r * this.tileSize;

        // Base tile styling - distinct checkerboard
        const isDark = (r + c) % 2 === 0;
        let tileColorDark = "#282A36";
        let tileColorLight = "#21222C";
        
        if (theme === "dungeon") {
          tileColorDark = "#2C3E50"; tileColorLight = "#34495E";
        } else if (theme === "snow") {
          tileColorDark = "#2E4053"; tileColorLight = "#34495E";
        } else if (theme === "lava") {
          tileColorDark = "#3E1E1E"; tileColorLight = "#2C1210";
        }

        ctx.fillStyle = isDark ? tileColorDark : tileColorLight;
        ctx.fillRect(tx, ty, this.tileSize, this.tileSize);

        // Grid lines border (delightfully subtle, matching Octopath ambient look)
        if (theme === "forest") ctx.strokeStyle = "rgba(142, 68, 173, 0.15)";
        else if (theme === "dungeon") ctx.strokeStyle = "rgba(155, 89, 182, 0.15)";
        else if (theme === "snow") ctx.strokeStyle = "rgba(52, 152, 219, 0.15)";
        else if (theme === "lava") ctx.strokeStyle = "rgba(231, 76, 60, 0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);

        // Highlight Player hazard lines (Shogun Showdown threat warnings)
        let isHazard = false;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;

          if (e.action === "slash") {
            let hx = e.x;
            let hy = e.y;
            if (e.actionDir === "up") hy -= 1;
            if (e.actionDir === "down") hy += 1;
            if (e.actionDir === "left") hx -= 1;
            if (e.actionDir === "right") hx += 1;

            if (c === hx && r === hy) isHazard = true;
          } else if (e.action === "shoot") {
            let hx = e.x;
            let hy = e.y;
            let dx = 0, dy = 0;
            if (e.actionDir === "up") dy = -1;
            if (e.actionDir === "down") dy = 1;
            if (e.actionDir === "left") dx = -1;
            if (e.actionDir === "right") dx = 1;

            for (let s = 1; s < 5; s++) {
              hx += dx;
              hy += dy;
              if (c === hx && r === hy) {
                isHazard = true;
                break;
              }
            }
          } else if (e.action === "charge") {
            if (Math.abs(e.x - c) + Math.abs(e.y - r) <= 1) {
              isHazard = true;
            }
          }
        }

        if (isHazard) {
          ctx.fillStyle = "rgba(231, 76, 60, 0.25)";
          ctx.fillRect(tx + 1, ty + 1, this.tileSize - 2, this.tileSize - 2);
          ctx.strokeStyle = "rgba(231, 76, 60, 0.6)";
          ctx.strokeRect(tx + 2, ty + 2, this.tileSize - 4, this.tileSize - 4);
        }
      }
    }

    // Draw Player Unit on board
    const pCanvasX = this.boardX + this.px * this.tileSize;
    const pCanvasY = this.boardY + this.py * this.tileSize;

    // Player Shadow
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(pCanvasX + 12, pCanvasY + 20, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player Sprite details
    ctx.fillStyle = "#8E44AD"; // Hair
    ctx.fillRect(pCanvasX + 5, pCanvasY + 2, 14, 4);
    ctx.fillStyle = "#FFE3D1"; // Face
    ctx.fillRect(pCanvasX + 7, pCanvasY + 5, 10, 6);
    ctx.fillStyle = "#00F2FE"; // Glowing eyes
    ctx.fillRect(pCanvasX + 8, pCanvasY + 7, 2, 2);
    ctx.fillRect(pCanvasX + 13, pCanvasY + 7, 2, 2);
    ctx.fillStyle = "#1A1A1A"; // Coat
    ctx.fillRect(pCanvasX + 6, pCanvasY + 11, 12, 11);

    // Draw Enemy Units on board
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;

      const eCanvasX = this.boardX + e.x * this.tileSize;
      const eCanvasY = this.boardY + e.y * this.tileSize;

      // Enemy Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(eCanvasX + 12, eCanvasY + 20, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Enemy Sprite Body (Neon Slime or Shadow Ronin colors)
      ctx.fillStyle = e.name.includes("Slime") ? "#2ECC71" : "#E74C3C";
      ctx.fillRect(eCanvasX + 4, eCanvasY + 6, 16, 15);
      
      // Face
      ctx.fillStyle = "#111";
      ctx.fillRect(eCanvasX + 7, eCanvasY + 10, 3, 3);
      ctx.fillRect(eCanvasX + 14, eCanvasY + 10, 3, 3);

      // Enemy Intent Box (Shogun Showdown Action Bubble)
      ctx.fillStyle = "rgba(10, 15, 30, 0.95)";
      ctx.strokeStyle = "#F1C40F";
      ctx.lineWidth = 1;
      ctx.fillRect(eCanvasX - 10, eCanvasY - 18, 44, 13);
      ctx.strokeRect(eCanvasX - 10, eCanvasY - 18, 44, 13);

      ctx.fillStyle = "#FFF";
      ctx.font = "6px monospace";
      let intentText = "";
      if (e.action === "slash") intentText = "⚔️Slash";
      if (e.action === "shoot") intentText = "🏹Shoot";
      if (e.action === "charge") intentText = "💥Blast";
      
      ctx.fillText(intentText, eCanvasX - 7, eCanvasY - 9);

      // Draw Action Arrow hints on grid
      ctx.fillStyle = "#F1C40F";
      let arrowChar = "";
      if (e.actionDir === "up") arrowChar = "▲";
      if (e.actionDir === "down") arrowChar = "▼";
      if (e.actionDir === "left") arrowChar = "◀";
      if (e.actionDir === "right") arrowChar = "▶";
      ctx.fillText(arrowChar, eCanvasX + 26, eCanvasY - 9);

      // Draw HP Bar
      ctx.fillStyle = "#333";
      ctx.fillRect(eCanvasX + 2, eCanvasY + 2, 20, 3);
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(eCanvasX + 2, eCanvasY + 2, 20 * (e.hp / e.maxHp), 3);
    }

    // 9. DIALOG & INPUT OPTIONS BOX AT BOTTOM
    ctx.fillStyle = "rgba(10, 15, 20, 0.95)";
    ctx.strokeStyle = "rgba(142, 68, 173, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(8, 160, 304, 72);
    ctx.strokeRect(8, 160, 304, 72);

    // Text status description
    ctx.fillStyle = "#FFD700";
    ctx.font = uiFont(language, 7);
    ctx.fillText(this.message, 18, 176);

    // Option columns based on the phase
    ctx.fillStyle = "#FFF";
    if (this.phase === "player_turn") {
      ctx.fillText(t(language, "legacyTactics.playerTurn"), 18, 192);
    } else if (this.phase === "enemy_turn") {
      ctx.fillStyle = "#E74C3C";
      ctx.fillText(t(language, "legacyTactics.enemyTurn"), 18, 196);
    } else if (this.phase === "end") {
      ctx.fillStyle = "#2ECC71";
      ctx.fillText(t(language, "legacyTactics.end", { confirm: this.engine.input.getConfirmPrompt() }), 18, 196);
    }
  }
}
