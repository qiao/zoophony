# Writing

This module of `AGENTS.md` gives the rules of the prose: Simplified Technical English, the tells to
avoid, the prose checks, the length limits of the docs with two templates, and TSDoc.

Write all prose in ASD-STE100 Simplified Technical English: the docs, `AGENTS.md`, comments,
commit messages, and UI text.

- Lead with the fact. Put the subject first. Use the active voice, the present tense, and
  concrete nouns. Define a term on first use, then use the same term each time.
- Write procedural sentences of at most 20 words and descriptive sentences of at most 25 words.
- Show a mechanism or a number in place of a subjective word.

## Tells to avoid

- **Em dashes.** Use a full stop, a comma, a colon, or parentheses.
- **Semicolon splices.** Write separate sentences.
- **Antithesis tics.** State the positive fact, with no reflexive "X, not Y".
- **Appositive tails.** Cut a dangling explanation at the end of a sentence, or make it a
  separate sentence.
- **Throat-clearing.** Remove filler such as "It is worth noting", "Importantly", "Note that",
  and "In summary".
- **Colon fanfare.** State a reason directly, with no "The reason is:".
- **Rule-of-three padding.** List only the items that exist.
- **Bold lead-ins.** Keep them for lists of term definitions, such as this one.
- **Banned words.** delve, leverage, utilize, facilitate, underscore (as a verb), testament,
  landscape, realm, tapestry, holistic, myriad, plethora, crucial, pivotal, game-changing,
  unlock, empower, streamline, "dive into", "at its core", "the beauty of". No emoji.

Check the prose before you finish. Each command must print a count of 0 or no lines. The
semicolon check also prints TypeScript type literals, such as `{ port: number; channel: number }`.
These matches are correct.

```bash
D='AGENTS.md docs/agents docs/briefs docs/design.md docs/design docs/decisions'
grep -rc $'\u2014' ${=D} | grep -v ':0$'   # em dashes
grep -rnE '[a-z]; [a-z]' ${=D}             # semicolon splices
grep -rnE ', not [a-z]' ${=D}              # antithesis tics
```

## Length limits

The user asked on 2026-10-17 for short docs with only the high level and the most important
details. Each agent reads `AGENTS.md` in each round,
and the docs of a round cost time. These limits hold:

- **`AGENTS.md`.** At most about 2,500 words: the project, the sources of the truth, the hard
  rules, the work rules of each round, and the index of the modules.
- **A module of `docs/agents/`.** At most about 3,000 words. A row of `commands.md` gives a command
  in at most about 120 words, and a trap gives its rule in one to three sentences.
- **A decision file.** At most about 600 words. Each decision is one row of at most about 50
  words: the quote of the user first, and a code pointer in place of a long explanation.
- **A research report.** At most about 1,000 words of prose. The numbers go into tables, and the
  outputs of the probes go into files of the folder of the report.
- **A design section.** The rules, the intent, and the reasons only, with no history of rounds and
  no tuned values. These live in the code, the decision files, and the research reports.
- **The brief template** `docs/briefs/studio-body.md`. At most about 2,500 words.

Cut the history, the stories of past rounds, the run times of single runs, and the repeats. Point
to a file in place of a copy of its text. These commands count the words:

```bash
wc -w AGENTS.md docs/agents/*.md docs/briefs/studio-body.md
awk '/^```/ { c = !c; next } !c && !/^\|/' <report>.md | wc -w   # prose of a report
awk '/^\| / { print NR ": " split($0, w, " ") }' <decisions>.md     # words of each row
```

### Template of a decision file

```markdown
# Decisions of <topic>

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

<One paragraph: the round, the quote of the user, and the link of the research report. The user can
reverse each decision. Then update its section, and remove its row.>

| Decision | Section |
|---|---|
| The user: "<quote>". <the decision in one sentence> (`<code pointer>`). | <X.Y> |
| <a decision of the agent in one or two sentences> (`<code pointer>`). | <X.Y> |
```

### Template of a research report

```markdown
# <topic>

Date <date>. Round `<round>`. Decisions:
[`<date>-<topic>.md`](../decisions/<date>-<topic>.md). The probes and their outputs are in
[`<date>-<topic>/`](<date>-<topic>/). Each command runs from the root of the tree.

## 1. The question

<the goal and the measure that decides, in two or three sentences>

## 2. The measures

| Variant | <measure> | <measure> |
|---|---|---|
| `main` | | |

<the command of each probe and the file of its output>

## 3. The result

<the chosen variant and the reason, with the numbers of the table>
```

## TSDoc

- Each exported class, interface, type, function, and constant carries TSDoc.
- Each member of a class, an interface, or an object type carries TSDoc: each field, property,
  method, getter, setter, and function-typed property. This rule includes private members and
  the members of types that are not exported.
- A function or method comment starts with a verb phrase, such as "Calculates" or "Creates".
- A type, interface, variable, or constant comment starts with a noun phrase.
- Use `@param`, `@returns`, and `@throws`, with no hyphen: `@param name Description`.
- Each `{@link Symbol}` target exists.
- Each doc comment comes directly before a code member.
