const fs = require('fs');
let code = fs.readFileSync('src/game/render/UIRenderer.ts', 'utf8');

// 1. Add static fields for coin display timer
code = code.replace(
  `export class UIRenderer {`,
  `export class UIRenderer {
  private static lastCoinAmount: number = -1;
  private static coinDisplayUntil: number = 0;`
);

// 2. Modify attributes panel
code = code.replace(
  `drawPixelPanel(ctx, 5, 5, 139, 55, "cyan", true);`,
  `drawPixelPanel(ctx, 5, 5, 110, 55, "cyan", true);`
);

code = code.replace(
  `drawMeter(ctx, 23, row.y + 1, 76, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);`,
  `drawMeter(ctx, 23, row.y + 1, 55, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);`
);

code = code.replace(
  `ctx.fillText(\`\${Math.floor(row.value)}/\${row.max}\`, 136, row.y + 7);`,
  `ctx.fillText(\`\${Math.floor(row.value)}/\${row.max}\`, 110, row.y + 7);`
);

code = code.replace(
  `drawMeter(ctx, 23, 50, 76, 6, skillReady, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);`,
  `drawMeter(ctx, 23, 50, 55, 6, skillReady, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);`
);

code = code.replace(
  `ctx.fillText(player.skillCooldown <= 0 ? "READY" : \`\${player.skillCooldown.toFixed(1)}S\`, 136, 55);`,
  `ctx.fillText(player.skillCooldown <= 0 ? "READY" : \`\${player.skillCooldown.toFixed(1)}S\`, 110, 55);`
);

// 3. Status effects width
code = code.replace(
  `drawPixelPanel(ctx, 149, 52, effects.length * 29 + 8, 15, "red");`,
  `drawPixelPanel(ctx, 120, 52, effects.length * 29 + 8, 15, "red");`
);
code = code.replace(
  `const x = 154 + index * 29;`,
  `const x = 125 + index * 29;`
);

// 4. Buffs (Talent strip) and Gold Bar / Combat Tag
const buffStripCodeOld = `    // Coins and character-specific combat state sit in a separate narrow tag.
    drawPixelPanel(ctx, 5, 63, 139, 15, "yellow");
    drawUiIcon(ctx, "coin", 11, 67, UI_COLORS.yellow);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(String(engine.data.data.player.coins), 23, 74);
    let combatTag = "";
    let combatTagColor: string = UI_COLORS.muted;
    if (player.characterId === "mage") {
      combatTag = \`ECHO \${Math.min(SkillController.MAGE_ECHO_THRESHOLD, Math.floor(player.mageArcaneCharge * 10) / 10)}/\${SkillController.MAGE_ECHO_THRESHOLD}\`;
      combatTagColor = UI_COLORS.purple;
    } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
      combatTag = \`TRACE \${player.micheleMarkTimer.toFixed(1)}S\`;
      combatTagColor = UI_COLORS.yellow;
    } else if (player.characterId === "celestia" && player.celestiaTemporaryArmor > 0) {
      combatTag = \`STAR AR +\${Math.ceil(player.celestiaTemporaryArmor)}\`;
      combatTagColor = UI_COLORS.cyanBright;
    }
    if (combatTag) {
      ctx.textAlign = "right";
      ctx.fillStyle = combatTagColor;
      ctx.font = uiFont(language, 5, true);
      ctx.fillText(combatTag, 136, 73);
    }

    // Compact buff strip. Detailed skill and swap information lives on the pause screen.
    if (player.buffs.length > 0) {
      const visibleBuffCount = Math.min(player.buffs.length, BuffSystem.MAX_BUFFS);
      const columns = Math.min(6, visibleBuffCount);
      const rows = Math.ceil(visibleBuffCount / columns);
      const stripWidth = columns * 15 + 7;
      const stripHeight = rows * 12 + 5;
      const stripX = 315 - stripWidth;
      drawPixelPanel(ctx, stripX, 5, stripWidth, stripHeight, "purple");
      for (let index = 0; index < visibleBuffCount; index++) {
        const id = player.buffs[index];
        const buff = BUFFS[id];
        const x = stripX + 5 + (index % columns) * 15;
        const y = 8 + Math.floor(index / columns) * 12;
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(x, y, 12, 9);
        ctx.strokeStyle = rarityColor(buff.rarity);
        ctx.strokeRect(x, y, 12, 9);
        ctx.fillStyle = rarityColor(buff.rarity);
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "center";
        ctx.fillText(buff.shortCode, x + 6, y + 7);
      }
    }`;

const buffStripCodeNew = `    let currentY = 62;
    // Compact buff strip. Detailed skill and swap information lives on the pause screen.
    if (player.buffs.length > 0) {
      const visibleBuffCount = Math.min(player.buffs.length, BuffSystem.MAX_BUFFS);
      const columns = Math.min(6, visibleBuffCount);
      const rows = Math.ceil(visibleBuffCount / columns);
      const stripWidth = columns * 15 + 7;
      const stripHeight = rows * 12 + 5;
      const stripX = 5;
      drawPixelPanel(ctx, stripX, currentY, stripWidth, stripHeight, "purple");
      for (let index = 0; index < visibleBuffCount; index++) {
        const id = player.buffs[index];
        const buff = BUFFS[id];
        const x = stripX + 5 + (index % columns) * 15;
        const y = currentY + 3 + Math.floor(index / columns) * 12;
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(x, y, 12, 9);
        ctx.strokeStyle = rarityColor(buff.rarity);
        ctx.strokeRect(x, y, 12, 9);
        ctx.fillStyle = rarityColor(buff.rarity);
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "center";
        ctx.fillText(buff.shortCode, x + 6, y + 7);
      }
      currentY += stripHeight + 2;
    }

    let combatTag = "";
    let combatTagColor: string = UI_COLORS.muted;
    let combatTagTone: UiTone = "neutral";
    if (player.characterId === "mage") {
      combatTag = \`ECHO \${Math.min(SkillController.MAGE_ECHO_THRESHOLD, Math.floor(player.mageArcaneCharge * 10) / 10)}/\${SkillController.MAGE_ECHO_THRESHOLD}\`;
      combatTagColor = UI_COLORS.purple;
      combatTagTone = "purple";
    } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
      combatTag = \`TRACE \${player.micheleMarkTimer.toFixed(1)}S\`;
      combatTagColor = UI_COLORS.yellow;
      combatTagTone = "yellow";
    } else if (player.characterId === "celestia" && player.celestiaTemporaryArmor > 0) {
      combatTag = \`STAR AR +\${Math.ceil(player.celestiaTemporaryArmor)}\`;
      combatTagColor = UI_COLORS.cyanBright;
      combatTagTone = "cyan";
    }

    if (combatTag) {
      drawPixelPanel(ctx, 5, currentY, 65, 15, combatTagTone);
      ctx.textAlign = "left";
      ctx.fillStyle = combatTagColor;
      ctx.font = uiFont(language, 5, true);
      ctx.fillText(combatTag, 11, currentY + 11);
      currentY += 17;
    }

    const currentCoins = engine.data.data.player.coins;
    if (UIRenderer.lastCoinAmount === -1) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = Date.now() + 3000;
    } else if (currentCoins !== UIRenderer.lastCoinAmount) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = Date.now() + 3000;
    }

    const timeRemaining = UIRenderer.coinDisplayUntil - Date.now();
    if (timeRemaining > 0) {
      let alpha = 1;
      if (timeRemaining < 500) {
        alpha = timeRemaining / 500;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      drawPixelPanel(ctx, 5, currentY, 45, 15, "yellow");
      drawUiIcon(ctx, "coin", 11, currentY + 4, UI_COLORS.yellow);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(String(currentCoins), 23, currentY + 11);
      ctx.restore();
    }`;

code = code.replace(buffStripCodeOld, buffStripCodeNew);

// 5. Weapon Panel & Stage info
const oldWeaponCode = `    // Primary weapon receives most of the visual weight; the standby slot is
    // deliberately smaller to reduce the old two-card wall at the bottom.
    drawPixelPanel(ctx, 5, 199, 181, 36, "cyan", true);
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (activeWeapon) {
      const activeColor = rarityColor(activeWeapon.rarity);
      ctx.fillStyle = UI_COLORS.panelSoft;
      ctx.fillRect(9, 203, 112, 28);
      ctx.strokeStyle = activeColor;
      ctx.strokeRect(9, 203, 112, 28);
      SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${activeWeapon.id}\`, 29, 218, 1);
      const nameLines = splitWeaponName(activeWeapon.name);
      ctx.fillStyle = UI_COLORS.white;
      ctx.textAlign = "left";
      ctx.font = uiFont(language, nameLines.some(line => line.length > 10) ? 5 : 6, true);
      nameLines.slice(0, 2).forEach((line, index) => ctx.fillText(line, 50, 211 + index * 7));
      ctx.fillStyle = activeColor;
      ctx.font = uiFont(language, 5, true);
      const sustain = activeWeapon.sustainEnergyPerSecond ? \` +\${activeWeapon.sustainEnergyPerSecond}/S\` : "";
      ctx.fillText(\`EN \${WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id))}\${sustain}\`, 50, 228);
      if (activeWeapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
        drawMeter(ctx, 87, 225, 29, 4, heatRatio, player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow);
      }
    }

    const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
    const standbyId = player.weaponSlots[standbyIndex];
    ctx.fillStyle = UI_COLORS.panelSoft;
    ctx.fillRect(126, 203, 55, 28);
    ctx.strokeStyle = standbyId ? rarityColor(WEAPONS[standbyId]?.rarity ?? "common") : UI_COLORS.edge;
    ctx.strokeRect(126, 203, 55, 28);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "left";
    ctx.fillText(\`SLOT \${standbyIndex + 1}\`, 130, 210);
    if (standbyId && WEAPONS[standbyId]) {
      const weapon = WEAPONS[standbyId];
      SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${weapon.id}\`, 143, 223, 1);
      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 4, true);
      const shortName = splitWeaponName(weapon.name)[0];
      ctx.fillText(shortName.slice(0, 10), 130, 229);
    } else {
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6);
      ctx.fillText("EMPTY", 136, 224);
    }

    const currentRoom = floor.rooms.find(room => room.x === floor.currentRoomX && room.y === floor.currentRoomY);
    if (currentRoom) {
      let statusText = "LOCKED";
      let tone: UiTone = "red";
      if (currentRoom.type === "start") { statusText = "SAFE"; tone = "neutral"; }
      else if (currentRoom.type === "npc") { statusText = currentRoom.interactionCompleted ? "SILENT" : "BROADCAST"; tone = "purple"; }
      else if (currentRoom.type === "wish_fountain") { statusText = currentRoom.interactionCompleted ? "SPENT" : "WISH"; tone = "purple"; }
      else if (currentRoom.type === "photo_booth") { statusText = currentRoom.interactionCompleted ? "PRINTED" : "PHOTO"; tone = "purple"; }
      else if (currentRoom.type === "exit") { statusText = "PORTAL"; tone = "cyan"; }
      else if (currentRoom.type === "shop") { statusText = "MERCHANT"; tone = "yellow"; }
      else if (roomPhase === "exploration" || roomPhase === "cleared") { statusText = roomPhase === "cleared" ? "CLEAR" : "OPEN"; tone = "green"; }
      else if (roomPhase === "reward") { statusText = "REWARD"; tone = "yellow"; }

      drawPixelPanel(ctx, 194, 211, 121, 24, tone);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 7, true);
      const modeLabel = floor.challengeId ? "+CH" : floor.hardMode ? "HARD" : "";
      ctx.fillText(\`\${floor.chapterIndex}-\${floor.stageIndex} \${floor.theme.toUpperCase()} \${modeLabel}\`, 200, 220);
      drawBadge(ctx, \`\${currentRoom.type.toUpperCase()} · \${statusText}\`, 199, 223, 111, language, tone);
    }`;

const newWeaponCode = `    const wY = 210;
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (activeWeapon) {
      const activeColor = rarityColor(activeWeapon.rarity);
      ctx.fillStyle = UI_COLORS.panelSoft;
      ctx.fillRect(5, wY, 90, 25);
      ctx.strokeStyle = activeColor;
      ctx.strokeRect(5, wY, 90, 25);
      SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${activeWeapon.id}\`, 18, wY + 12, 0.9);
      const nameLines = splitWeaponName(activeWeapon.name);
      ctx.fillStyle = UI_COLORS.white;
      ctx.textAlign = "left";
      ctx.font = uiFont(language, nameLines.some(line => line.length > 10) ? 5 : 6, true);
      nameLines.slice(0, 2).forEach((line, index) => ctx.fillText(line, 35, wY + 8 + index * 7));
      ctx.fillStyle = activeColor;
      ctx.font = uiFont(language, 5, true);
      const sustain = activeWeapon.sustainEnergyPerSecond ? \` +\${activeWeapon.sustainEnergyPerSecond}/S\` : "";
      ctx.fillText(\`EN \${WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id))}\${sustain}\`, 35, wY + 22);
      if (activeWeapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
        drawMeter(ctx, 65, wY + 19, 17, 4, heatRatio, player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow);
      }
    }

    const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
    const standbyId = player.weaponSlots[standbyIndex];
    ctx.fillStyle = UI_COLORS.panelSoft;
    ctx.fillRect(97, wY, 45, 25);
    ctx.strokeStyle = standbyId ? rarityColor(WEAPONS[standbyId]?.rarity ?? "common") : UI_COLORS.edge;
    ctx.strokeRect(97, wY, 45, 25);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "left";
    ctx.fillText(\`SLOT \${standbyIndex + 1}\`, 101, wY + 7);
    if (standbyId && WEAPONS[standbyId]) {
      const weapon = WEAPONS[standbyId];
      SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${weapon.id}\`, 112, wY + 17, 0.8);
      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 4, true);
      const shortName = splitWeaponName(weapon.name)[0];
      ctx.fillText(shortName.slice(0, 10), 101, wY + 23);
    } else {
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6);
      ctx.fillText("EMPTY", 106, wY + 18);
    }

    ctx.textAlign = "right";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(\`\${floor.chapterIndex}-\${floor.stageIndex}\`, 312, 14);`;

code = code.replace(oldWeaponCode, newWeaponCode);

fs.writeFileSync('src/game/render/UIRenderer.ts', code);
