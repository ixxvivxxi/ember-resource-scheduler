/**
 * Shared pixel math for schedulable-block/drop-surface, reused by both
 * resource-timeline (`orientation: 'horizontal'`, the default — axis runs
 * left-to-right, resources stack as rows) and vertical-resource-grid
 * (`orientation: 'vertical'` — axis runs top-to-bottom, resources sit
 * side-by-side as columns). Which of clientX/clientY maps to "axis unit"
 * vs. "resource/lane" is the *only* thing that differs between the two
 * views, so it's isolated here rather than duplicated per view.
 */
function lanesContentElementFor(element) {
  return element.closest('[data-rs-lanes-content]');
}

/**
 * `laneLayout` offsets start at the first resource row/column, excluding
 * the header — this is a *separate* ancestor from `[data-rs-lanes-content]`
 * (which spans the header too) so lane hit-testing doesn't need to know
 * header/corner size at all.
 *
 * A block living in the **pinned band** has no `[data-rs-rows-content]`
 * ancestor (the band is its own container, outside the scrolling body) — but
 * a drag starting there must still be able to land in the body, so fall back
 * to finding the body container sideways rather than returning null.
 */
function rowsContentElementFor(element) {
  const own = element.closest('[data-rs-rows-content]');
  if (own) {
    return own;
  }
  const lanesContentElement = lanesContentElementFor(element);
  return lanesContentElement ? lanesContentElement.querySelector('[data-rs-rows-content]') : null;
}
function pinnedRowsElementFor(element) {
  const lanesContentElement = lanesContentElementFor(element);
  return lanesContentElement ? lanesContentElement.querySelector('[data-rs-pinned-rows]') : null;
}
function unitForClientPoint(clientX, clientY, axis, lanesContentElement, orientation = 'horizontal') {
  const rect = lanesContentElement.getBoundingClientRect();
  const offset = orientation === 'vertical' ? clientY - rect.top : clientX - rect.left;
  return axis.unitForOffset(offset);
}
function offsetWithinRect(clientX, clientY, rect, orientation) {
  return orientation === 'vertical' ? clientX - rect.left : clientY - rect.top;
}
function isInsideRect(clientX, clientY, rect, orientation) {
  return orientation === 'vertical' ? clientX >= rect.left && clientX < rect.right : clientY >= rect.top && clientY < rect.bottom;
}

/**
 * Translates a pointer position into a `{resourceId, lane}` candidate.
 *
 * With `pinned` given, hit-testing spans **two bands**: the pinned band is
 * painted at a fixed place (it does not scroll), the body scrolls under it.
 * They are separate containers with separate layouts, so the pointer is
 * resolved against the pinned band's *painted* rect first and only then
 * against the body — which is what lets a block be dragged out of a pinned
 * row and dropped onto a real resource below (and back).
 *
 * Without `pinned` (every existing consumer) the behaviour is unchanged.
 */
function resourceLaneForClientPoint(clientX, clientY, laneLayout, rowsContentElement, orientation = 'horizontal', pinned = null) {
  if (pinned && pinned.element && pinned.layout && pinned.layout.rows.length) {
    const bandRect = pinned.element.getBoundingClientRect();
    if (isInsideRect(clientX, clientY, bandRect, orientation)) {
      return pinned.layout.locate(offsetWithinRect(clientX, clientY, bandRect, orientation));
    }
  }
  if (!rowsContentElement) {
    return null;
  }
  const rect = rowsContentElement.getBoundingClientRect();
  return laneLayout.locate(offsetWithinRect(clientX, clientY, rect, orientation));
}

/**
 * The contiguous run of lane cells between two `{ resourceId, lane }` cells,
 * inclusive of both ends, in top-to-bottom row order. Used by the create
 * gesture to enumerate every bed-line a drag-rectangle covers as the pointer
 * moves down through resource rows — the count of these cells is the domain's
 * "number of places selected". Order-independent: `cellsBetween(a, b)` and
 * `cellsBetween(b, a)` return the same run. Cells whose resource is absent from
 * the layout (or a run that can't be resolved) collapse to `[startCell]`.
 */
function cellsBetween(laneLayout, startCell, endCell) {
  const flat = [];
  for (const row of laneLayout.rows) {
    for (let lane = 0; lane < row.laneCount; lane++) {
      flat.push({
        resourceId: row.resource.id,
        lane
      });
    }
  }
  const indexOf = cell => flat.findIndex(candidate => candidate.resourceId === cell.resourceId && candidate.lane === cell.lane);
  const startIndex = indexOf(startCell);
  const endIndex = indexOf(endCell);
  if (startIndex === -1 || endIndex === -1) {
    return [startCell];
  }
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return flat.slice(from, to + 1);
}

export { cellsBetween, lanesContentElementFor, pinnedRowsElementFor, resourceLaneForClientPoint, rowsContentElementFor, unitForClientPoint };
//# sourceMappingURL=pointer-geometry.js.map
