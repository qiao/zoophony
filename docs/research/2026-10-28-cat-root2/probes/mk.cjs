// node scratch/mk.js <out.json> <js expression on r (the raise list of main)>: writes a raise list.
const fs = require('fs');
const { execSync } = require('child_process');
const c = JSON.parse(execSync('git show HEAD:tools/mesh-rigs/cat.json', { encoding: 'utf8' }));
const r = c.raise;
const pts = r[0].follow.points;
eval(process.argv[3]);
fs.writeFileSync(process.argv[2], JSON.stringify(r, null, 2));
