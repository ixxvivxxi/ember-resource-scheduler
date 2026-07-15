import { module, test } from 'qunit';
import {
  createDayAxis,
  createMinuteAxis,
} from 'ember-resource-scheduler/utils/time-axis';

const dateOps = {
  diffInDays(from, to) {
    return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  },
  addDays(date, n) {
    const result = new Date(date);
    result.setDate(result.getDate() + n);
    return result;
  },
};

module('Unit | Utility | time-axis', function () {
  module('createDayAxis', function () {
    test('unitCount is inclusive of both endpoints', function (assert) {
      const axis = createDayAxis({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      assert.strictEqual(axis.unitCount, 5);
      assert.strictEqual(axis.totalSize, 160);
    });

    test('a single-day range has unitCount 1', function (assert) {
      const day = new Date(2026, 0, 1);
      const axis = createDayAxis({
        start: day,
        end: day,
        unitSize: 32,
        dateOps,
      });

      assert.strictEqual(axis.unitCount, 1);
      assert.strictEqual(axis.totalSize, 32);
    });

    [
      { unit: 0, expectedOffset: 0 },
      { unit: 1, expectedOffset: 32 },
      { unit: 4, expectedOffset: 128 },
    ].forEach(({ unit, expectedOffset }) => {
      test(`offsetForUnit(${unit}) === ${expectedOffset}`, function (assert) {
        const axis = createDayAxis({
          start: new Date(2026, 0, 1),
          end: new Date(2026, 0, 5),
          unitSize: 32,
          dateOps,
        });

        assert.strictEqual(axis.offsetForUnit(unit), expectedOffset);
      });
    });

    test('offsetForUnit clamps out-of-range units to the axis bounds', function (assert) {
      const axis = createDayAxis({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      assert.strictEqual(
        axis.offsetForUnit(-3),
        0,
        'negative unit clamps to 0',
      );
      assert.strictEqual(
        axis.offsetForUnit(99),
        axis.totalSize,
        'overflowing unit clamps to unitCount',
      );
    });

    [
      { offset: 0, expectedUnit: 0 },
      { offset: 31, expectedUnit: 0 },
      { offset: 32, expectedUnit: 1 },
      { offset: 159, expectedUnit: 4 },
    ].forEach(({ offset, expectedUnit }) => {
      test(`unitForOffset(${offset}) === ${expectedUnit}`, function (assert) {
        const axis = createDayAxis({
          start: new Date(2026, 0, 1),
          end: new Date(2026, 0, 5),
          unitSize: 32,
          dateOps,
        });

        assert.strictEqual(axis.unitForOffset(offset), expectedUnit);
      });
    });

    test('unitForOffset clamps negative and overflowing offsets', function (assert) {
      const axis = createDayAxis({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      assert.strictEqual(axis.unitForOffset(-100), 0);
      assert.strictEqual(axis.unitForOffset(10_000), axis.unitCount - 1);
    });

    test('spanToOffsetAndSize converts a unit range into pixel offset/size', function (assert) {
      const axis = createDayAxis({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      assert.deepEqual(axis.spanToOffsetAndSize(1, 3), {
        offset: 32,
        size: 64,
      });
    });

    test('spanToOffsetAndSize clamps a span that overhangs the axis', function (assert) {
      const axis = createDayAxis({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      assert.deepEqual(axis.spanToOffsetAndSize(-2, 2), {
        offset: 0,
        size: 64,
      });
      assert.deepEqual(axis.spanToOffsetAndSize(3, 99), {
        offset: 96,
        size: 64,
      });
    });

    test('spanToOffsetAndSize normalizes a reversed (end before start) span', function (assert) {
      const axis = createDayAxis({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      assert.deepEqual(
        axis.spanToOffsetAndSize(3, 1),
        axis.spanToOffsetAndSize(1, 3),
      );
    });

    test('valueForUnit/unitForValue round-trip through the injected dateOps', function (assert) {
      const start = new Date(2026, 0, 1);
      const axis = createDayAxis({
        start,
        end: new Date(2026, 0, 5),
        unitSize: 32,
        dateOps,
      });

      const date = axis.valueForUnit(2);
      assert.strictEqual(dateOps.diffInDays(start, date), 2);
      assert.strictEqual(axis.unitForValue(date), 2);
    });
  });

  module('createMinuteAxis', function () {
    test('defaults to plain-number timeOps when none is supplied', function (assert) {
      const axis = createMinuteAxis({ start: 0, end: 60, unitSize: 2 });

      assert.strictEqual(axis.unitCount, 60);
      assert.strictEqual(axis.totalSize, 120);
    });

    test('honors a custom granularity (minutes per unit)', function (assert) {
      const axis = createMinuteAxis({
        start: 0,
        end: 60,
        unitSize: 4,
        granularity: 15,
      });

      assert.strictEqual(axis.unitCount, 4);
      assert.strictEqual(axis.totalSize, 16);
      assert.strictEqual(axis.offsetForUnit(2), 8);
    });

    test('unitForOffset/spanToOffsetAndSize clamp at the minute-axis bounds', function (assert) {
      const axis = createMinuteAxis({
        start: 0,
        end: 60,
        unitSize: 4,
        granularity: 15,
      });

      assert.strictEqual(axis.unitForOffset(-10), 0);
      assert.strictEqual(axis.unitForOffset(10_000), axis.unitCount - 1);
      assert.deepEqual(axis.spanToOffsetAndSize(-1, 10), {
        offset: 0,
        size: 16,
      });
    });

    test('accepts an injected timeOps adapter for non-numeric time values', function (assert) {
      const timeOps = {
        diff: (a, b) => b.minutesSinceMidnight - a.minutesSinceMidnight,
        add: (value, amount) => ({
          minutesSinceMidnight: value.minutesSinceMidnight + amount,
        }),
      };
      const start = { minutesSinceMidnight: 480 };
      const end = { minutesSinceMidnight: 540 };

      const axis = createMinuteAxis({
        start,
        end,
        unitSize: 1,
        granularity: 15,
        timeOps,
      });

      assert.strictEqual(axis.unitCount, 4);
      assert.strictEqual(axis.valueForUnit(2).minutesSinceMidnight, 510);
      assert.strictEqual(axis.unitForValue({ minutesSinceMidnight: 525 }), 3);
    });
  });
});
