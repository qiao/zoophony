/**
 * Finds the table rows of the decision files that hold a term, so that a person can see the
 * decisions that a change touches. The tool prints a list, and it stops no merge.
 *
 * Run: `tools/decision-rows.sh [--diff <base>] [<term>...]`. A term of the command line matches
 * a row with no regard to case. With `--diff <base>`, the identifiers and the string literals that
 * the diff of `<base>..HEAD` removes are terms too. Such a term matches only in the code spans of
 * a row, because a code name such as `length` is also an English word.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A term to find in the rows. */
export interface Term {
  /** The text of the term. */
  readonly text: string;
  /**
   * The kind of the term. A `code` term is an identifier or a string literal of a diff. It
   * matches in a code span of a row, with the case, and with no letter, digit, `_`, or `$`
   * directly before or after it. A `search` term matches a part of the row, with no regard to
   * case.
   */
  readonly kind: 'code' | 'search';
}

/** A text file. */
export interface TextFile {
  /** The path of the file, from the root of the repository. */
  readonly path: string;
  /** The text of the file. */
  readonly text: string;
}

/** A table row of a decision file that holds one or more terms. */
export interface DecisionRow {
  /** The path of the decision file. */
  readonly path: string;
  /** The number of the line, from 1. */
  readonly line: number;
  /** The text of the row. */
  readonly text: string;
  /** The texts of the terms that the row holds. */
  readonly terms: readonly string[];
}

/** The keywords and the common names of TypeScript, JavaScript, Python, and shell code. */
const COMMON_WORDS = new Set([
  'async',
  'await',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'delete',
  'describe',
  'done',
  'echo',
  'else',
  'export',
  'expect',
  'extends',
  'false',
  'fi',
  'finally',
  'from',
  'function',
  'import',
  'interface',
  'length',
  'local',
  'never',
  'null',
  'number',
  'object',
  'readonly',
  'return',
  'self',
  'static',
  'string',
  'switch',
  'then',
  'this',
  'throw',
  'toBe',
  'toEqual',
  'true',
  'type',
  'typeof',
  'undefined',
  'unknown',
  'void',
  'while',
  'with',
  'yield',
]);

/** An identifier of code. */
const IDENTIFIER = /[A-Za-z_$][\w$]*/g;

/** A string literal on one line, with single quotes, double quotes, or backticks. */
const STRING_LITERAL = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;

/** A character of an identifier. */
const WORD_CHAR = /[\w$]/;

/** The longest string literal that is a term. A longer literal is data, such as a mesh. */
const MAX_LITERAL = 100;

/** A code span of Markdown. */
const CODE_SPAN = /`([^`]+)`/g;

/**
 * Tells if a line of a Markdown file is a table row with text: a line that starts with `|`, and
 * not the separator row under the header.
 *
 * @param line The line.
 * @returns True for a table row with text.
 */
export function isTableRow(line: string): boolean {
  return line.startsWith('|') && !/^\|[\s:|-]*$/.test(line);
}

/**
 * Gives the code of a changed line: the line with no diff marker and no comment. A line that
 * starts a comment gives an empty text.
 *
 * @param line The line of the diff, after its marker.
 * @returns The code of the line.
 */
function codeOf(line: string): string {
  const trimmed = line.trimStart();
  if (/^(\/\/|\/\*|\*|#)/.test(trimmed)) {
    return '';
  }
  const comment = line.indexOf(' //');
  return comment >= 0 ? line.slice(0, comment) : line;
}

/**
 * Gives the identifiers and the string literals of the code of a set of lines. A relative path
 * loses its `./` or `../` parts, so that it can match a path in a row.
 *
 * @param lines The code of the lines.
 * @returns The texts of the terms.
 */
function termsOf(lines: readonly string[]): Set<string> {
  const terms = new Set<string>();
  for (const line of lines) {
    for (const match of line.matchAll(STRING_LITERAL)) {
      const text = (match[1] ?? match[2] ?? match[3] ?? '').replace(/^(\.\.?\/)+/, '');
      if (text.length >= 3 && text.length <= MAX_LITERAL && !text.includes('${')) {
        terms.add(text);
      }
    }
    const code = line.replace(STRING_LITERAL, ' ');
    for (const [text] of code.matchAll(IDENTIFIER)) {
      if (text.length >= 4 && !COMMON_WORDS.has(text)) {
        terms.add(text);
      }
    }
  }
  return terms;
}

/**
 * Finds the identifiers and the string literals that a unified diff removes. A term that an
 * added line of the diff holds is not removed, because the change only moved it.
 *
 * @param diff The unified diff.
 * @returns The removed terms, sorted by their text.
 */
export function removedTerms(diff: string): Term[] {
  const removed: string[] = [];
  const added: string[] = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('-') && !line.startsWith('---')) {
      removed.push(codeOf(line.slice(1)));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      added.push(codeOf(line.slice(1)));
    }
  }

  const kept = termsOf(added);
  const terms: Term[] = [];
  for (const text of termsOf(removed)) {
    if (!kept.has(text)) {
      terms.push({ text, kind: 'code' });
    }
  }
  return terms.toSorted((a, b) => a.text.localeCompare(b.text));
}

/**
 * Tells if a code span holds a text with no letter, digit, `_`, or `$` directly before or after
 * it.
 *
 * @param span The code span.
 * @param text The text.
 * @returns True when the span holds the whole text.
 */
function holdsWhole(span: string, text: string): boolean {
  for (let at = span.indexOf(text); at >= 0; at = span.indexOf(text, at + 1)) {
    const before = span[at - 1] ?? '';
    const after = span[at + text.length] ?? '';
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) {
      return true;
    }
  }
  return false;
}

/**
 * Tells if a row holds a term.
 *
 * @param row The text of the row.
 * @param spans The code spans of the row.
 * @param term The term.
 * @returns True when the row holds the term.
 */
function holds(row: string, spans: readonly string[], term: Term): boolean {
  if (term.kind === 'search') {
    return row.toLowerCase().includes(term.text.toLowerCase());
  }
  return spans.some((span) => holdsWhole(span, term.text));
}

/**
 * Finds the table rows of the files that hold one or more terms.
 *
 * @param files The decision files.
 * @param terms The terms.
 * @returns The rows, in the order of the files and the lines.
 */
export function findRows(files: readonly TextFile[], terms: readonly Term[]): DecisionRow[] {
  const rows: DecisionRow[] = [];
  for (const file of files) {
    const lines = file.text.split('\n');
    for (const [index, text] of lines.entries()) {
      if (!isTableRow(text)) {
        continue;
      }
      const spans = [...text.matchAll(CODE_SPAN)].map((match) => match[1] ?? '');
      const found = new Set<string>();
      for (const term of terms) {
        if (holds(text, spans, term)) {
          found.add(term.text);
        }
      }
      if (found.size > 0) {
        rows.push({ path: file.path, line: index + 1, text, terms: [...found] });
      }
    }
  }
  return rows;
}

/**
 * Prints the rows of the decision files that hold the terms of the arguments.
 *
 * @param args The arguments: `--diff <base>` and the terms.
 * @throws When the arguments are wrong.
 */
function main(args: readonly string[]): void {
  const root = join(import.meta.dirname, '..');
  const terms: Term[] = [];
  let base = '';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';
    if (arg === '--diff') {
      base = args[index + 1] ?? '';
      index += 1;
    } else {
      terms.push({ text: arg, kind: 'search' });
    }
  }
  if (base === '' && terms.length === 0) {
    throw new Error('Usage: tools/decision-rows.sh [--diff <base>] [<term>...]');
  }

  if (base !== '') {
    const diff = execFileSync(
      'git',
      ['diff', '--no-color', `${base}..HEAD`, '--', '.', ':(exclude)docs', ':(exclude)*.md'],
      { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
    );
    const removed = removedTerms(diff);
    console.log(`The diff of ${base}..HEAD removes ${removed.length} terms.`);
    terms.push(...removed);
  }

  const folder = join(root, 'docs', 'decisions');
  const files = readdirSync(folder)
    .filter((name) => name.endsWith('.md'))
    .toSorted()
    .map((name) => ({
      path: `docs/decisions/${name}`,
      text: readFileSync(join(folder, name), 'utf8'),
    }));
  const rows = findRows(files, terms);
  for (const row of rows) {
    console.log(`${row.path}:${row.line}: [${row.terms.join(', ')}] ${row.text}`);
  }
  console.log(`${rows.length} rows hold a term.`);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
