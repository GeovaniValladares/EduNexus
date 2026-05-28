export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function textMatchesQuery(fields: (string | undefined)[], query: string): boolean {
  const q = normalizeSearchText(query.trim());
  if (!q) return true;
  return fields.some((f) => f && normalizeSearchText(f).includes(q));
}
