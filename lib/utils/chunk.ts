/** Split `items` into consecutive slices of at most `size` (last slice may be smaller). */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) return items.length ? [items] : [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
