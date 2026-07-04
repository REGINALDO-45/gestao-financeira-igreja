export function matchesSearch(query: string, fields: Array<string | null | undefined>): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(normalizedQuery));
}
