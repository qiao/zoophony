import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { APP_NAME } from '../app/page-title.ts';
import { PAW_MARKUP, WORDMARK_PATH, WORDMARK_VIEW_BOX } from './icons.ts';

const INDEX_HTML = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8');

describe('the logo of the load state (design 2.8)', () => {
  it('shows the paw and the wordmark before the script runs, as the title does', () => {
    const logo = /<div class="logo">([\s\S]*?)<\/div>/u.exec(INDEX_HTML)?.[1] ?? '';
    expect(logo).toContain(PAW_MARKUP);
    expect(logo).toContain(`viewBox="${WORDMARK_VIEW_BOX}" role="img" aria-label="${APP_NAME}"`);
    expect(logo).toContain(`<path d="${WORDMARK_PATH}"/>`);
  });

  it('draws the paw with four toes and one pad', () => {
    expect(PAW_MARKUP.match(/<ellipse /gu)).toHaveLength(4);
    expect(PAW_MARKUP.match(/<path /gu)).toHaveLength(1);
  });
});
