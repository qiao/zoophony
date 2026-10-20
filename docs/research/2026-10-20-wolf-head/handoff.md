# Handoff of round wolf-head

Date 2026-10-20. Start commit `98875452`. Brief: keep the head of the wolf out of the proportions
rule (`proportions.keep` of `tools/mesh-rigs/wolf.json`).

## Status

- [ ] The mechanism `keep: head` with a blend zone at the neck, with no change of bytes.
- [ ] The wolf config and the rig.
- [ ] The measures: the head table, the body table, the hold, the arm gate, the depths, the
  bodies of the app.
- [ ] The docs: the decision rows, design 4.4, the report section, model work.

## Notes

- The blend zone: the neck of the source before the proportions, from the neck joint (y 0.70)
  to the head line (`headFrom`, y 0.775).
