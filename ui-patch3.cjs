const fs = require('fs');
let code = fs.readFileSync('src/game/render/UIRenderer.ts', 'utf8');

const oldWeaponCodeRegex = /\/\/ FPS Style Weapon UI - Bottom Right[\s\S]*?ctx\.textAlign = "left";\n  }\n}/;

const newWeaponCode = `    // FPS Style Weapon UI - Bottom Right
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (activeWeapon) {
      const activeColor = rarityColor(activeWeapon.rarity);
      const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
      const standbyId = player.weaponSlots[standbyIndex];
      
      const bottomY = 226;
      const rightX = 310;
      
      // Energy Bar
      const energyY = bottomY - 28;
      const energyWidth = 55;
      
      drawMeter(ctx, rightX - energyWidth, energyY, energyWidth, 4, player.maxMana > 0 ? player.mana / player.maxMana : 0, "#4A9EF0", 0);
      
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 6, true);
      ctx.textAlign = "right";
      const manaStr = \`\${Math.floor(player.mana)}/\${player.maxMana}\`;
      ctx.fillText(manaStr, rightX, energyY - 3);
      
      ctx.fillStyle = "#4A9EF0";
      ctx.font = uiFont(language, 5, true);
      const manaTextWidth = ctx.measureText(manaStr).width;
      ctx.fillText("EN", rightX - manaTextWidth - 4, energyY - 3);

      // Standby Weapon
      if (standbyId && WEAPONS[standbyId]) {
        const weapon = WEAPONS[standbyId];
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = UI_COLORS.text;
        ctx.textAlign = "right";
        ctx.font = uiFont(language, 5, true);
        ctx.fillText(weapon.name.toUpperCase(), rightX, bottomY - 13);
        
        ctx.save();
        ctx.translate(rightX - 72, bottomY - 17);
        ctx.scale(-1, 1);
        SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${weapon.id}\`, 0, 0, 0.7);
        ctx.restore();
        ctx.globalAlpha = 1.0;
      }

      // Active Weapon
      ctx.textAlign = "right";
      ctx.fillStyle = activeColor;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(activeWeapon.name.toUpperCase(), rightX, bottomY);
      
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 8, true);
      const sustain = activeWeapon.sustainEnergyPerSecond ? \` +\${activeWeapon.sustainEnergyPerSecond}/S\` : "";
      const costStr = WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id));
      ctx.fillText(\`EN \${costStr}\${sustain}\`, rightX, bottomY + 9);
      
      ctx.save();
      ctx.translate(rightX - 80, bottomY - 4);
      ctx.scale(-1, 1);
      SpriteRenderer.drawPixelSprite(ctx, \`weapon_\${activeWeapon.id}\`, 0, 0, 1.0);
      ctx.restore();

      if (activeWeapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
        drawMeter(ctx, rightX - 40, bottomY + 13, 40, 2, heatRatio, player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow, 0);
      }
    }

    ctx.textAlign = "right";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(\`\${floor.chapterIndex}-\${floor.stageIndex}\`, 312, 14);
    ctx.textAlign = "left";
  }
}`;

code = code.replace(oldWeaponCodeRegex, newWeaponCode);
fs.writeFileSync('src/game/render/UIRenderer.ts', code);
