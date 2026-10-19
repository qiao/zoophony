// Checks += and @file of the config changes of rig-mesh.
import { readFileSync } from 'node:fs';

import { newKeys, setConfig } from '../../../tools/rig-mesh.ts';

const file = process.argv[2] ?? '';
for (const animal of ['pig', 'rabbit']) {
  const text = readFileSync(`tools/mesh-rigs/${animal}.json`, 'utf8');
  const before = JSON.parse(text).raise;
  const after = JSON.parse(setConfig(text, `raise+=@${file}`)).raise;
  const count = (value: unknown): number => (Array.isArray(value) ? value.length : value ? 1 : 0);
  console.log(`${animal}: raise ${count(before)} -> ${count(after)}, new keys [${newKeys(text, `raise+=@${file}`).join(', ')}], last side ${after.at(-1).side}`);
}
const text = readFileSync('tools/mesh-rigs/pig.json', 'utf8');
for (const bad of ['armFactor+=1', 'raise+=@nope.json', 'raise+={bad', '+=1', 'nokey.sub+=1']) {
  try {
    setConfig(text, bad);
    console.log(`${bad}: no error`);
  } catch (error) {
    console.log(`${bad}: ${error instanceof Error ? error.message : error}`);
  }
}
const plain = JSON.parse(setConfig(text, 'armFactor=1.4')).armFactor;
console.log(`armFactor=1.4 gives ${plain}`);
