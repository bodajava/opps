export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function generateUniqueSlug(
  text: string,
  existingSlugs: string[],
): string {
  const slug = generateSlug(text);
  if (!existingSlugs.includes(slug)) {
    return slug;
  }
  let counter = 1;
  while (existingSlugs.includes(`${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}
