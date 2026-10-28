// mkraise.cjs <out.json> <rounds> <step> [<which shapes, e.g. 012>]: the raise list of cat.json
// with follow.fill on the chosen shapes.
const fs = require('fs');
const c = JSON.parse(require('child_process').execSync('git show HEAD:tools/mesh-rigs/cat.json'));
const [out, rounds, step, which = '012'] = process.argv.slice(2);
c.raise.forEach((r, i) => { if (which.includes(String(i)) && r.follow) r.follow.fill = { rounds: Number(rounds), step: Number(step) }; });
fs.writeFileSync(out, JSON.stringify(c.raise, null, 2));
