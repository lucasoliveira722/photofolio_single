export function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

export function titleFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '');
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildSeedRows(categorySlug, files, { existingPaths = [] } = {}) {
  const existing = new Set(existingPaths);
  return files
    .map((file) => ({ file, storagePath: `${categorySlug}/${file.filename}` }))
    .filter(({ storagePath }) => !existing.has(storagePath))
    .map(({ file, storagePath }, index) => ({
      storagePath,
      title: titleFromFilename(file.filename),
      width: file.width,
      height: file.height,
      displayOrder: existing.size + index,
    }));
}
