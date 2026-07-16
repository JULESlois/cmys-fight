const fs = require('fs');
let code = fs.readFileSync('src/game/render/UIRenderer.ts', 'utf8');

// 1. Attributes panel
code = code.replace(
  `drawPixelPanel(ctx, 5, 5, 110, 55, "cyan", true);`,
  `drawPixelPanel(ctx, 5, 5, 80, 55, "cyan", true);`
);
code = code.replace(
  `drawMeter(ctx, 23, row.y + 1, 55, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);`,
  `drawMeter(ctx, 23, row.y + 1, 32, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);`
);
code = code.replace(
  `ctx.fillText(\`\${Math.floor(row.value)}/\${row.max}\`, 110, row.y + 7);`,
  `ctx.fillText(\`\${Math.floor(row.value)}/\${row.max}\`, 80, row.y + 7);`
);
code = code.replace(
  `drawMeter(ctx, 23, 50, 55, 6, skillReady, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);`,
  `drawMeter(ctx, 23, 50, 32, 6, skillReady, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);`
);
code = code.replace(
  `ctx.fillText(player.skillCooldown <= 0 ? "READY" : \`\${player.skillCooldown.toFixed(1)}S\`, 110, 55);`,
  `ctx.fillText(player.skillCooldown <= 0 ? "RDY" : \`\${player.skillCooldown.toFixed(1)}S\`, 80, 55);`
);

// 2. Status effects
code = code.replace(
  `drawPixelPanel(ctx, 120, 52, effects.length * 29 + 8, 15, "red");`,
  `drawPixelPanel(ctx, 90, 52, effects.length * 29 + 8, 15, "red");`
);
code = code.replace(
  `const x = 125 + index * 29;`,
  `const x = 95 + index * 29;`
);

// 3. Buffs, Combat Tag, Coins
const midSectionOld = `    let currentY = 62;
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

const midSectionNew = `    let currentY = 64;
    // Compact buff strip, no pixelui.
    if (player.buffs.length > 0) {
      const visibleBuffCount = Math.min(player.buffs.length, BuffSystem.MAX_BUFFS);
      const columns = Math.min(6, visibleBuffCount);
      const rows = Math.ceil(visibleBuffCount / columns);
      const stripX = 5;
      for (let index = 0; index < visibleBuffCount; index++) {
        const id = player.buffs[index];
        const buff = BUFFS[id];
        const x = stripX + (index % columns) * 15;
        const y = currentY + Math.floor(index / columns) * 12;
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(x, y, 12, 9);
        ctx.strokeStyle = rarityColor(buff.rarity);
        ctx.strokeRect(x, y, 12, 9);
        ctx.fillStyle = rarityColor(buff.rarity);
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "center";
        ctx.fillText(buff.shortCode, x + 6, y + 7);
      }
      currentY += rows * 12 + 4;
    }

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
      ctx.textAlign = "left";
      ctx.fillStyle = combatTagColor;
      ctx.font = uiFont(language, 5, true);
      ctx.fillText(combatTag, 5, currentY + 6);
      currentY += 12;
    }

    const currentCoins = engine.data.data.player.coins;
    if (UIRenderer.lastCoinAmount === -1) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = 0;
    } else if (currentCoins !== UIRenderer.lastCoinAmount) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = Date.now() + 3000;
    }

    const timeRemaining = UIRenderer.coinDisplayUntil - Date.now();
    if (timeRemaining > 0) {
      let alpha = 1;
      if (timeRemaining > 2500) {
        alpha = (3000 - timeRemaining) / 500;
      } else if (timeRemaining < 500) {
        alpha = timeRemaining / 500;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      drawUiIcon(ctx, "coin", 5, currentY, UI_COLORS.yellow);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(String(currentCoins), 15, currentY + 7);
      ctx.restore();
    }`;

code = code.replace(midSectionOld, midSectionNew);

// 4. Weapon UI FPS style
const oldWeaponCode = `    const wY = 210;
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
    }`;

const newWeaponCode = `    // FPS Style Weapon UI - Bottom Right
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (activeWeapon) {
      const activeColor = rarityColor(activeWeapon.rarity);
      const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
      const standbyId = player.weaponSlots[standbyIndex];
      
      const bottomY = 230;
      const rightX = 310;
      
      // Standby Weapon
      if (standbyId && WEAPONS[standbyId]) {
        const weapon = WEAPONS[standbyId];
        ctx.globalAlpha = 0.5;
        const shortName = splitWeaponName(weapon.name)[0];
        ctx.fillStyle = UI_COLORS.text;
        ctx.textAlign = "right";
        ctx.font = uiFont(language, 5, true);
        ctx.fillText(shortName.slice(0, 10), rightX, bottomY - 14);
        
        ctx.save();
        ctx.translate(rightX - 35, bottomY - 17);
        ctx.scale(-1, 1);
        SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${weapon.id}\`, 0, 0, 0.7);
        ctx.restore();
        ctx.globalAlpha = 1.0;
      }

      // Active Weapon
      ctx.textAlign = "right";
      const nameLines = splitWeaponName(activeWeapon.name);
      ctx.fillStyle = activeColor;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(nameLines[0], rightX, bottomY - 2);
      
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 8, true);
      const sustain = activeWeapon.sustainEnergyPerSecond ? \` +\${activeWeapon.sustainEnergyPerSecond}/S\` : "";
      const costStr = WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id));
      ctx.fillText(\`EN \${costStr}\${sustain}\`, rightX, bottomY + 7);
      
      ctx.save();
      ctx.translate(rightX - 50, bottomY - 4);
      ctx.scale(-1, 1);
      SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${activeWeapon.id}\`, 0, 0, 1.0);
      ctx.restore();

      if (activeWeapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
        drawMeter(ctx, rightX - 30, bottomY + 11, 30, 2, heatRatio, player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow, 0);
      }
    }`;

code = code.replace(oldWeaponCode, newWeaponCode);

fs.writeFileSync('src/game/render/UIRenderer.ts', code);
