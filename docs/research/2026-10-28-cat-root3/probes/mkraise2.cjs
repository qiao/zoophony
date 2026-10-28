// mkraise2.cjs <out.json> <JSON of follow extras> [<which shapes>]: the raise list of HEAD with
// extra keys in follow of the chosen shapes.
const fs = require('fs');
const c = JSON.parse(require('child_process').execSync('git show HEAD:tools/mesh-rigs/cat.json'));
const [out, extra, which = '012'] = process.argv.slice(2);
c.raise.forEach((r, i) => { if (which.includes(String(i)) && r.follow) Object.assign(r.follow, JSON.parse(extra)); });
fs.writeFileSync(out, JSON.stringify(c.raise, null, 2));
