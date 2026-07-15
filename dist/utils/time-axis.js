function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
const numericTimeOps = {
  diff: (a, b) => b - a,
  add: (value, amount) => value + amount
};
function createAxis({
  unitCount,
  unitSize,
  unitToValue,
  valueToUnit
}) {
  if (!(unitSize > 0)) {
    throw new Error('time-axis: unitSize must be > 0');
  }
  const safeUnitCount = Math.max(0, unitCount);
  const totalSize = safeUnitCount * unitSize;
  return {
    unitCount: safeUnitCount,
    unitSize,
    totalSize,
    offsetForUnit(unit) {
      return clamp(unit, 0, safeUnitCount) * unitSize;
    },
    unitForOffset(offset) {
      if (safeUnitCount === 0) {
        return 0;
      }
      return clamp(Math.floor(offset / unitSize), 0, safeUnitCount - 1);
    },
    spanToOffsetAndSize(unitStart, unitEnd) {
      const start = clamp(Math.min(unitStart, unitEnd), 0, safeUnitCount);
      const end = clamp(Math.max(unitStart, unitEnd), 0, safeUnitCount);
      return {
        offset: start * unitSize,
        size: (end - start) * unitSize
      };
    },
    valueForUnit: unitToValue,
    unitForValue: valueToUnit
  };
}

/**
 * Day-granularity axis: unit 0 is `start`, unit N is `start + N days`.
 * `dateOps` must supply `diffInDays(from, to)` (whole days from `to` to
 * `from`) and `addDays(date, n)` — the axis never touches a date library
 * directly so callers can bind Luxon, date-fns, plain Date, etc.
 */
function createDayAxis({
  start,
  end,
  unitSize,
  dateOps
}) {
  if (!dateOps || typeof dateOps.diffInDays !== 'function' || typeof dateOps.addDays !== 'function') {
    throw new Error('createDayAxis requires a dateOps adapter with diffInDays(from, to) and addDays(date, n)');
  }
  const unitCount = Math.max(0, dateOps.diffInDays(start, end)) + 1;
  return createAxis({
    unitCount,
    unitSize,
    unitToValue: unit => dateOps.addDays(start, unit),
    valueToUnit: value => dateOps.diffInDays(start, value)
  });
}

/**
 * Minute-granularity axis: unit 0 is `start`, unit N is `start + N *
 * granularity` minutes. Defaults `timeOps` to plain-number arithmetic, since
 * minute-of-day values are usually already numeric, but accepts an injected
 * adapter for callers using Date/Duration objects instead.
 */
function createMinuteAxis({
  start,
  end,
  unitSize,
  granularity = 1,
  timeOps = numericTimeOps
}) {
  if (!(granularity > 0)) {
    throw new Error('createMinuteAxis: granularity must be > 0');
  }
  const totalMinutes = timeOps.diff(start, end);
  const unitCount = Math.max(0, Math.ceil(totalMinutes / granularity));
  return createAxis({
    unitCount,
    unitSize,
    unitToValue: unit => timeOps.add(start, unit * granularity),
    valueToUnit: value => Math.floor(timeOps.diff(start, value) / granularity)
  });
}

export { createDayAxis, createMinuteAxis };
//# sourceMappingURL=time-axis.js.map
