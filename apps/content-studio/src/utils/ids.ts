export const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const slugify = (value: string): string => {
  return value.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
};

export const makeBaseId = (title: string, prefix: string): string => {
  const slug = slugify(title);
  if (slug) return slug;
  return `${prefix}_${Date.now()}`;
};

export const titleToId = (title: string): string => slugify(title);

export const makeUniqueId = (base: string, existing: Set<string>): string => {
  if (!existing.has(base)) return base;
  let index = 2;
  let candidate = `${base}_${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}`;
  }
  return candidate;
};
