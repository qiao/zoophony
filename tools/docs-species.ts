/**
 * Lists the places of the docs checklist of section 8 of `docs/briefs/studio-body.md` that do not
 * name a species yet (`pnpm docs-species <species>`). Each row of a table of the section gives a
 * file and a heading. The tool finds the place of the heading in the file, and looks for the names
 * of the species in its text.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SPECIES, isSpeciesId } from '../src/models/species.ts';
import type { SpeciesId, SpeciesParams } from '../src/models/species.ts';

/** The root of the repository. */
const ROOT = join(import.meta.dirname, '..');

/** The brief that holds the checklist, relative to the root. */
export const CHECKLIST_FILE = 'docs/briefs/studio-body.md';

/** The start of the heading of the section of the checklist. */
const CHECKLIST_HEADING = '8. Docs of a new body, role, or hold';

/**
 * The English names of each species in the docs, with the plural. The docs also name a species by
 * its id and by the id of its own body (`SpeciesParams.body`), so the tool adds both. The two foxes
 * share the names "fox" and "foxes": the docs name their one mesh and rig `fox`, and name them
 * together as "the two foxes".
 */
const DOC_NAMES = {
  rabbit: ['rabbit', 'rabbits'],
  'fox-red': ['red fox', 'red foxes', 'red violin fox', 'fox', 'foxes'],
  'fox-tan': ['tan fox', 'tan foxes', 'tan flute fox', 'fox', 'foxes'],
  wolf: ['wolf', 'wolves'],
  elephant: ['elephant', 'elephants'],
  bear: ['bear', 'bears'],
  cat: ['cat', 'cats'],
  hippo: ['hippo', 'hippos'],
  deer: ['deer'],
  panda: ['panda', 'pandas'],
  mouse: ['mouse', 'mice'],
  beaver: ['beaver', 'beavers'],
  dog: ['dog', 'dogs'],
  monkey: ['monkey', 'monkeys'],
  pig: ['pig', 'pigs'],
  rhino: ['rhino', 'rhinos'],
  badger: ['badger', 'badgers'],
  penguin: ['penguin', 'penguins'],
  'polar-bear': ['polar bear', 'polar bears'],
} as const satisfies Readonly<Record<SpeciesId, readonly string[]>>;

/** One row of a table of the checklist. */
export interface ChecklistRow {
  /** The name of the table: the text before it, such as `A new role`. */
  readonly list: string;
  /** The line of the row in the brief, from 1. */
  readonly line: number;
  /** The cell "File", such as `` `AGENTS.md` ``. */
  readonly file: string;
  /** The cell "Heading", such as `"4.4 Models", "Studio bodies"`. */
  readonly heading: string;
  /** The species of the cell "Not for": the species that the place is right not to name. */
  readonly notFor: readonly string[];
}

/** The kind of a block of a Markdown file. */
export type BlockKind = 'heading' | 'bold' | 'paragraph' | 'item' | 'code' | 'row';

/**
 * One block of a Markdown file with no nested block: a heading, a line that is all bold (a
 * heading in the text), a paragraph, the first lines of a list item, a fenced code block, or one
 * row of a table.
 */
export interface Block {
  /** The kind. */
  readonly kind: BlockKind;
  /** The first line, from 0. */
  readonly start: number;
  /** The line after the last line. */
  readonly end: number;
  /** The indent of the first line, in spaces. */
  readonly indent: number;
  /** The level of a heading, 1 to 6, or 0 for another block. */
  readonly level: number;
  /** The text with one space for each run of white space, and no marks of a heading or an item. */
  readonly text: string;
}

/** A span of lines of a file. */
export interface LineSpan {
  /** The first line, from 0. */
  readonly start: number;
  /** The line after the last line. */
  readonly end: number;
}

/**
 * The part of the place of the last anchor of a locator: `all` for all of it, `first` for its
 * first block that is not a heading or a bold line, `intro` for its blocks before the first
 * heading or bold line after the anchor, or the code text that the block of the place holds.
 */
export type PlacePart =
  | { readonly kind: 'all' }
  | { readonly kind: 'first' }
  | { readonly kind: 'intro' }
  | { readonly kind: 'code'; readonly code: string };

/** The way to a place in a file, from the cell "Heading" of a row ({@link locatorsOf}). */
export interface Locator {
  /** The start texts of the anchors, the outermost first. Each anchor is inside the one before. */
  readonly anchors: readonly string[];
  /** The part of the place of the last anchor. */
  readonly part: PlacePart;
}

/**
 * Collapses each run of white space into one space, and removes the bold marks.
 *
 * @param text The text.
 * @returns The plain text.
 */
function plain(text: string): string {
  return text.replaceAll('**', '').replace(/\s+/g, ' ').trim();
}

/**
 * Splits a Markdown file into blocks with no nested block ({@link Block}). A list item holds its
 * first line and the lines that follow it with no blank line, and each nested item or paragraph
 * of the item is a block of its own.
 *
 * @param text The text of the file.
 * @returns The blocks, in the order of the file.
 */
export function blocksOf(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  const indentOf = (line: string): number => line.length - line.trimStart().length;
  const startsBlock = (line: string): boolean =>
    /^\s*(#{1,6}\s|```|\||[-*]\s|\d+\.\s)/.test(line) || line.trim() === '';

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const indent = indentOf(line);
    const trimmed = line.trim();
    if (trimmed === '') {
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading && indent === 0) {
      const level = heading[1]?.length ?? 0;
      blocks.push({
        kind: 'heading',
        start: i,
        end: i + 1,
        indent,
        level,
        text: plain(heading[2] ?? ''),
      });
      i++;
      continue;
    }

    if (trimmed.startsWith('```')) {
      let end = i + 1;
      while (end < lines.length && !(lines[end] ?? '').trim().startsWith('```')) {
        end++;
      }
      end = Math.min(end + 1, lines.length);
      blocks.push({
        kind: 'code',
        start: i,
        end,
        indent,
        level: 0,
        text: plain(lines.slice(i, end).join(' ')),
      });
      i = end;
      continue;
    }

    if (trimmed.startsWith('|')) {
      blocks.push({ kind: 'row', start: i, end: i + 1, indent, level: 0, text: plain(trimmed) });
      i++;
      continue;
    }

    const item = /^([-*]|\d+\.)\s+(.*)$/.exec(trimmed);
    let end = i + 1;
    while (end < lines.length && !startsBlock(lines[end] ?? '')) {
      end++;
    }
    const body = [item ? (item[2] ?? '') : trimmed, ...lines.slice(i + 1, end)].join(' ');
    const bold = !item && end === i + 1 && /^\*\*[^*]+\*\*$/.test(trimmed);
    const kind: BlockKind = item ? 'item' : bold ? 'bold' : 'paragraph';
    blocks.push({ kind, start: i, end, indent, level: 0, text: plain(body) });
    i = end;
  }
  return blocks;
}

/**
 * Gives the place of an anchor block: a heading reaches the next heading of its level or a higher
 * level, a bold line reaches the next bold line or heading, a list item reaches the next item,
 * paragraph, bold line, or heading at its indent or less, and a paragraph at the left edge reaches
 * the next paragraph, bold line, or heading at the left edge. Thus the lists and the code blocks
 * under a paragraph, such as the steps of a route, are in its place.
 *
 * @param blocks The blocks of the file.
 * @param index The index of the anchor block.
 * @param limit The end of the place that holds the anchor.
 * @returns The place.
 */
export function anchorSpan(blocks: readonly Block[], index: number, limit: number): LineSpan {
  const anchor = blocks[index];
  if (!anchor) {
    return { start: limit, end: limit };
  }
  const ends = (block: Block): boolean => {
    switch (anchor.kind) {
      case 'heading':
        return block.kind === 'heading' && block.level <= anchor.level;
      case 'bold':
        return block.kind === 'heading' || block.kind === 'bold';
      case 'item':
        return (
          block.indent <= anchor.indent &&
          (block.kind === 'item' ||
            block.kind === 'paragraph' ||
            block.kind === 'bold' ||
            block.kind === 'heading')
        );
      case 'paragraph':
      case 'code':
      case 'row':
        return (
          block.kind === 'heading' ||
          block.kind === 'bold' ||
          (block.kind === 'paragraph' && block.indent === 0 && anchor.indent === 0)
        );
    }
  };
  const next = blocks.find((block, i) => i > index && block.start < limit && ends(block));
  return { start: anchor.start, end: Math.min(next?.start ?? limit, limit) };
}

/**
 * Reads the locators of the cell "Heading" of a row. Each quoted text is an anchor: the heading,
 * the bold line, the list item, or the paragraph whose text is the quote, or else starts with it,
 * in the place of the anchor before it. After the last anchor, each code span names one place:
 * the first block of the place of the anchor that holds the code, where `<name>` stands for any
 * word. The block of a table row must hold the code in its first cell. The words `first
 * paragraphs` give the blocks before the first heading or bold line after the anchor, and `first
 * paragraph` gives the first block of the place that is not a heading or a bold line: the anchor
 * itself for a paragraph. With none of these, the place is all the place of the last anchor, or
 * the whole file with no anchor.
 *
 * @param heading The text of the cell.
 * @returns One locator for each place of the cell.
 */
export function locatorsOf(heading: string): Locator[] {
  const anchors = [...heading.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? '');
  const lastQuote = heading.lastIndexOf('"');
  const tail = heading.slice(lastQuote + 1);
  const codes = [...tail.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
  if (codes.length > 0) {
    return codes.map((code) => ({ anchors, part: { kind: 'code', code } }));
  }
  if (/\bfirst paragraphs\b/.test(tail)) {
    return [{ anchors, part: { kind: 'intro' } }];
  }
  if (/\bfirst paragraph\b/.test(tail)) {
    return [{ anchors, part: { kind: 'first' } }];
  }
  return [{ anchors, part: { kind: 'all' } }];
}

/**
 * Makes the pattern of a code text: `<name>` stands for any word, and a space for any white space.
 *
 * @param code The code text, such as `pnpm close-views <role> <dir>`.
 * @returns The pattern.
 */
function codePattern(code: string): RegExp {
  const parts = code
    .split(/(<[^>]+>)/)
    .map((part) =>
      /^<[^>]+>$/.test(part)
        ? '\\S+'
        : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
    );
  return new RegExp(parts.join(''));
}

/**
 * Tells if a block holds a code text: a table row in its first cell, another block anywhere.
 *
 * @param block The block.
 * @param pattern The pattern of the code text ({@link codePattern}).
 * @returns True when the block holds the code.
 */
function holdsCode(block: Block, pattern: RegExp): boolean {
  if (block.kind === 'row') {
    const first = block.text.split('|')[1] ?? '';
    return pattern.test(first);
  }
  return pattern.test(block.text);
}

/** The place of a locator in a file, or the part of the locator that the file does not have. */
export type FoundPlace =
  | { readonly kind: 'found'; readonly span: LineSpan }
  | { readonly kind: 'lost'; readonly what: string };

/**
 * Finds the place of a locator in a Markdown file.
 *
 * @param text The text of the file.
 * @param locator The locator.
 * @returns The place, or the text of the first part of the locator that the file does not have.
 */
export function findPlace(text: string, locator: Locator): FoundPlace {
  const found = placeSpan(text, locator);
  return 'start' in found ? { kind: 'found', span: found } : { kind: 'lost', what: found.what };
}

/**
 * Finds the lines of the place of a locator in a Markdown file ({@link findPlace}).
 *
 * @param text The text of the file.
 * @param locator The locator.
 * @returns The lines, or the text of the first part of the locator that the file does not have.
 */
function placeSpan(text: string, locator: Locator): LineSpan | { readonly what: string } {
  const blocks = blocksOf(text);
  let span: LineSpan = { start: 0, end: text.split('\n').length };
  let anchorIndex = -1;
  for (const anchor of locator.anchors) {
    const inside = blocks
      .map((block, index) => ({ block, index }))
      .filter(
        ({ block, index }) =>
          index > anchorIndex && block.start >= span.start && block.start < span.end,
      );
    const found =
      inside.find(({ block }) => block.text === anchor) ??
      inside.find(({ block }) => block.text.startsWith(anchor));
    if (!found) {
      return { what: `"${anchor}"` };
    }
    anchorIndex = found.index;
    span = anchorSpan(blocks, found.index, span.end);
  }

  const after = blocks
    .map((block, index) => ({ block, index }))
    .filter(
      ({ block, index }) =>
        index > anchorIndex && block.start >= span.start && block.start < span.end,
    );
  const { part } = locator;
  switch (part.kind) {
    case 'all':
      return span;
    case 'first': {
      const first = blocks.find(
        (block) =>
          block.start >= span.start &&
          block.start < span.end &&
          block.kind !== 'heading' &&
          block.kind !== 'bold',
      );
      return first ? { start: first.start, end: first.end } : { what: 'first paragraph' };
    }
    case 'intro': {
      const stop = after.find(({ block }) => block.kind === 'heading' || block.kind === 'bold');
      return { start: span.start, end: stop?.block.start ?? span.end };
    }
    case 'code': {
      const pattern = codePattern(part.code);
      const found = after.find(({ block }) => holdsCode(block, pattern));
      if (!found) {
        return { what: `\`${part.code}\`` };
      }
      return found.block.kind === 'item'
        ? anchorSpan(blocks, found.index, span.end)
        : { start: found.block.start, end: found.block.end };
    }
  }
}

/**
 * Gives the names of a species in the docs: its id, the id of its own body, and its English names
 * ({@link DOC_NAMES}).
 *
 * @param species The species.
 * @returns The names.
 */
export function speciesNames(species: SpeciesId): string[] {
  const params: SpeciesParams = SPECIES[species];
  const names: string[] = [species, ...DOC_NAMES[species]];
  if (params.body) {
    names.push(params.body);
  }
  return [...new Set(names)];
}

/**
 * Makes the pattern of a name: the whole name with no letter or digit next to it, with no regard
 * to case, and any white space in place of a space.
 *
 * @param name The name.
 * @returns The pattern, global.
 */
function namePattern(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'gi');
}

/**
 * Tells if a text names a species. A name of another species that holds a name of the species,
 * such as "polar bear" for the bear, does not count.
 *
 * @param text The text.
 * @param species The species.
 * @returns True when the text names the species.
 */
export function namesSpecies(text: string, species: SpeciesId): boolean {
  const own = speciesNames(species);
  const holds = (outer: string): boolean =>
    own.some((name) => name !== outer && namePattern(name).test(outer));
  const others = Object.keys(DOC_NAMES)
    .filter((id): id is SpeciesId => isSpeciesId(id) && id !== species)
    .flatMap(speciesNames)
    .filter((name) => !own.includes(name) && holds(name));
  let rest = text;
  for (const name of others) {
    rest = rest.replace(namePattern(name), ' ');
  }
  return own.some((name) => namePattern(name).test(rest));
}

/**
 * Splits a table row into its cells. A `|` inside a code span does not split.
 *
 * @param line The line of the row.
 * @returns The cells, trimmed, with no empty cell at the two ends.
 */
function cellsOf(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let code = false;
  for (const char of line.trim().replace(/^\|/, '').replace(/\|$/, '')) {
    if (char === '`') {
      code = !code;
    }
    if (char === '|' && !code) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * Reads the tables of the checklist from the text of the brief: each table in the section whose
 * heading starts with {@link CHECKLIST_HEADING}, with the columns "File", "Heading", "The place
 * lists", and "Not for". The paragraph before a table names it.
 *
 * @param text The text of the brief.
 * @returns The rows, in the order of the brief.
 * @throws Error if the brief has no such section, or a table has other columns.
 */
export function checklistRows(text: string): ChecklistRow[] {
  const blocks = blocksOf(text);
  const index = blocks.findIndex(
    (block) => block.kind === 'heading' && block.text.startsWith(CHECKLIST_HEADING),
  );
  if (index < 0) {
    throw new Error(`${CHECKLIST_FILE} has no section "${CHECKLIST_HEADING}".`);
  }
  const span = anchorSpan(blocks, index, text.split('\n').length);
  const lines = text.split('\n');
  const rows: ChecklistRow[] = [];
  let list = '';
  let columns: string[] | null = null;
  for (const block of blocks.slice(index + 1)) {
    if (block.start >= span.end) {
      break;
    }
    if (block.kind !== 'row') {
      columns = null;
      if (block.kind === 'paragraph') {
        list = block.text.replace(/:$/, '');
      }
      continue;
    }
    const cells = cellsOf(lines[block.start] ?? '');
    if (!columns) {
      columns = cells;
      if (columns.join('|') !== 'File|Heading|The place lists|Not for') {
        throw new Error(
          `The table "${list}" of ${CHECKLIST_FILE} has the columns ${columns.join(', ')}, and not File, Heading, The place lists, Not for.`,
        );
      }
      continue;
    }
    if (cells.every((cell) => /^-+$/.test(cell))) {
      continue;
    }
    const [file = '', heading = '', , notFor = ''] = cells;
    rows.push({
      list,
      line: block.start + 1,
      file,
      heading,
      notFor: [...notFor.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? ''),
    });
  }
  return rows;
}

/**
 * Reads the paths of the cell "File" of a row: each code span is one path. In a path, `<name>`
 * stands for any part of a file name, such as `assets/models/<s>/README.md`.
 *
 * @param cell The text of the cell.
 * @returns The paths.
 */
export function pathsOf(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
}

/**
 * Finds the files of a path of the checklist. Each `<name>` of the path stands for any part of a
 * file name.
 *
 * @param path The path, relative to the root.
 * @returns The files, relative to the root, sorted.
 */
function filesOf(path: string): string[] {
  let found = [''];
  for (const part of path.split('/')) {
    if (!part.includes('<')) {
      found = found.map((dir) => join(dir, part)).filter((file) => existsSync(join(ROOT, file)));
      continue;
    }
    const pattern = codePattern(part.replace(/<[^>]+>/g, '<any>'));
    const whole = new RegExp(`^${pattern.source.replaceAll('\\S+', '.+')}$`);
    found = found.flatMap((dir) =>
      existsSync(join(ROOT, dir))
        ? readdirSync(join(ROOT, dir))
            .filter((name) => whole.test(name))
            .map((name) => join(dir, name))
        : [],
    );
  }
  return found.toSorted();
}

/** The result of one place for a species. */
export type PlaceResult =
  | { readonly kind: 'names'; readonly file: string; readonly span: LineSpan }
  | { readonly kind: 'miss'; readonly file: string; readonly span: LineSpan }
  | { readonly kind: 'skip' }
  | { readonly kind: 'not found'; readonly what: string };

/**
 * Checks one place of a row for a species: the place names the species when one of its files
 * names it in the place of the locator.
 *
 * @param texts The text of each file of the path, by its path.
 * @param locator The locator.
 * @param species The species.
 * @param notFor The species of the cell "Not for" of the row.
 * @returns The result.
 */
export function checkPlace(
  texts: ReadonlyMap<string, string>,
  locator: Locator,
  species: SpeciesId,
  notFor: readonly string[],
): PlaceResult {
  if (notFor.includes(species)) {
    return { kind: 'skip' };
  }
  let miss: PlaceResult | null = null;
  let lost = 'the file';
  for (const [file, text] of texts) {
    const place = findPlace(text, locator);
    if (place.kind === 'lost') {
      lost = place.what;
      continue;
    }
    const { span } = place;
    const lines = text.split('\n').slice(span.start, span.end).join('\n');
    if (namesSpecies(lines, species)) {
      return { kind: 'names', file, span };
    }
    miss ??= { kind: 'miss', file, span };
  }
  return miss ?? { kind: 'not found', what: lost };
}

/**
 * Writes the text of a place: the file with its lines, from 1.
 *
 * @param file The file.
 * @param span The lines.
 * @returns The text, such as `AGENTS.md:7-92`.
 */
function placeText(file: string, span: LineSpan): string {
  return `${file}:${span.start + 1}-${span.end}`;
}

/** The text of the usage. */
const USAGE = `Usage: pnpm docs-species <species> [--all]\nThe species are ${Object.keys(DOC_NAMES).join(', ')}.`;

function main(): void {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const [species, ...rest] = args.filter((arg) => arg !== '--all');
  if (!species || rest.length > 0 || !isSpeciesId(species)) {
    throw new Error(USAGE);
  }

  const rows = checklistRows(readFileSync(join(ROOT, CHECKLIST_FILE), 'utf8'));
  console.log(
    `The places of section 8 of ${CHECKLIST_FILE} for ${species} (names: ${speciesNames(species).join(', ')}).`,
  );
  const counts = { names: 0, miss: 0, skip: 0, 'not found': 0 };
  let list = '';
  for (const row of rows) {
    for (const path of pathsOf(row.file)) {
      const texts = new Map(
        filesOf(path).map((file) => [file, readFileSync(join(ROOT, file), 'utf8')] as const),
      );
      const locators = locatorsOf(row.heading);
      for (const locator of locators) {
        const result = checkPlace(texts, locator, species, row.notFor);
        counts[result.kind]++;
        if (result.kind === 'names' && !all) {
          continue;
        }
        if (row.list !== list) {
          list = row.list;
          console.log(`${list}:`);
        }
        let where = path;
        if (result.kind === 'not found') {
          where = `${path} (no ${result.what})`;
        } else if (result.kind === 'miss' && texts.size > 1) {
          where = `${path} (${texts.size} files)`;
        } else if (result.kind !== 'skip') {
          where = placeText(result.file, result.span);
        }
        const code =
          locators.length > 1 && locator.part.kind === 'code' ? ` (\`${locator.part.code}\`)` : '';
        console.log(`  ${result.kind}  ${where}  ${row.heading}${code}  (row ${row.line})`);
      }
    }
  }
  // The time origin of the performance clock is the start of the process.
  const seconds = (performance.now() / 1000).toFixed(1);
  console.log(
    `${counts.names + counts.miss + counts.skip + counts['not found']} places: ${counts.names} name ${species}, ${counts.miss} miss it, ${counts.skip} skip it, and ${counts['not found']} are not found (${seconds} s).`,
  );
  if (counts.miss > 0 || counts['not found'] > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
