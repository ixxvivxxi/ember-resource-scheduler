function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Lays resources out one after another along a single pixel axis, each
 * occupying `laneCount * laneSize` (a resource-timeline row's height, or a
 * vertical-resource-grid column's width — same math either way). Returns
 * per-resource offsets/sizes plus `locate(offset)`, a reverse lookup used
 * both for row/column virtualization (as `itemSizes`) and for translating a
 * pointer coordinate into a resourceId/lane candidate while dragging.
 */
export function buildLaneLayout(
  resources,
  { laneSize, getLaneCount = (resource) => resource.laneCount ?? 1 },
) {
  const rows = [];
  let cursor = 0;

  for (const resource of resources) {
    const laneCount = Math.max(1, getLaneCount(resource));
    const size = laneCount * laneSize;
    rows.push({ resource, laneCount, offset: cursor, size });
    cursor += size;
  }

  const totalSize = cursor;

  function locate(offset) {
    if (rows.length === 0) {
      return null;
    }

    const clamped = clamp(offset, 0, Math.max(0, totalSize - 1));
    const row =
      rows.find((candidate) => clamped < candidate.offset + candidate.size) ??
      rows[rows.length - 1];
    const lane = clamp(
      Math.floor((clamped - row.offset) / laneSize),
      0,
      row.laneCount - 1,
    );

    return { resourceId: row.resource.id, lane };
  }

  return {
    rows,
    totalSize,
    itemSizes: rows.map((row) => row.size),
    locate,
  };
}
