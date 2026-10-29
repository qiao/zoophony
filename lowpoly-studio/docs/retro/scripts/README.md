# Scripts of a transcript retrospective

These scripts measure the transcript of one long Claude Code subagent round: the time of each
round, topic, and phase, the tool calls, and the constants that the agent tuned again and again.
They read the transcript (a JSON Lines file of about 100 MB) line by line, skip the base64
images, and write small JSON files between the steps.

The transcript of a subagent is the file `<project>/<session>/subagents/agent-<id>.jsonl` in the
projects folder of Claude Code. Do not read it whole.

```bash
T=<projects folder>/<project>/<session>/subagents/agent-<id>.jsonl
W=$(mktemp -d)                            # the files between the steps
python3 inspect.py "$T" 8                 # the keys and the block types of the first lines
python3 census.py "$T"                    # the counts of the line types and the blocks
python3 briefs.py "$T"                    # the briefs of the manager
python3 extract.py "$T" "$W/events.json"  # one record for each tool call
RETRO_WORK="$W" python3 analyze.py        # the time of each round: tool time and model time
RETRO_WORK="$W" python3 topics.py         # the time of each topic
RETRO_WORK="$W" python3 phases.py         # the time of each phase of a round
python3 params.py "$T"                    # the constants that the agent tuned again and again
python3 tunes.py "$T"                     # the edits that changed only numbers, and the sweeps
```

The rounds of `analyze.py`, the topic patterns of `topics.py`, and the phases of `phases.py` fit
one transcript of the bear. Change them for another transcript. The shares come from keyword
rules on the call descriptions, so each share is about plus or minus 10%.
