function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Free spans within a single already-grouped set of items (e.g. one lane),
 * optionally bounded by `rangeStart`/`rangeEnd` (e.g. the visible axis
 * extent). Items are assumed already sorted or will be sorted by `start`.
 * Exported standalone so callers with externally lane-assigned items (a
 * `Block.lane` given by the consuming app, not recomputed by `assignLanes`)
 * can still get gap/empty-cell computation without re-running the
 * collision-stacking algorithm.
 */
export function computeGaps(items, options = {}) {
  const {
    getStart = (item) => item.start,
    getEnd = (item) => item.end,
    compare = defaultCompare,
    rangeStart,
    rangeEnd,
  } = options;

  const sorted = [...items].sort((a, b) => compare(getStart(a), getStart(b)));
  const gaps = [];
  let cursor = rangeStart;

  for (const item of sorted) {
    const start = getStart(item);
    const end = getEnd(item);

    if (cursor !== undefined && compare(cursor, start) < 0) {
      gaps.push({ start: cursor, end: start });
    }
    if (cursor === undefined || compare(end, cursor) > 0) {
      cursor = end;
    }
  }

  if (
    rangeEnd !== undefined &&
    cursor !== undefined &&
    compare(cursor, rangeEnd) < 0
  ) {
    gaps.push({ start: cursor, end: rangeEnd });
  }

  return gaps;
}

/**
 * Generic collision-stacking (interval-partitioning) algorithm: given a list
 * of `{ start, end }`-shaped items (accessors/comparator injected so this
 * works identically for day-unit and minute-unit spans), assigns each item
 * to the lowest-numbered lane whose previous occupant has already ended.
 */
export function assignLanes(items, options = {}) {
  const {
    getStart = (item) => item.start,
    getEnd = (item) => item.end,
    compare = defaultCompare,
  } = options;

  const sorted = [...items].sort((a, b) => {
    const byStart = compare(getStart(a), getStart(b));
    return byStart !== 0 ? byStart : compare(getEnd(a), getEnd(b));
  });

  const laneEnds = [];
  const laneItems = [];
  const itemLane = new Map();

  for (const item of sorted) {
    const start = getStart(item);
    const end = getEnd(item);

    let lane = laneEnds.findIndex((laneEnd) => compare(laneEnd, start) <= 0);

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
      laneItems.push([]);
    } else {
      laneEnds[lane] = end;
    }

    laneItems[lane].push(item);
    itemLane.set(item, lane);
  }

  return {
    laneCount: laneItems.length,
    laneItems,
    laneForItem(item) {
      return itemLane.get(item);
    },
    /**
     * Free spans within a single lane, optionally bounded by
     * `rangeStart`/`rangeEnd` (e.g. the visible axis extent).
     */
    gapsForLane(lane, { rangeStart, rangeEnd } = {}) {
      return computeGaps(laneItems[lane] ?? [], {
        getStart,
        getEnd,
        compare,
        rangeStart,
        rangeEnd,
      });
    },
  };
}
