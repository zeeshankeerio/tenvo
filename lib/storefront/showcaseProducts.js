/**
 * Trim product lists to full showcase rows (6 cols on xl) so grids never look half-empty.
 * @param {object[]} products
 * @param {number} [columns=6]
 * @param {number} [minRows=2]
 */
export function trimToShowcaseRows(products = [], columns = 6, minRows = 2) {
  if (!Array.isArray(products) || products.length === 0) return [];
  const minCount = columns * minRows;
  if (products.length <= minCount) return products;
  const fullRows = Math.floor(products.length / columns);
  return products.slice(0, fullRows * columns);
}
