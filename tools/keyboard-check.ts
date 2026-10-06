import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { preview } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';

/** The result of one keyboard operation of one control. */
export interface KeyCheck {
  /** The size of the page, for example `1440 × 900`. */
  readonly size: string;
  /** The control, by its accessible name. */
  readonly control: string;
  /** The keys, in order. */
  readonly keys: string;
  /** What the page did. */
  readonly result: string;
  readonly pass: boolean;
}

/**
 * Writes the results of the keyboard check as a Markdown table.
 *
 * @param checks The results, in order.
 * @returns The table, with a line for each result.
 */
export function checkTable(checks: readonly KeyCheck[]): string {
  const cell = (text: string): string => text.replaceAll('|', '\\|');
  const rows = checks.map(
    (c) =>
      `| ${c.size} | ${cell(c.control)} | ${cell(c.keys)} | ${cell(c.result)} | ${c.pass ? 'pass' : 'fail'} |`,
  );
  return ['| Size | Control | Keys | Result | Check |', '|---|---|---|---|---|', ...rows].join(
    '\n',
  );
}

/**
 * Lists the failed checks.
 *
 * @param checks The results.
 * @returns One line for each failed check. An empty list is a pass.
 */
export function failedChecks(checks: readonly KeyCheck[]): string[] {
  return checks
    .filter((c) => !c.pass)
    .map((c) => `${c.size}: ${c.control} (${c.keys}): ${c.result}`);
}

/** A valid MIDI file of one note: format 0, 480 ticks for each quarter note. */
const ONE_NOTE_FILE = Buffer.from([
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 13,
  0x00, 0x90, 0x3c, 0x40, 0x83, 0x60, 0x80, 0x3c, 0x00, 0x00, 0xff, 0x2f, 0x00,
]);

/**
 * Gives the test of one accessible name.
 *
 * @param name The name.
 * @returns A test that is true for this name only.
 */
function named(name: string): (label: string) => boolean {
  return (label) => label === name;
}

/** The checks of one page size, with the helpers that read the page. */
class Checker {
  readonly checks: KeyCheck[] = [];
  readonly #page: Page;
  readonly #size: string;

  /**
   * Creates the checker of a page.
   *
   * @param page The page.
   * @param size The size of the page, for the table.
   */
  constructor(page: Page, size: string) {
    this.#page = page;
    this.#size = size;
  }

  /**
   * Records one result.
   *
   * @param control The control.
   * @param keys The keys.
   * @param result What the page did.
   * @param pass True if the page did what the design asks.
   */
  record(control: string, keys: string, result: string, pass: boolean): void {
    this.checks.push({ size: this.#size, control, keys, result, pass });
    // The progress goes to stderr, so that the table on stdout stays whole.
    console.error(`${pass ? 'pass' : 'FAIL'}  ${this.#size}  ${control}: ${result}`);
  }

  /** Gives the accessible name of the element with the focus, or its tag. */
  async focused(): Promise<string> {
    return this.#page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) {
        return 'body';
      }
      const label = element.getAttribute('aria-label');
      const text = element.textContent?.replaceAll(/\s+/gu, ' ').trim() ?? '';
      return label ?? (text || element.tagName.toLowerCase());
    });
  }

  /**
   * Presses Tab until the focus reaches a control, at most 80 times.
   *
   * @param matches Tells if an accessible name is the name of the control.
   * @param back True for Shift+Tab.
   * @returns The count of presses, or -1 if the focus did not reach it.
   */
  async tabTo(matches: (label: string) => boolean, back = false): Promise<number> {
    for (let i = 1; i <= 80; i++) {
      await this.#page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
      if (matches(await this.focused())) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Reads an attribute of an element.
   *
   * @param selector The CSS selector.
   * @param name The attribute.
   * @returns The value, or '' with no such element or attribute.
   */
  async attribute(selector: string, name: string): Promise<string> {
    return (await this.#page.getAttribute(selector, name)) ?? '';
  }

  /**
   * Reads the value of an input or a select.
   *
   * @param selector The CSS selector.
   * @returns The value.
   */
  async value(selector: string): Promise<string> {
    return this.#page.$eval(selector, (element) =>
      element instanceof HTMLInputElement || element instanceof HTMLSelectElement
        ? element.value
        : '',
    );
  }

  /**
   * Presses keys, then waits for the page to show the change.
   *
   * @param keys The keys, in order.
   * @param waitMs The wait after the keys, in milliseconds.
   */
  async press(keys: readonly string[], waitMs = 150): Promise<void> {
    for (const key of keys) {
      await this.#page.keyboard.press(key);
    }
    await this.#page.waitForTimeout(waitMs);
  }
}

/** A file for the file dialog. */
interface ChosenFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

/**
 * Moves the focus to the file button, presses a key on it, and selects a file in the dialog.
 * Under a high load of the machine, the dialog can miss the first key, so the key repeats once.
 *
 * @param c The checker.
 * @param page The page.
 * @param key The key on the button: Enter or Space.
 * @param file The file.
 */
async function chooseFile(c: Checker, page: Page, key: string, file: ChosenFile): Promise<void> {
  await c.tabTo(named('Select a MIDI file'));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 10_000 }),
        page.keyboard.press(key),
      ]);
      await chooser.setFiles(file);
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      console.error(`The file dialog did not open after ${key}. The key repeats.`);
    }
  }
}

/**
 * Tells if the message box is hidden.
 *
 * @param page The page.
 * @returns True with no message.
 */
async function messageHidden(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector('.message')?.hasAttribute('hidden') === true);
}

/**
 * Opens the page at a size, and waits until the samples of the default demo are ready.
 *
 * @param browser The browser.
 * @param url The URL of the page.
 * @param width The width in CSS pixels.
 * @param height The height in CSS pixels.
 * @returns The page and the errors of its console.
 */
async function openPage(
  browser: Browser,
  url: string,
  width: number,
  height: number,
): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.goto(url);
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  return { page, errors };
}

/**
 * Checks the controls of the bar and of the first screen, and the keys of the page.
 *
 * @param c The checker.
 * @param page The page.
 * @param phone True for the phone size, with no speed menu and no volume slider in the bar.
 */
async function checkBar(c: Checker, page: Page, phone: boolean): Promise<void> {
  const first = await c.tabTo(named('Play'));
  const inFirstScreen = await page.evaluate(
    () => document.activeElement?.closest('.first-screen') !== null,
  );
  await c.press(['Enter'], 1500);
  const playing = (await c.attribute('.bar button[aria-label]', 'aria-label')) === 'Pause';
  // The first screen hides, and its focus goes to the play button of the bar (design 2.8).
  const focusAfter = await c.focused();
  c.record(
    'Play (first screen)',
    `Tab x${first}, Enter`,
    `first stop of Tab: ${inFirstScreen}; play starts: ${playing}; focus on "${focusAfter}"`,
    first === 1 && inFirstScreen && playing && focusAfter === 'Pause',
  );

  const toBar = focusAfter === 'Pause' ? 0 : await c.tabTo(named('Pause'));
  await c.press(['Space'], 300);
  const paused = (await c.focused()) === 'Play';
  await c.press(['Enter'], 1500);
  const again = (await c.focused()) === 'Pause';
  c.record(
    'Play and pause (bar)',
    `Tab x${toBar}, Space, Enter`,
    `Space pauses: ${paused}; Enter plays: ${again}`,
    toBar >= 0 && paused && again,
  );

  await c.tabTo(named('Seek'));
  const before = Number(await c.value('.seek'));
  await c.press(['ArrowRight', 'ArrowRight', 'ArrowRight']);
  const after = Number(await c.value('.seek'));
  await c.press(['Home']);
  const home = Number(await c.value('.seek'));
  await c.press(['End'], 400);
  const end = await c.value('.seek');
  const max = await c.attribute('.seek', 'max');
  await c.press(['Home'], 400);
  c.record(
    'Seek',
    'Tab, Right x3, Home, End, Home',
    `${before} s, Right x3 ${after} s, Home ${home} s, End ${end} of ${max} s`,
    after >= before + 2 && home === 0 && end === max,
  );

  if (!phone) {
    await checkPlayback(c, page, 'bar');
  }

  await c.tabTo(named('Mute'));
  await c.press(['Space']);
  const muted = await c.attribute('.bar button[aria-pressed]', 'aria-pressed');
  await c.press(['Enter']);
  const unmuted = await c.attribute('.bar button[aria-pressed]', 'aria-pressed');
  c.record(
    'Mute',
    'Tab, Space, Enter',
    `aria-pressed ${muted}, then ${unmuted}`,
    muted === 'true' && unmuted === 'false',
  );

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  const label = (): Promise<string> => c.attribute('.bar button[aria-label]', 'aria-label');
  const start = await label();
  await c.press(['Space'], 1500);
  const second = await label();
  await c.press(['Space'], 1500);
  const third = await label();
  if (third === 'Play') {
    await c.press(['Space'], 1500);
  }
  const songBefore = Number(await c.value('.seek'));
  await c.press(['ArrowRight', 'ArrowRight'], 400);
  const forward = Number(await c.value('.seek'));
  await c.press(['ArrowLeft'], 400);
  const back = Number(await c.value('.seek'));
  await c.press(['Home'], 300);
  const homed = Number(await c.value('.seek'));
  c.record(
    'Keys of the page (focus on the page)',
    'Space x2, Right x2, Left, Home',
    `Space: "${start}" to "${second}" to "${third}"; ${songBefore} s, Right x2 ${forward} s, Left ${back} s, Home ${homed} s`,
    start !== second &&
      second !== third &&
      forward >= songBefore + 9 &&
      back <= forward - 4 &&
      homed <= 1,
  );
}

/**
 * Checks the speed menu, the volume slider, "Reset view", and full screen: in the bar on a
 * desktop, and in the "Playback" group of the settings on a phone.
 *
 * @param c The checker.
 * @param page The page.
 * @param place `bar` or `settings`, for the table.
 */
async function checkPlayback(c: Checker, page: Page, place: string): Promise<void> {
  const where = place === 'bar' ? '' : ' (Playback group)';
  const speedTabs = await c.tabTo(named('Speed'));
  const speedBefore = await c.value('select.speed');
  // On macOS, the arrow keys open the native menu of a select, which headless Chromium does not
  // show. The type-ahead of a closed select selects an option on each system.
  // The type-ahead joins the keys of about 1 s into one search text.
  await c.press(['0'], 1200);
  const half = await c.value('select.speed');
  await c.press(['1'], 1200);
  const speedAfter = await c.value('select.speed');
  c.record(
    `Speed${where}`,
    'Tab, 0, 1 (type-ahead)',
    `${speedBefore}x, 0 gives ${half}x, 1 gives ${speedAfter}x`,
    speedTabs > 0 && half === '0.5' && speedAfter === '1',
  );

  await c.tabTo(named('Volume'));
  await c.press(['ArrowLeft', 'ArrowLeft']);
  const left = await c.value('.volume');
  await c.press(['Home']);
  const home = await c.value('.volume');
  const silent = await c.attribute('button[aria-label="Mute"]', 'aria-pressed');
  await c.press(['End']);
  const end = await c.value('.volume');
  c.record(
    `Volume${where}`,
    'Tab, Left x2, Home, End',
    `100 to ${left}, Home ${home} (mute shows ${silent}), End ${end}`,
    left === '98' && home === '0' && silent === 'true' && end === '100',
  );

  await c.tabTo(named('Reset view'));
  await c.press(['Enter']);
  const resetFocused = (await c.focused()) === 'Reset view';
  c.record(`Reset view${where}`, 'Tab, Enter', 'the view resets, no error', resetFocused);

  const canFullScreen = await page.evaluate(() => document.fullscreenEnabled);
  if (canFullScreen) {
    await c.tabTo(named('Full screen'));
    await c.press(['Enter'], 600);
    const entered = await page.evaluate(() => document.fullscreenElement !== null);
    const label = await c.focused();
    await page.evaluate(() => document.exitFullscreen().catch(() => undefined));
    await page.waitForTimeout(400);
    c.record(
      `Full screen${where}`,
      'Tab, Enter',
      `full screen: ${entered}, label "${label}"`,
      entered && label === 'Exit full screen',
    );
  }
}

/**
 * Checks the drawer: the drawer button, Escape, the demo list, the file button, the seat list,
 * the settings, the credits link, and a message.
 *
 * @param c The checker.
 * @param page The page.
 * @param phone True for the phone size, with the "Playback" group in the settings.
 */
async function checkDrawer(c: Checker, page: Page, phone: boolean): Promise<void> {
  const toButton = await c.tabTo(named('Open the drawer'));
  await c.press(['Enter']);
  const open = await c.attribute('.bar button[aria-expanded]', 'aria-expanded');
  await c.tabTo((label) => label.startsWith("D'un matin"));
  await c.press(['Escape']);
  const closed = await page.evaluate(() =>
    document.querySelector('.drawer')?.hasAttribute('hidden'),
  );
  const back = await c.focused();
  c.record(
    'Drawer button and Escape',
    `Tab x${toButton}, Enter, Tab, Escape`,
    `opens: ${open}; Escape closes: ${closed}; focus back on "${back}"`,
    open === 'true' && closed === true && back === 'Open the drawer',
  );

  await c.press(['Space']);
  const order: string[] = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    order.push(await c.focused());
  }
  c.record(
    'Focus order into the drawer',
    'Space on the drawer button, Tab x9',
    order.join(' > '),
    order[0]?.startsWith("D'un matin") === true && order.includes('Select a MIDI file'),
  );

  await c.tabTo((label) => label.startsWith('Andante in C'), true);
  await c.press(['Enter'], 300);
  await page.waitForSelector('canvas[data-demo="mozart-k315"]', { timeout: 30_000 });
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const hash = await page.evaluate(() => location.hash);
  const playsNew = (await c.attribute('.bar button[aria-label]', 'aria-label')) === 'Pause';
  c.record(
    'Demo row "Andante in C, K. 315"',
    'Shift+Tab to the row, Enter',
    `loads the demo, hash ${hash}, starts when ready: ${playsNew}`,
    hash === '#demo=mozart-k315' && playsNew,
  );

  const notMidi = { name: 'not-midi.mid', mimeType: 'audio/midi', buffer: Buffer.from('hello') };
  await chooseFile(c, page, 'Enter', notMidi);
  await page.waitForSelector('.message:not([hidden])', { timeout: 10_000 });
  const message = (await page.textContent('.message span')) ?? '';
  c.record(
    'Select a MIDI file (a file that is not MIDI)',
    'Tab, Enter, select the file',
    `message "${message}"`,
    message === 'This file is not a valid MIDI file.',
  );

  await c.tabTo(named('Close the message'), true);
  await c.press(['Escape']);
  const escaped = await messageHidden(page);
  const drawerStays = await page.evaluate(
    () => document.querySelector('.drawer')?.hasAttribute('hidden') === false,
  );
  const afterEscape = await c.focused();
  c.record(
    'Escape in the message',
    'Shift+Tab to the close button, Escape',
    `closes: ${escaped}; the drawer stays open: ${drawerStays}; focus on "${afterEscape}"`,
    escaped && drawerStays && (afterEscape === 'Play' || afterEscape === 'Pause'),
  );

  await chooseFile(c, page, 'Enter', notMidi);
  await page.waitForSelector('.message:not([hidden])', { timeout: 10_000 });
  await c.tabTo(named('Close the message'), true);
  await c.press(['Enter']);
  const closed2 = await messageHidden(page);
  const afterClose = await c.focused();
  c.record(
    'Close the message',
    'Shift+Tab to the button, Enter',
    `closes: ${closed2}; focus on "${afterClose}"`,
    closed2 && (afterClose === 'Play' || afterClose === 'Pause'),
  );

  await chooseFile(c, page, 'Space', {
    name: 'one-note.mid',
    mimeType: 'audio/midi',
    buffer: ONE_NOTE_FILE,
  });
  await page.waitForSelector('canvas[data-demo="file"]', { timeout: 30_000 });
  const title = (await page.textContent('.title h1')) ?? '';
  c.record(
    'Select a MIDI file (a valid file)',
    'Tab, Space, select the file',
    `plays the file "${title}"`,
    title === 'one-note',
  );

  // The file of one note has one seat. The checks of the seats use the K. 315 demo again.
  await c.tabTo((label) => label.startsWith('Andante in C'), true);
  await c.press(['Enter'], 300);
  await page.waitForSelector('canvas[data-demo="mozart-k315"]', { timeout: 30_000 });
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  await c.tabTo(named('Expand the seat list'));
  await c.press(['Enter']);
  const expanded = await c.attribute('.collapse', 'aria-expanded');
  const rows = await page.locator('.seat').count();
  c.record(
    'Expand the seat list',
    'Tab, Enter',
    `aria-expanded ${expanded}, ${rows} seat rows`,
    expanded === 'true' && rows > 0,
  );

  await c.tabTo(named('Mute Cellos'));
  await c.press(['Space']);
  const cellos = await c.attribute('button[aria-label="Mute Cellos"]', 'aria-pressed');
  const dim = await page.evaluate(() =>
    document
      .querySelector('button[aria-label="Mute Cellos"]')
      ?.closest('.seat')
      ?.classList.contains('silent'),
  );
  await c.tabTo(named('Solo Flutes'));
  await c.press(['Enter']);
  const solo = await c.attribute('button[aria-label="Solo Flutes"]', 'aria-pressed');
  await c.press(['Enter']);
  await c.tabTo(named('Mute Cellos'), true);
  await c.press(['Enter']);
  const unmuted = await c.attribute('button[aria-label="Mute Cellos"]', 'aria-pressed');
  c.record(
    'Seat toggles M and S',
    'Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Flutes), Shift+Tab, Enter',
    `mute ${cellos} (row dim: ${dim}), solo ${solo}, mute again ${unmuted}`,
    cellos === 'true' && dim === true && solo === 'true' && unmuted === 'false',
  );

  // A new piece replaces the seat rows. The focus on a row goes to the collapse button.
  await page.evaluate(() => {
    location.hash = '#demo=grieg-ase';
  });
  await page.waitForSelector('canvas[data-demo="grieg-ase"]', { timeout: 30_000 });
  const afterPiece = await c.focused();
  c.record(
    'Focus on a seat toggle, then a new piece',
    'Shift+Tab to Mute Cellos, a new hash',
    `focus on "${afterPiece}"`,
    afterPiece === 'Collapse the seat list',
  );

  if (phone) {
    await checkPlayback(c, page, 'settings');
  }

  await c.tabTo(named('One per part'));
  await c.press(['Enter'], 400);
  const perPart = await c.attribute(
    '.segmented[aria-label="Section size"] button[aria-pressed="true"]',
    'aria-pressed',
  );
  const perPartText = await page.textContent(
    '.segmented[aria-label="Section size"] button[aria-pressed="true"]',
  );
  await c.tabTo(named('Low'));
  await c.press(['Space'], 300);
  const low = await page.textContent(
    '.segmented[aria-label="Quality"] button[aria-pressed="true"]',
  );
  c.record(
    'Settings: Section size and Quality',
    'Tab, Enter (One per part), Tab, Space (Low)',
    `section size "${perPartText}", quality "${low}"`,
    perPart === 'true' && perPartText === 'One per part' && low === 'Low',
  );

  await c.tabTo(named('Third-party licenses'));
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.keyboard.press('Enter')]);
  await popup.waitForLoadState();
  const licenses = popup.url();
  const text = (await popup.textContent('body')) ?? '';
  await popup.close();
  c.record(
    'Third-party licenses',
    'Tab, Enter',
    `opens ${licenses.replace(/^https?:\/\/[^/]+/u, '')} in a new tab`,
    licenses.endsWith('/third-party-licenses.txt') && text.includes('GeneralUser GS'),
  );

  const handle = await page.evaluate(() => {
    const element = document.querySelector('.handle');
    return element instanceof HTMLElement && element.tabIndex < 0;
  });
  if (phone) {
    c.record('Drag handle', 'Tab', `not in the focus order: ${handle}`, handle);
  }
}

/**
 * Checks the "Try again" button of a failed load: the page cannot load the samples first, then
 * it can.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param size The size, for the table.
 * @param width The width in CSS pixels.
 * @param height The height in CSS pixels.
 * @returns The results.
 */
async function checkRetry(
  browser: Browser,
  base: string,
  size: string,
  width: number,
  height: number,
): Promise<KeyCheck[]> {
  // A route of the context also stops the requests of the decode Worker.
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const c = new Checker(page, size);
  await context.route('**/sf/**', (route) => route.abort());
  await page.goto(base);
  await page.waitForSelector('.message:not([hidden])', { timeout: 60_000 });
  const message = (await page.textContent('.message span')) ?? '';
  await context.unroute('**/sf/**');
  const tabs = await c.tabTo(named('Try again'));
  await c.press(['Enter']);
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const plays = (await c.attribute('.bar button[aria-label]', 'aria-label')) === 'Pause';
  c.record(
    'Try again (failed load)',
    `Tab x${tabs}, Enter`,
    `message "${message}"; the samples load and the piece plays: ${plays}`,
    message.startsWith('The instruments did not load.') && plays,
  );
  await context.close();
  return c.checks;
}

/**
 * Taps the middle of an element at a part of its width, also when the element is hidden.
 *
 * @param page The page with touch.
 * @param selector The CSS selector of the element.
 * @param share The part of the width from the left edge, from 0 to 1.
 */
async function tapAt(page: Page, selector: string, share: number): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    throw new Error(`The page has no box for "${selector}".`);
  }
  await page.touchscreen.tap(box.x + box.width * share, box.y + box.height / 2);
}

/**
 * Checks that a tap on the hidden bar only shows the bar (design 2.3): on a phone with touch, a
 * tap on the hidden seek bar does not seek, and a tap on the hidden pause button does not pause.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @returns The results.
 */
async function checkHiddenBarTap(browser: Browser, base: string): Promise<KeyCheck[]> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const c = new Checker(page, '390 × 844, touch');
  const playLabel = (): Promise<string> => c.attribute('.bar button[aria-label]', 'aria-label');
  const barHidden = async (): Promise<boolean> =>
    (await c.attribute('.bar', 'class')).includes('is-hidden');
  await page.goto(base);
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  await page.tap(FIRST_PLAY);
  await page.waitForSelector('.bar.is-hidden', { timeout: 15_000 });
  const before = Number(await c.value('.seek'));
  await tapAt(page, '.seek', 0.8);
  await page.waitForTimeout(300);
  const after = Number(await c.value('.seek'));
  const shown = !(await barHidden());
  c.record(
    'Tap on the hidden seek bar',
    'tap at 80% of the seek bar',
    `${before} s to ${after} s; the bar shows: ${shown}`,
    after <= before + 2 && shown,
  );
  await page.waitForSelector('.bar.is-hidden', { timeout: 15_000 });
  await tapAt(page, '.bar button', 0.5);
  await page.waitForTimeout(300);
  const label = await playLabel();
  const shownAgain = !(await barHidden());
  c.record(
    'Tap on the hidden pause button',
    'tap on the pause button',
    `label "${label}"; the bar shows: ${shownAgain}`,
    label === 'Pause' && shownAgain,
  );
  await context.close();
  return c.checks;
}

/**
 * Checks a demo file that does not load (design 2.2, 2.8): at start, the page shows the message
 * with "Try again", the title of the demo, and the play button of the first screen. "Try again"
 * loads and plays the demo. A failed selection keeps the current piece and the URL hash, and
 * "Try again" then loads the selected demo and writes its hash.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @returns The results.
 */
async function checkDemoFailure(browser: Browser, base: string): Promise<KeyCheck[]> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const c = new Checker(page, '1440 × 900');
  const demos = '**/demos/**';
  const state = (): Promise<string> =>
    page.evaluate(() => {
      const message = document.querySelector('.message');
      const shown = message instanceof HTMLElement && !message.hidden;
      const retry = document.querySelector('.message .retry');
      const play = document.querySelector('.first-screen button');
      return [
        `message "${shown ? (message.querySelector('span')?.textContent ?? '') : ''}"`,
        `retry ${retry instanceof HTMLElement && !retry.hidden}`,
        `title "${document.querySelector('.title h1')?.textContent ?? ''}"`,
        `first play ${play instanceof HTMLElement && play.offsetParent !== null}`,
        `hash "${location.hash}"`,
      ].join('; ');
    });
  const failure = 'message "The demo did not load. Check the connection, then try again."';
  await context.route(demos, (route) => route.abort());
  await page.goto(base);
  await page.waitForSelector('.message:not([hidden])', { timeout: 60_000 });
  const atStart = await state();
  await context.unroute(demos);
  const tabs = await c.tabTo(named('Try again'));
  await c.press(['Enter']);
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const plays = (await c.attribute('.bar button[aria-label]', 'aria-label')) === 'Pause';
  c.record(
    'Demo file that does not load (start)',
    `Tab x${tabs} to Try again, Enter`,
    `${atStart}; Try again plays the demo: ${plays}`,
    atStart.startsWith(
      `${failure}; retry true; title "D'un matin de printemps"; first play true`,
    ) && plays,
  );

  const hashBefore = await page.evaluate(() => location.hash);
  await context.route(demos, (route) => route.abort());
  await c.tabTo(named('Open the drawer'));
  await c.press(['Enter']);
  await c.tabTo((label) => label.startsWith('Symphony No. 5'));
  await c.press(['Enter']);
  await page.waitForSelector('.message:not([hidden])', { timeout: 30_000 });
  const selected = await state();
  await context.unroute(demos);
  await c.tabTo(named('Try again'), true);
  await c.press(['Enter']);
  await page.waitForSelector('canvas[data-demo="beethoven-5"]', { timeout: 30_000 });
  const hashAfter = await page.evaluate(() => location.hash);
  c.record(
    'Demo file that does not load (selection)',
    'Enter on the Beethoven row, Shift+Tab to Try again, Enter',
    `${selected}; after Try again, hash "${hashAfter}"`,
    selected ===
      `${failure}; retry true; title "D'un matin de printemps"; first play false; hash "${hashBefore}"` &&
      hashAfter === '#demo=beethoven-5',
  );
  await context.close();
  return c.checks;
}

/**
 * Runs the keyboard check at one size.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param width The width in CSS pixels.
 * @param height The height in CSS pixels.
 * @returns The results.
 */
async function checkSize(
  browser: Browser,
  base: string,
  width: number,
  height: number,
): Promise<KeyCheck[]> {
  const size = `${width} × ${height}`;
  const phone = width < 700;
  const { page, errors } = await openPage(browser, base, width, height);
  const c = new Checker(page, size);
  await checkBar(c, page, phone);
  await checkDrawer(c, page, phone);
  c.record(
    'Console',
    '',
    errors.length === 0 ? 'no errors' : errors.join('; '),
    errors.length === 0,
  );
  await page.close();
  return [...c.checks, ...(await checkRetry(browser, base, size, width, height))];
}

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..');
  if (!existsSync(join(root, 'dist', 'index.html'))) {
    console.error('No build in dist/. Run pnpm build first.');
    process.exitCode = 1;
    return;
  }
  const server = await preview({ root, preview: { port: 4181, strictPort: false, open: false } });
  const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4181/';
  const browser = await chromium.launch({
    args: [
      '--use-angle=metal',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    const checks = [
      ...(await checkSize(browser, base, 1440, 900)),
      ...(await checkSize(browser, base, 390, 844)),
      ...(await checkHiddenBarTap(browser, base)),
      ...(await checkDemoFailure(browser, base)),
    ];
    console.log(checkTable(checks));
    const failed = failedChecks(checks);
    for (const line of failed) {
      console.error(line);
    }
    console.log(failed.length === 0 ? 'Keyboard check: pass' : 'Keyboard check: fail');
    process.exitCode = failed.length === 0 ? 0 : 1;
  } finally {
    await browser.close();
    await server.close();
  }
}

if (import.meta.main) {
  await main();
}
