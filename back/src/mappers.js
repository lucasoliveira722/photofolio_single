export function mapCategory(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    displayOrder: row.display_order,
  };
}

export function mapImage(row, publicUrl) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    width: row.width,
    height: row.height,
    url: publicUrl,
  };
}
