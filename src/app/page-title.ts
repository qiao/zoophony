import type { TitleLines } from './file-rules.ts';

/** The name of the app, at the end of the title of the page (design 2.8). */
export const APP_NAME = 'Zoophony';

/**
 * Gives the title of the page for the current piece (design 2.8, audit 2026-10-05-ux-design,
 * CP1): the browser tab and the history then name the piece.
 *
 * @param lines The title lines of the piece.
 * @param demo True for a demo, whose second line is the composer. The second line of a file of
 *   the user is its file name, which the title leaves out.
 * @returns For example "Ode to Joy, Ludwig van Beethoven · Zoophony".
 */
export function pageTitle(lines: TitleLines, demo: boolean): string {
  const piece = demo && lines.composer ? `${lines.title}, ${lines.composer}` : lines.title;
  return `${piece} · ${APP_NAME}`;
}
