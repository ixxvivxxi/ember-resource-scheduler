function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Visible-range computation for windowed rendering along one axis (columns
 * or rows — same math either way, uniform `itemSize` per slot). Returns the
 * inclusive index range to mount plus the pixel sizes for the leading/
 * trailing spacer elements that keep scrollbar geometry and sticky headers
 * correct without mounting the skipped items.
 */
export function computeVisibleRange({
  scrollOffset,
  viewportSize,
  itemCount,
  itemSize,
  overscan = 0,
}) {
  if (itemCount <= 0 || itemSize <= 0) {
    return { startIndex: 0, endIndex: -1, leadingSize: 0, trailingSize: 0 };
  }

  const totalSize = itemCount * itemSize;
  const clampedScroll = clamp(
    scrollOffset,
    0,
    Math.max(0, totalSize - viewportSize),
  );

  const firstVisible = Math.floor(clampedScroll / itemSize);
  const lastVisible = Math.ceil((clampedScroll + viewportSize) / itemSize) - 1;

  const startIndex = clamp(firstVisible - overscan, 0, itemCount - 1);
  const endIndex = clamp(lastVisible + overscan, 0, itemCount - 1);

  return {
    startIndex,
    endIndex,
    leadingSize: startIndex * itemSize,
    trailingSize: (itemCount - 1 - endIndex) * itemSize,
  };
}

/**
 * Same visible-range computation as `computeVisibleRange`, but for a list of
 * items with non-uniform sizes (e.g. resource rows, whose height is
 * `laneCount * laneHeight` and varies per resource). `itemSizes` is a plain
 * array of pixel sizes in list order; a linear scan over it is fine at the
 * "dozens to low-hundreds of resources" scale this addon targets.
 */
export function computeVisibleRangeVariable({
  scrollOffset,
  viewportSize,
  itemSizes,
  overscan = 0,
}) {
  const itemCount = itemSizes.length;

  if (itemCount === 0) {
    return { startIndex: 0, endIndex: -1, leadingSize: 0, trailingSize: 0 };
  }

  const offsets = new Array(itemCount);
  let totalSize = 0;
  for (let index = 0; index < itemCount; index += 1) {
    offsets[index] = totalSize;
    totalSize += itemSizes[index];
  }

  const clampedScroll = clamp(
    scrollOffset,
    0,
    Math.max(0, totalSize - viewportSize),
  );
  const viewportEnd = clampedScroll + viewportSize;

  let firstVisible = 0;
  while (
    firstVisible < itemCount - 1 &&
    offsets[firstVisible] + itemSizes[firstVisible] <= clampedScroll
  ) {
    firstVisible += 1;
  }

  let lastVisible = firstVisible;
  while (
    lastVisible < itemCount - 1 &&
    offsets[lastVisible + 1] < viewportEnd
  ) {
    lastVisible += 1;
  }

  const startIndex = clamp(firstVisible - overscan, 0, itemCount - 1);
  const endIndex = clamp(lastVisible + overscan, 0, itemCount - 1);

  return {
    startIndex,
    endIndex,
    leadingSize: offsets[startIndex],
    trailingSize: totalSize - (offsets[endIndex] + itemSizes[endIndex]),
  };
}
