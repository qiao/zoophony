import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** The root folder of the repository. */
const ROOT = join(import.meta.dirname, '..');

/** The names of the decision files in `docs/decisions/`. */
const DECISION_FILES = readdirSync(join(ROOT, 'docs/decisions')).filter((name) =>
  name.endsWith('.md'),
);

/** The text of `docs/design.md`, which lists the decision files in section 10. */
const DESIGN_INDEX = readFileSync(join(ROOT, 'docs/design.md'), 'utf8');

describe('the list of decision files in docs/design.md (section 10)', () => {
  it('links each file of docs/decisions/', () => {
    const missing = DECISION_FILES.filter((name) => !DESIGN_INDEX.includes(`](decisions/${name})`));

    expect(missing).toEqual([]);
  });

  it('links no decision file that does not exist', () => {
    const linked = [...DESIGN_INDEX.matchAll(/\]\(decisions\/([^)]+\.md)\)/g)].map(
      (match) => match[1],
    );
    const dead = linked.filter((name) => name === undefined || !DECISION_FILES.includes(name));

    expect(linked.length).toBeGreaterThan(0);
    expect(dead).toEqual([]);
  });
});
