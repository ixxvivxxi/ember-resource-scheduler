import { module, test } from 'qunit';
import {
  assignLanes,
  computeGaps,
} from 'ember-resource-scheduler/utils/resource-lanes';

module('Unit | Utility | resource-lanes', function () {
  test('non-overlapping items all land in lane 0', function (assert) {
    const items = [
      { id: 'a', start: 0, end: 2 },
      { id: 'b', start: 2, end: 4 },
      { id: 'c', start: 4, end: 6 },
    ];

    const lanes = assignLanes(items);

    assert.strictEqual(lanes.laneCount, 1);
    items.forEach((item) =>
      assert.strictEqual(lanes.laneForItem(item), 0, `${item.id} is in lane 0`),
    );
  });

  test('two overlapping items are stacked into separate lanes', function (assert) {
    const a = { id: 'a', start: 0, end: 4 };
    const b = { id: 'b', start: 1, end: 3 };

    const lanes = assignLanes([a, b]);

    assert.strictEqual(lanes.laneCount, 2);
    assert.strictEqual(lanes.laneForItem(a), 0);
    assert.strictEqual(lanes.laneForItem(b), 1);
  });

  test('a later item reuses a lane that has already freed up', function (assert) {
    const a = { id: 'a', start: 0, end: 2 };
    const b = { id: 'b', start: 1, end: 3 };
    const c = { id: 'c', start: 2, end: 4 };

    const lanes = assignLanes([a, b, c]);

    assert.strictEqual(lanes.laneCount, 2);
    assert.strictEqual(lanes.laneForItem(a), 0);
    assert.strictEqual(lanes.laneForItem(b), 1);
    assert.strictEqual(
      lanes.laneForItem(c),
      0,
      'c starts exactly when a ended, so it reuses lane 0',
    );
  });

  test('multi-overlap across three concurrent items needs three lanes', function (assert) {
    const a = { id: 'a', start: 0, end: 10 };
    const b = { id: 'b', start: 2, end: 8 };
    const c = { id: 'c', start: 4, end: 6 };

    const lanes = assignLanes([a, b, c]);

    assert.strictEqual(lanes.laneCount, 3);
  });

  test('accepts custom accessors instead of item.start/item.end', function (assert) {
    const items = [
      { blockId: 'a', unitStart: 0, unitEnd: 2 },
      { blockId: 'b', unitStart: 1, unitEnd: 3 },
    ];

    const lanes = assignLanes(items, {
      getStart: (item) => item.unitStart,
      getEnd: (item) => item.unitEnd,
    });

    assert.strictEqual(lanes.laneCount, 2);
  });

  test('works identically for minute-unit spans via an injected comparator', function (assert) {
    const compare = (a, b) => a - b;
    const items = [
      { id: 'a', start: 540, end: 600 }, // 09:00-10:00
      { id: 'b', start: 570, end: 630 }, // 09:30-10:30 overlaps a
    ];

    const lanes = assignLanes(items, { compare });

    assert.strictEqual(lanes.laneCount, 2);
  });

  test('gapsForLane finds the free spans between items in a lane', function (assert) {
    const a = { id: 'a', start: 0, end: 2 };
    const b = { id: 'b', start: 5, end: 7 };

    const lanes = assignLanes([a, b]);

    assert.strictEqual(lanes.laneCount, 1);
    assert.deepEqual(lanes.gapsForLane(0), [{ start: 2, end: 5 }]);
  });

  test('gapsForLane includes leading/trailing gaps when a range is given', function (assert) {
    const a = { id: 'a', start: 3, end: 5 };

    const lanes = assignLanes([a]);

    assert.deepEqual(lanes.gapsForLane(0, { rangeStart: 0, rangeEnd: 10 }), [
      { start: 0, end: 3 },
      { start: 5, end: 10 },
    ]);
  });

  test('gapsForLane returns the whole range when the lane has no items in range bounds', function (assert) {
    const lanes = assignLanes([]);

    assert.strictEqual(lanes.laneCount, 0);
    assert.deepEqual(lanes.gapsForLane(0, { rangeStart: 0, rangeEnd: 10 }), [
      { start: 0, end: 10 },
    ]);
  });

  test('gapsForLane handles adjacent (touching) items with no gap between them', function (assert) {
    const a = { id: 'a', start: 0, end: 2 };
    const b = { id: 'b', start: 2, end: 4 };

    const lanes = assignLanes([a, b]);

    assert.strictEqual(lanes.laneCount, 1);
    assert.deepEqual(lanes.gapsForLane(0, { rangeStart: 0, rangeEnd: 4 }), []);
  });

  module('computeGaps', function () {
    test('finds gaps for an externally-grouped set of items (no assignLanes call)', function (assert) {
      const items = [
        { id: 'a', start: 3, end: 5 },
        { id: 'b', start: 8, end: 9 },
      ];

      assert.deepEqual(computeGaps(items, { rangeStart: 0, rangeEnd: 10 }), [
        { start: 0, end: 3 },
        { start: 5, end: 8 },
        { start: 9, end: 10 },
      ]);
    });

    test('sorts unsorted input by start before computing gaps', function (assert) {
      const items = [
        { id: 'b', start: 8, end: 9 },
        { id: 'a', start: 3, end: 5 },
      ];

      assert.deepEqual(computeGaps(items, { rangeStart: 0, rangeEnd: 10 }), [
        { start: 0, end: 3 },
        { start: 5, end: 8 },
        { start: 9, end: 10 },
      ]);
    });

    test('honors custom accessors and comparator, matching resource-lanes semantics', function (assert) {
      const items = [{ unitStart: 540, unitEnd: 600 }];

      const gaps = computeGaps(items, {
        getStart: (item) => item.unitStart,
        getEnd: (item) => item.unitEnd,
        compare: (a, b) => a - b,
        rangeStart: 480,
        rangeEnd: 660,
      });

      assert.deepEqual(gaps, [
        { start: 480, end: 540 },
        { start: 600, end: 660 },
      ]);
    });
  });
});
