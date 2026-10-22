// Prints the functions with the most main-thread time in a CPU profile of `load-probe.ts
// --profile`: the inclusive time (the function and its calls) and the self time, in ms.
//
// Usage: node docs/research/2026-10-21-load-performance/profile-top.ts <profile.json> [count]
import { readFileSync } from 'node:fs';

interface ProfileNode {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
  children?: number[];
}

interface Profile {
  nodes: ProfileNode[];
  samples: number[];
  timeDeltas: number[];
}

const profile = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8')) as Profile;
const count = Number(process.argv[3] ?? '40');
const parent = new Map<number, number>();
const byId = new Map<number, ProfileNode>();
for (const node of profile.nodes) {
  byId.set(node.id, node);
  for (const child of node.children ?? []) {
    parent.set(child, node.id);
  }
}
const keyOf = (node: ProfileNode): string => {
  const file = node.callFrame.url.split('/').pop() ?? '';
  return `${node.callFrame.functionName || '(anonymous)'} ${file}:${node.callFrame.lineNumber + 1}`;
};
const total = new Map<string, number>();
const self = new Map<string, number>();
for (let i = 0; i < profile.samples.length; i++) {
  const ms = (profile.timeDeltas[i + 1] ?? 0) / 1000;
  let id: number | undefined = profile.samples[i];
  const seen = new Set<string>();
  let first = true;
  while (id !== undefined) {
    const node = byId.get(id);
    if (!node) {
      break;
    }
    const key = keyOf(node);
    if (first) {
      self.set(key, (self.get(key) ?? 0) + ms);
      first = false;
    }
    if (!seen.has(key)) {
      seen.add(key);
      total.set(key, (total.get(key) ?? 0) + ms);
    }
    id = parent.get(id);
  }
}
const rows = [...total.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, count);
for (const [key, ms] of rows) {
  console.log(`${ms.toFixed(0).padStart(7)} ${(self.get(key) ?? 0).toFixed(0).padStart(7)}  ${key}`);
}
