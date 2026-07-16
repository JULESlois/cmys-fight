const fs = require('fs');
let code = fs.readFileSync('src/game/i18n.ts', 'utf8');

code = code.replace(
  /"menu\.settings": "SETTINGS",\n  "menu\.saved": "RUN SAVED",/,
  '"menu.settings": "SETTINGS",\n  "menu.quit": "RETURN TO TITLE",\n  "menu.saved": "RUN SAVED",'
);

code = code.replace(
  /"menu\.settings": "设置",\n  "menu\.saved": "进度已保存",/,
  '"menu.settings": "设置",\n  "menu.quit": "返回主菜单",\n  "menu.saved": "进度已保存",'
);

fs.writeFileSync('src/game/i18n.ts', code);
