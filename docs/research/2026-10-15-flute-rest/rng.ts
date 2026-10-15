let s = 12345;
export function seed(v: number): void { s = v; }
export function random(): number {
  s = (s * 1103515245 + 12345) % 2147483648;
  return s / 2147483648;
}
