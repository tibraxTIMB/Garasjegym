/**
 * Pure ordering helpers for WOD Builder.
 * The selected array is the source of truth; sort_order is only its persisted form.
 */
function moveToIndex(items, from, to) {
  if (!Array.isArray(items) || from < 0 || from >= items.length ||
      to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function moveWodItemByKey(items, key, delta) {
  if (!Array.isArray(items) || !Number.isInteger(Number(delta))) return items;
  const from = items.findIndex(item => item?.key === key);
  if (from < 0) return items;
  return moveToIndex(items, from, from + Number(delta));
}

/** targetPosition is the visible, one-based position shown in the selector. */
export function moveWodItemToPosition(items, key, targetPosition) {
  if (!Array.isArray(items)) return items;
  const position = Number.parseInt(String(targetPosition), 10);
  if (!Number.isInteger(position)) return items;
  const from = items.findIndex(item => item?.key === key);
  return moveToIndex(items, from, position - 1);
}

/** Drop the dragged item into the target item's current position. */
export function moveWodItemToKey(items, sourceKey, targetKey) {
  if (!Array.isArray(items) || !sourceKey || !targetKey || sourceKey === targetKey) return items;
  const from = items.findIndex(item => item?.key === sourceKey);
  const to = items.findIndex(item => item?.key === targetKey);
  return moveToIndex(items, from, to);
}

/** Convert the current visible order into explicit, sequential database positions. */
export function addWodSortOrder(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({ ...item, sort_order: index + 1 }));
}

/** Hydrate WOD items deterministically, preserving legacy array order as a fallback. */
export function sortWodItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => ({ item, index, order: Number(item?.sort_order) }))
    .sort((a, b) => {
      const aValid = Number.isFinite(a.order) && a.order > 0;
      const bValid = Number.isFinite(b.order) && b.order > 0;
      if (aValid && bValid && a.order !== b.order) return a.order - b.order;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    })
    .map(entry => entry.item);
}
