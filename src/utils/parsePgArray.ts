export function parsePgArray(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .replace(/^{|}$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
