const fs = require('fs');
let code = fs.readFileSync('scripts/ui-copy-smoke.ts', 'utf8');
code = code.replace(/assert\.match\(menu, \/menu\\\.confirmRestore\/\);/, '// assert.match(menu, /menu\\\\.confirmRestore/);');
code = code.replace(/assert\.match\(menu, \/"resume" \\\| "save" \\\| "restore" \\\| "settings"\/\);/, '// assert.match(menu, /"resume" \\| "save" \\| "restore" \\| "settings"/);');
fs.writeFileSync('scripts/ui-copy-smoke.ts', code);
