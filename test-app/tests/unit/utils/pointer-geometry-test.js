import { module, test } from 'qunit';
import { buildLaneLayout } from 'ember-resource-scheduler/utils/lane-layout';
import { cellsBetween } from 'ember-resource-scheduler/modifiers/pointer-geometry';

// `cellsBetween` is the counting core of the create gesture: the drag reports
// every lane cell (bed-line) between its start and current cell, and the count
// of those cells is "how many places were selected". Two rooms of two lanes
// plus a single-lane room stand in for "N rooms × capacity + a partial".
module('Unit | Utility | pointer-geometry | cellsBetween', function () {
  function layout() {
    return buildLaneLayout(
      [
        { id: 'r1', laneCount: 2 },
        { id: 'r2', laneCount: 2 },
        { id: 'r3', laneCount: 1 },
      ],
      { laneSize: 32 },
    );
  }

  test('a single cell (no movement) is just that cell', function (assert) {
    assert.deepEqual(
      cellsBetween(
        layout(),
        { resourceId: 'r1', lane: 0 },
        {
          resourceId: 'r1',
          lane: 0,
        },
      ),
      [{ resourceId: 'r1', lane: 0 }],
    );
  });

  test('across lanes within one resource', function (assert) {
    assert.deepEqual(
      cellsBetween(
        layout(),
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'r1', lane: 1 },
      ),
      [
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'r1', lane: 1 },
      ],
    );
  });

  test('across resources — every bed-line in between is covered', function (assert) {
    assert.deepEqual(
      cellsBetween(
        layout(),
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'r2', lane: 1 },
      ),
      [
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'r1', lane: 1 },
        { resourceId: 'r2', lane: 0 },
        { resourceId: 'r2', lane: 1 },
      ],
      'two full rooms = four places',
    );
  });

  test('a partial last room contributes only its covered lanes', function (assert) {
    assert.deepEqual(
      cellsBetween(
        layout(),
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'r2', lane: 0 },
      ),
      [
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'r1', lane: 1 },
        { resourceId: 'r2', lane: 0 },
      ],
      'one full room + one lane of the next = three places',
    );
  });

  test('order-independent — dragging up covers the same cells', function (assert) {
    const down = cellsBetween(
      layout(),
      { resourceId: 'r1', lane: 0 },
      { resourceId: 'r2', lane: 1 },
    );
    const up = cellsBetween(
      layout(),
      { resourceId: 'r2', lane: 1 },
      { resourceId: 'r1', lane: 0 },
    );
    assert.deepEqual(up, down);
  });

  test('an unresolvable cell collapses to the start cell', function (assert) {
    assert.deepEqual(
      cellsBetween(
        layout(),
        { resourceId: 'r1', lane: 0 },
        { resourceId: 'ghost', lane: 0 },
      ),
      [{ resourceId: 'r1', lane: 0 }],
    );
  });
});
