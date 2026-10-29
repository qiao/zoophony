# Writing

This module of `AGENTS.md` gives the rules of the prose: Simplified Technical English, the tells to
avoid, the prose checks, the length limits of the docs, and TSDoc.

Write all prose in ASD-STE100 Simplified Technical English: the docs, `AGENTS.md`, comments,
commit messages, and UI text.

- Lead with the fact. Put the subject first. Use the active voice, the present tense, and
  concrete nouns. Define a term on first use, then use the same term each time.
- Write procedural sentences of at most 20 words and descriptive sentences of at most 25 words.
- Show a mechanism or a number in place of a subjective word.
- Never quote a request of the project owner, and never write "the user asked" or "the user
  said", in code, comments, docs, commit messages, or data files. State the fact and its reason
  in neutral words. "The user" stays for a person who uses the app.

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
D='AGENTS.md docs/agents docs/design.md docs/design'
grep -rc $'\u2014' ${=D} | grep -v ':0$'   # em dashes
grep -rnE '[a-z]; [a-z]' ${=D}             # semicolon splices
grep -rnE ', not [a-z]' ${=D}              # antithesis tics
```

## Length limits

Each agent reads `AGENTS.md` in each round, and the docs of a round cost time. Keep only the high
level and the most important details. These limits hold:

- **`AGENTS.md`.** At most about 1,000 words: the project, the sources of the truth, the hard
  rules, the work rules, and the index of the modules.
- **A module of `docs/agents/`.** At most about 3,000 words, and about 4,000 for `rigging.md`. A
  row of `commands.md` gives a command in at most about 120 words, and a trap gives its rule in one
  to three sentences.
- **A design section.** The current state, the rules, and the reasons only, with no history and no
  tuned value. The code holds the values, and the design names their constants.

Cut the history, the stories of past rounds, the run times of single runs, and the repeats. Point
to a file in place of a copy of its text. This command counts the words:

```bash
wc -w AGENTS.md docs/agents/*.md
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
