# Vendored anti-slop Oxlint plugin

Source: [anti-slop](https://github.com/dmmulroy/anti-slop), commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10).
Base revision: `e8100a1` (2026-08-14, tree `4d12edf72e287e4b46729225198232a2f22ac734`).

## Installed paths

- `tools/oxlint/anti-slop/index.ts`
- `tools/oxlint/anti-slop/rules/`
- `tools/oxlint/anti-slop/shared/`
- `tools/oxlint/anti-slop/vendor/`
- `tools/oxlint/anti-slop/effect/`

## Configuration

The active configuration in `.oxlintrc.json` enables the 15 core rules. Three newer upstream rules are available in the plugin export:
- `anti-slop/no-array-filter-map`
- `anti-slop/no-reduce-accumulator-copy`
- `anti-slop/require-readable-spacing`

The optional Effect rules in `effect/` remain disabled because the project does not use Effect.
