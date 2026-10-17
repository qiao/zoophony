// Prints the largest depth of each pair of each set for each variant of a hold-fit JSON.
const j = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const strip = process.argv[3] ?? '';
for (const r of j.rows) {
  const worst = new Map();
  for (const d of r.results ?? []) {
    for (const s of d.sets) {
      for (const p of s.pairs) {
        const key = `${s.name} ${p.part}>${p.into}`;
        const old = worst.get(key);
        if (!old || p.depth > old.depth) worst.set(key, { depth: p.depth, bone: p.bone });
      }
    }
  }
  const cells = [...worst].filter(([, v]) => v.depth > 0.002).map(([k, v]) => `${k} ${(v.depth * 100).toFixed(1)}${v.bone ? ' ' + v.bone : ''}`);
  console.log(`${(r.variant ?? 'base').split(strip).join('') || 'base'}: ${cells.join('; ')}`);
}
