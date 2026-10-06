import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

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

describe('the text of a silent seat (design 2.8, review of step 6, N3)', () => {
  const panel = color(UI_CSS, 'var(--panel)');
  const backgrounds = {
    panel,
    hover: over(color(UI_CSS, declaration(UI_CSS, '.seat:hover', 'background')), 1, panel),
    marked: over(color(UI_CSS, declaration(UI_CSS, '.seat.is-open', 'background')), 1, panel),
  };
  const opacity = Number(declaration(UI_CSS, '.seat.silent .name', 'opacity'));
  const texts = {
    name: color(UI_CSS, 'var(--text)'),
    source: color(UI_CSS, declaration(UI_CSS, '.seat small', 'color')),
  };

  it.each(Object.entries(backgrounds))('meets 4.5:1 on the %s row', (_, background) => {
    for (const text of Object.values(texts)) {
      expect(contrast(over(text, opacity, background), background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('is dimmer than the text of a seat that sounds', () => {
    expect(opacity).toBeLessThan(1);
  });

  it('has the opacity of the prototype', () => {
    expect(declaration(PROTOTYPE, '.seat.silent .name', 'opacity')).toBe(String(opacity));
  });
});
