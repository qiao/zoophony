// Counts the triangles of each bowed string and its bow. Usage: node docs/research/2026-10-29-string-models/tri.ts
import { buildBowedString } from '../../../src/models/instruments/strings.ts';
for (const id of ['violin', 'viola', 'cello', 'contrabass'] as const) {
  const m = buildBowedString(id);
  const n = m.pieces.map((p) => p.parts.reduce((k, q) => k + q.corners.length / 9, 0));
  console.log(id, n.join(' + '), '=', n.reduce((a, b) => a + b, 0), 'size', m.size.map((x) => x.toFixed(3)).join(' '));
}
