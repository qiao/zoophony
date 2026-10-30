import { DEMO_IDS, DEMOS } from '../src/app/demos.ts';
import { APP_NAME, REPOSITORY_URL, SITE_DESCRIPTION, SITE_URL } from '../src/app/page-title.ts';

/**
 * One block of a site page. A text can hold links in the Markdown form `[text](target)`. A target
 * that starts with `/` is a path of the site, and each other target is a full URL.
 */
type Block =
  | {
      /** A heading below the title of the page. */
      readonly kind: 'heading';
      /** The text of the heading. */
      readonly text: string;
    }
  | {
      /** A paragraph. */
      readonly kind: 'paragraph';
      /** The text of the paragraph, with links. */
      readonly text: string;
    }
  | {
      /** A list with bullets. */
      readonly kind: 'list';
      /** The text of each item, with links. */
      readonly items: readonly string[];
    }
  | {
      /** A list of steps, in order. */
      readonly kind: 'steps';
      /** The text of each step, with links. */
      readonly items: readonly string[];
    };

/** One page of the site with a Markdown copy and an HTML copy (design 7.4). */
interface SitePage {
  /** The path of the page from the root of the site, with no extension, such as `about`. */
  readonly path: string;
  /** The title of the page: its `h1`, and the start of its HTML title. */
  readonly title: string;
  /** The text of the meta description, at most 155 characters. */
  readonly description: string;
  /** The content below the title. */
  readonly blocks: readonly Block[];
}

/** The link of a text, in the Markdown form `[text](target)`. */
const LINK = /\[([^\]]+)\]\(([^)]+)\)/gu;

/** The composers of the demos, in alphabetical order of the family name. */
const COMPOSERS = 'Bach, Beethoven, Boulanger, Brahms, Mendelssohn, and Mozart';

/** The list of the demos, each one with a link that opens it (design 2.2). */
const DEMO_LIST: Block = {
  kind: 'list',
  items: DEMO_IDS.map((id) => `[${DEMOS[id].title}, ${DEMOS[id].composer}](/#demo=${id})`),
};

/**
 * The start page in Markdown, for an agent that accepts `text/markdown`, and `llms.txt` (design
 * 7.4). The sections "When to use" and "When to use a different tool" tell an agent when the app
 * helps a person.
 */
const HOME: SitePage = {
  path: '',
  title: APP_NAME,
  description: SITE_DESCRIPTION,
  blocks: [
    {
      kind: 'paragraph',
      text: `${APP_NAME} is a free, open-source MIDI player for the web. Each animal of the orchestra plays one part of the piece, a bear conducts, and the camera follows the music. The app runs in the browser with WebGL2. It needs no account and no installation.`,
    },
    { kind: 'heading', text: 'When to use Zoophony' },
    {
      kind: 'list',
      items: [
        'A person wants to hear a MIDI file and see which instrument plays each note.',
        'A person wants to show an orchestra and its instruments to children or students.',
        `A person wants to hear classical music by ${COMPOSERS}, played by an animated orchestra.`,
      ],
    },
    { kind: 'heading', text: 'When to use a different tool' },
    {
      kind: 'list',
      items: [
        'To write, edit, or convert a MIDI file. Zoophony only plays MIDI files.',
        'To play an audio recording, such as an MP3 file.',
        'To play live MIDI input, or a MIDI file from a URL. Zoophony cannot do these.',
      ],
    },
    { kind: 'heading', text: 'How to use it' },
    {
      kind: 'steps',
      items: [
        `Open [${APP_NAME}](/) in a browser with WebGL2.`,
        'Push the play button to hear the first piece.',
        'Open the drawer to select a different piece, or drop a MIDI file (.mid) on the page.',
        `To open a demo directly, add its hash to the URL, such as [${SITE_URL}#demo=beethoven-9](/#demo=beethoven-9).`,
      ],
    },
    { kind: 'heading', text: 'Pieces' },
    DEMO_LIST,
    { kind: 'heading', text: 'Pages' },
    {
      kind: 'list',
      items: [
        '[About](/about): what Zoophony is and how it works.',
        '[Privacy](/privacy): the data that the site uses.',
        '[Contact](/contact): how to report a problem or send an idea.',
        `[Source code](${REPOSITORY_URL}): the repository on GitHub, under the Apache License 2.0.`,
      ],
    },
  ],
};

/**
 * Gives the URL of a link target.
 *
 * @param target A path of the site that starts with `/`, or a full URL.
 * @param root The URL or the base path that a path of the site starts from, with a final `/`.
 * @returns The full URL, or the path from the root.
 */
function linkUrl(target: string, root: string): string {
  return target.startsWith('/') ? `${root}${target.slice(1)}` : target;
}

/**
 * Writes the links of a text as full Markdown links.
 *
 * @param text A text with links in the form `[text](target)`.
 * @returns The Markdown text, where each link names a full URL on the main host.
 */
function markdownText(text: string): string {
  return text.replaceAll(
    LINK,
    (_link, label: string, target: string) => `[${label}](${linkUrl(target, SITE_URL)})`,
  );
}

/**
 * Writes a page in Markdown, in the form of `llms.txt`: the title, the description as a quote, and
 * the blocks.
 *
 * @param page The page.
 * @returns The Markdown text.
 */
function pageMarkdown(page: SitePage): string {
  const parts = [`# ${page.title}`, `> ${page.description}`];
  for (const block of page.blocks) {
    if (block.kind === 'heading') {
      parts.push(`## ${block.text}`);
    } else if (block.kind === 'paragraph') {
      parts.push(markdownText(block.text));
    } else {
      const marker = (index: number): string => (block.kind === 'steps' ? `${index + 1}.` : '-');
      parts.push(
        block.items.map((item, index) => `${marker(index)} ${markdownText(item)}`).join('\n'),
      );
    }
  }
  return `${parts.join('\n\n')}\n`;
}

/**
 * Gives the files of the site pages for the build (design 7.4): the Markdown copy of the start
 * page as `index.md` and as `llms.txt`.
 *
 * @returns The text of each file by its path in `dist/`.
 */
export function sitePages(): ReadonlyMap<string, string> {
  const home = pageMarkdown(HOME);
  return new Map([
    ['index.md', home],
    ['llms.txt', home],
  ]);
}
