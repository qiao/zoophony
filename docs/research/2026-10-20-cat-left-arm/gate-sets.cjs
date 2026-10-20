// Prints the p50 and the p95 (the p5 of the flat share) of each sample set of the arm gate of the
// violist, from the cache files of `pnpm arm-check` (research of 2026-10-20, round `cat-arm`).
// Usage, from the root of the tree: node docs/research/2026-10-20-cat-left-arm/gate-sets.cjs
// <name>=<cache file>...
const fs = require('fs');
for (const arg of process.argv.slice(2)) {
  const [name, file] = arg.split('=');
  const role = JSON.parse(fs.readFileSync(file, 'utf8')).roles.violist;
  for (const side of ['L', 'R']) {
    console.log(`${name} ${side}`);
    for (const [measure, sets] of Object.entries(role.arms[side])) {
      const low = measure === 'flat' ? 'p5' : 'p95';
      const digits = measure === 'flat' || measure === 'stretch' ? 2 : 0;
      const value = (set, key) => (set && set[key] != null ? Number(set[key]).toFixed(digits) : '-');
      console.log(
        `  ${measure}: play ${value(sets.play, 'p50')}/${value(sets.play, low)}, lift ${value(sets.lift, 'p50')}/${value(sets.lift, low)}, rest ${value(sets.rest, 'p50')}`,
      );
    }
  }
}
