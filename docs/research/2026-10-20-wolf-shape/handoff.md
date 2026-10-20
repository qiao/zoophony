# Handoff of round wolf-shape

Base `980f2bf5`. Goal: the wolf mesh gets 0.9 of its height and 1.2 of its width. The depth stays.

## State

- [ ] The rule `proportions` of a mesh rig config, with no change of the other rigs.
- [ ] The joints, the weights, and the chair of `tools/mesh-rigs/wolf.json` on the new form.
- [ ] The arm factor, the clarinet hold, the arm gate, the folds, the depths, and the tail gaps.
- [ ] The docs: design 4.4 and 5.3, the decision file, the report, `model-work.md`, `TODO.md`.

## Notes

- The rule scales the source after the scale to 1 unit high. The meters for each unit stay, so
  `app.shoulders` and the height of `ANIMALS` take the factor of the shoulder joint.
