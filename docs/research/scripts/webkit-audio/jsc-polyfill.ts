// The jsc shell has print() and no console. spessasynth_core reads console when its module
// loads, so this module runs first.

declare function print(...values: unknown[]): void;

const shell = globalThis as { console?: unknown };
const quiet = (): void => undefined;
shell.console ??= {
  log: print,
  info: print,
  warn: print,
  error: print,
  debug: quiet,
  trace: quiet,
  group: quiet,
  groupCollapsed: quiet,
  groupEnd: quiet,
  time: quiet,
  timeEnd: quiet,
};
