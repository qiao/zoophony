import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LOGO_BACKDROP_LIMIT,
  SHADE_ALPHA,
  SHADE_RGB,
  TEXT_BACKDROP_LIMIT,
  shadeLevel,
} from './title-shade.ts';

/** The stylesheet of the UI. */
const UI_CSS = readFileSync(join(import.meta.dirname, 'ui.css'), 'utf8');

/** The UI prototype of design 2.8, with its stylesheet. */
const PROTOTYPE = readFileSync(
  join(import.meta.dirname, '..', '..', 'docs', 'prototype', 'ui.html'),
  'utf8',
);

/** The smallest contrast ratio of WCAG 2.2 AA for text of normal size. */
const AA_TEXT = 4.5;

/** A color: red, green, and blue from 0 to 255, and the alpha from 0 to 1. */
interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * Gives the value of a property in the first rule of a selector.
 *
 * @param css The stylesheet.
 * @param selector The selector of the rule, exactly as the stylesheet writes it.
 * @param property The property.
 * @returns The value, with no spaces at its ends.
 * @throws Error if the rule or the property is missing.
 */
function declaration(css: string, selector: string, property: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) {
    throw new Error(`The stylesheet has no rule "${selector}".`);
  }
  const body = css.slice(start, css.indexOf('}', start));
  const match = new RegExp(`(?:^|[\\s;{])${property}:\\s*([^;]+);`, 'u').exec(body);
  if (!match?.[1]) {
    throw new Error(`The rule "${selector}" has no property "${property}".`);
  }
  return match[1].trim();
}

/**
 * Reads a color: `#rrggbb`, `rgba(r, g, b, a)`, or `var(--token)` of the `:root` rule.
 *
 * @param css The stylesheet, for the tokens.
 * @param value The color text.
 * @returns The color.
 * @throws Error for another color format.
 */
function color(css: string, value: string): Rgba {
  const token = /^var\((--[\w-]+)\)$/u.exec(value)?.[1];
  if (token) {
    return color(css, declaration(css, ':root', token));
  }
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/iu.exec(value);
  if (hex) {
    return {
      r: parseInt(hex[1] ?? '', 16),
      g: parseInt(hex[2] ?? '', 16),
      b: parseInt(hex[3] ?? '', 16),
      a: 1,
    };
  }
  const rgba = /^rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)$/u.exec(value);
  if (rgba) {
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: Number(rgba[4]) };
  }
  throw new Error(`The color "${value}" has no known format.`);
}

/**
 * Puts a color with an opacity over an opaque color.
 *
 * @param top The upper color. Its alpha multiplies the opacity.
 * @param opacity The opacity of the upper color, from 0 to 1.
 * @param bottom The opaque lower color.
 * @returns The opaque mix.
 */
function over(top: Rgba, opacity: number, bottom: Rgba): Rgba {
  const a = top.a * opacity;
  const mix = (t: number, b: number): number => a * t + (1 - a) * b;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

/**
 * Calculates the relative luminance of WCAG 2.2.
 *
 * @param c The opaque color.
 * @returns The luminance from 0 to 1.
 */
function luminance(c: Rgba): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/**
 * Calculates the contrast ratio of WCAG 2.2 between two opaque colors.
 *
 * @param a The first color.
 * @param b The second color.
 * @returns The ratio from 1 to 21.
 */
function contrast(a: Rgba, b: Rgba): number {
  const [high, low] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

/** White, the lightest color behind the panel of the drawer: white fur in a close shot. */
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/** Black, the darkest color behind the panel of the drawer. */
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

describe('the text of a silent seat (design 2.8, review of step 6, N3)', () => {
  const glass = color(UI_CSS, declaration(UI_CSS, '.drawer', 'background'));
  const opacity = Number(declaration(UI_CSS, '.seat.silent .name', 'opacity'));
  const texts = {
    name: color(UI_CSS, 'var(--text)'),
    source: color(UI_CSS, declaration(UI_CSS, '.seat small', 'color')),
  };
  const rows = Object.entries({ white: WHITE, black: BLACK }).flatMap(([name, behind]) => {
    const panel = over(glass, 1, behind);
    return Object.entries({
      panel,
      hover: over(color(UI_CSS, declaration(UI_CSS, '.seat:hover', 'background')), 1, panel),
      marked: over(color(UI_CSS, declaration(UI_CSS, '.seat.is-open', 'background')), 1, panel),
    }).map(([row, background]) => [`${row} row over ${name}`, background] as const);
  });

  it.each(rows)('meets 4.5:1 on the %s', (_, background) => {
    for (const text of Object.values(texts)) {
      expect(contrast(over(text, opacity, background), background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('has a panel that is nearly opaque', () => {
    expect(glass.a).toBeGreaterThanOrEqual(0.9);
  });

  it('is dimmer than the text of a seat that sounds', () => {
    expect(opacity).toBeLessThan(1);
  });

  it('has the opacity of the prototype', () => {
    expect(declaration(PROTOTYPE, '.seat.silent .name', 'opacity')).toBe(String(opacity));
  });
});

describe('the title over a light animal (design 2.8, audit 2026-10-05-ux-design, VD1)', () => {
  const shade = color(UI_CSS, declaration(UI_CSS, '.title::before', 'background'));
  const behind = over(shade, 1, WHITE);

  it('keeps 4.5:1 for the composer line and the title over white fur', () => {
    for (const text of ['var(--text-dim)', 'var(--text)']) {
      expect(contrast(color(UI_CSS, text), behind)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

/**
 * The backdrops of the level test: each gray, and the colors of the scene (white and gold fur,
 * the warm floor, the beam, and full red, green, and blue) at each brightness.
 */
const BACKDROPS: readonly Rgba[] = [
  ...Array.from({ length: 256 }, (_, v) => ({ r: v, g: v, b: v, a: 1 })),
  ...[
    [255, 244, 225],
    [240, 198, 118],
    [255, 150, 60],
    [255, 220, 160],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [0, 255, 255],
    [255, 0, 255],
  ].flatMap(([r = 0, g = 0, b = 0]) =>
    Array.from({ length: 51 }, (_, step) => ({
      r: Math.round((r * step) / 50),
      g: Math.round((g * step) / 50),
      b: Math.round((b * step) / 50),
      a: 1,
    })),
  ),
];

describe('the level of the title shade over each backdrop (design 2.8)', () => {
  const shade = color(UI_CSS, declaration(UI_CSS, '.title::before', 'background'));
  const lines = {
    logo: [color(UI_CSS, declaration(UI_CSS, '.title .logo', 'color')), LOGO_BACKDROP_LIMIT],
    title: [color(UI_CSS, declaration(UI_CSS, ':root', 'color')), TEXT_BACKDROP_LIMIT],
    composer: [color(UI_CSS, declaration(UI_CSS, '.title p', 'color')), TEXT_BACKDROP_LIMIT],
  } as const;

  it('has the color and the alpha of --title-shade', () => {
    expect([shade.r, shade.g, shade.b]).toEqual(SHADE_RGB);
    expect(shade.a).toBe(SHADE_ALPHA);
  });

  it.each(Object.entries(lines))(
    'keeps 4.5:1 for the %s over each backdrop',
    (_, [text, limit]) => {
      for (const backdrop of BACKDROPS) {
        const level = shadeLevel(luminance(backdrop), limit);
        const behind = over(shade, level, backdrop);
        expect(contrast(text, behind), JSON.stringify(backdrop)).toBeGreaterThanOrEqual(AA_TEXT);
      }
    },
  );
});

/** One inset of the title shade: a length in pixels, or a share of the title box. */
interface Inset {
  readonly px: number;
  /** The share of the width or the height of the title box, from 0. */
  readonly share: number;
}

/**
 * Splits a CSS value at the spaces outside of parentheses: `calc(-1 * x) -90%` gives two parts.
 *
 * @param value The value.
 * @returns The parts.
 */
function topLevelParts(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let part = '';
  for (const char of value) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    if (/\s/u.test(char) && depth === 0) {
      if (part) {
        parts.push(part);
      }
      part = '';
    } else {
      part += char;
    }
  }
  if (part) {
    parts.push(part);
  }
  return parts;
}

describe('the shape of the title shade (design 2.8, audit 2026-10-06-ux-design-2, N21)', () => {
  /**
   * Reads a share of the insets of the shade: `-90%`.
   *
   * @param value The length.
   * @returns The share of the title box, with no pixels.
   */
  function insetOf(value: string): Inset {
    const share = /^-(\d+)%$/u.exec(value)?.[1];
    if (share !== undefined) {
      return { px: 0, share: Number(share) / 100 };
    }
    throw new Error(`The inset "${value}" has no known format.`);
  }

  const mask = declaration(UI_CSS, '.title::before', 'mask-image');
  const insets = topLevelParts(declaration(UI_CSS, '.title::before', 'inset'));
  const [, right, bottom] = insets.map((value) => (value.endsWith('%') ? insetOf(value) : null));

  it('starts at the corner of the window, so its top and left edges do not show', () => {
    // The box of the shade reaches from the title box to the window edges. With 16 px above and
    // left of the title box, a strip of a light floor showed between the window and a hard edge.
    expect(declaration(UI_CSS, '.title', 'top')).toBe('var(--title-top)');
    expect(declaration(UI_CSS, '.title', 'left')).toBe('var(--title-left)');
    expect(insets[0]).toBe('calc(-1 * var(--title-top))');
    expect(insets[3]).toBe('calc(-1 * var(--title-left))');
  });

  it('is an ellipse from the corner of the window, with no straight edge', () => {
    expect(mask).toMatch(/^radial-gradient\(\s*farthest-side at 0 0,/u);
    expect(mask).not.toMatch(/linear-gradient/u);
  });

  it('is opaque behind the text of each title length', () => {
    const opaque = Number(/#000 (\d+)%/u.exec(mask)?.[1]) / 100;
    if (!right || !bottom) {
      throw new Error('The shade has no right and bottom shares.');
    }
    // The text box: the logo and its gap (30 px on a phone, 50 px on a wider screen), the serif
    // title (24 px to 36 px, one or two lines), and the composer line (13 px to 16 px), from
    // 70 px to 160 px high, and from 110 px (the logo) to 720 px wide. It stands 12 px or 14 px from the
    // top, and 16 px to 40 px from the left (`--title-top`, `--title-left`).
    for (const [left, top] of [
      [16, 12],
      [40, 14],
    ] as const) {
      for (let height = 70; height <= 160; height += 10) {
        for (let width = 110; width <= 720; width += 10) {
          const boxWidth = left + width * (1 + right.share);
          const boxHeight = top + height * (1 + bottom.share);
          const x = (left + width) / boxWidth;
          const y = (top + height) / boxHeight;
          expect(Math.hypot(x, y), `${width} × ${height} at ${left}, ${top}`).toBeLessThanOrEqual(
            opaque,
          );
        }
      }
    }
  });
});
