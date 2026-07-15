import { module, test } from 'qunit';
import { buildLaneLayout } from 'ember-resource-scheduler/utils/lane-layout';

module('Unit | Utility | lane-layout', function () {
  const resources = [
    { id: 'r1', laneCount: 1 },
    { id: 'r2', laneCount: 2 },
    { id: 'r3', laneCount: 1 },
  ];

  test('lays resources out end-to-end by laneCount * laneSize', function (assert) {
    const layout = buildLaneLayout(resources, { laneSize: 32 });

    assert.deepEqual(
      layout.rows.map((row) => ({
        id: row.resource.id,
        offset: row.offset,
        size: row.size,
      })),
      [
        { id: 'r1', offset: 0, size: 32 },
        { id: 'r2', offset: 32, size: 64 },
        { id: 'r3', offset: 96, size: 32 },
      ],
    );
    assert.strictEqual(layout.totalSize, 128);
  });

  test('itemSizes matches the rows for use with computeVisibleRangeVariable', function (assert) {
    const layout = buildLaneLayout(resources, { laneSize: 32 });

    assert.deepEqual(layout.itemSizes, [32, 64, 32]);
  });

  test('a laneCount of 0 or missing is treated as at least 1', function (assert) {
    const layout = buildLaneLayout([{ id: 'r1', laneCount: 0 }, { id: 'r2' }], {
      laneSize: 32,
    });

    assert.deepEqual(layout.itemSizes, [32, 32]);
  });

  test('locate() finds the resource and lane 0 for a single-lane resource', function (assert) {
    const layout = buildLaneLayout(resources, { laneSize: 32 });

    assert.deepEqual(layout.locate(10), { resourceId: 'r1', lane: 0 });
  });

  test('locate() finds the correct lane within a multi-lane resource', function (assert) {
    const layout = buildLaneLayout(resources, { laneSize: 32 });

    assert.deepEqual(layout.locate(32), { resourceId: 'r2', lane: 0 });
    assert.deepEqual(layout.locate(63), { resourceId: 'r2', lane: 0 });
    assert.deepEqual(layout.locate(64), { resourceId: 'r2', lane: 1 });
    assert.deepEqual(layout.locate(95), { resourceId: 'r2', lane: 1 });
  });

  test('locate() clamps a negative offset to the first resource/lane', function (assert) {
    const layout = buildLaneLayout(resources, { laneSize: 32 });

    assert.deepEqual(layout.locate(-50), { resourceId: 'r1', lane: 0 });
  });

  test('locate() clamps an overflowing offset to the last resource/lane', function (assert) {
    const layout = buildLaneLayout(resources, { laneSize: 32 });

    assert.deepEqual(layout.locate(10_000), { resourceId: 'r3', lane: 0 });
  });

  test('locate() returns null for an empty resource list', function (assert) {
    const layout = buildLaneLayout([], { laneSize: 32 });

    assert.strictEqual(layout.locate(10), null);
  });

  test('accepts a custom getLaneCount accessor', function (assert) {
    const layout = buildLaneLayout([{ id: 'r1', capacity: 3 }], {
      laneSize: 32,
      getLaneCount: (resource) => resource.capacity,
    });

    assert.deepEqual(layout.itemSizes, [96]);
  });
});
