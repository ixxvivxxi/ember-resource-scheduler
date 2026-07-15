import { module, test } from 'qunit';
import {
  computeVisibleRange,
  computeVisibleRangeVariable,
} from 'ember-resource-scheduler/utils/virtualize';

module('Unit | Utility | virtualize', function () {
  test('at scrollOffset 0, the visible range starts at index 0', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 0,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
    });

    assert.strictEqual(range.startIndex, 0);
    assert.strictEqual(range.endIndex, 4);
    assert.strictEqual(range.leadingSize, 0);
    assert.strictEqual(range.trailingSize, (50 - 1 - 4) * 20);
  });

  test('scrolling partway in shifts the visible range and leading spacer size', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 205,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
    });

    assert.strictEqual(range.startIndex, 10);
    assert.strictEqual(range.endIndex, 15);
    assert.strictEqual(range.leadingSize, 200);
  });

  test('overscan pads the range on both sides', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 200,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
      overscan: 2,
    });

    assert.strictEqual(range.startIndex, 8);
    assert.strictEqual(range.endIndex, 16);
  });

  test('overscan is clamped at the start of the list', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 0,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
      overscan: 5,
    });

    assert.strictEqual(range.startIndex, 0);
  });

  test('overscan is clamped at the end of the list', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 800,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
      overscan: 5,
    });

    assert.strictEqual(range.endIndex, 49);
    assert.strictEqual(range.trailingSize, 0);
  });

  test('a negative scrollOffset clamps to 0', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: -500,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
    });

    assert.strictEqual(range.startIndex, 0);
    assert.strictEqual(range.leadingSize, 0);
  });

  test('a scrollOffset past the end clamps to the last full viewport', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 100_000,
      viewportSize: 100,
      itemCount: 50,
      itemSize: 20,
    });

    assert.strictEqual(range.endIndex, 49);
  });

  test('when the viewport is larger than the total content, the whole list is visible', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 0,
      viewportSize: 1000,
      itemCount: 10,
      itemSize: 20,
    });

    assert.strictEqual(range.startIndex, 0);
    assert.strictEqual(range.endIndex, 9);
    assert.strictEqual(range.trailingSize, 0);
  });

  test('an empty list yields an empty range with no spacers', function (assert) {
    const range = computeVisibleRange({
      scrollOffset: 0,
      viewportSize: 100,
      itemCount: 0,
      itemSize: 20,
    });

    assert.strictEqual(range.startIndex, 0);
    assert.strictEqual(range.endIndex, -1);
    assert.strictEqual(range.leadingSize, 0);
    assert.strictEqual(range.trailingSize, 0);
  });

  test('works identically for row-windowing (resources) as for column-windowing (dates)', function (assert) {
    const columnRange = computeVisibleRange({
      scrollOffset: 320,
      viewportSize: 640,
      itemCount: 151,
      itemSize: 32,
    });
    const rowRange = computeVisibleRange({
      scrollOffset: 320,
      viewportSize: 640,
      itemCount: 151,
      itemSize: 32,
    });

    assert.deepEqual(columnRange, rowRange);
  });

  module('computeVisibleRangeVariable', function () {
    // resources with laneCount 1, 2, 1, 3, 1 at a 32px lane height
    const itemSizes = [32, 64, 32, 96, 32];

    test('at scrollOffset 0, the visible range starts at index 0', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: 0,
        viewportSize: 100,
        itemSizes,
      });

      assert.strictEqual(range.startIndex, 0);
      assert.strictEqual(range.endIndex, 2);
      assert.strictEqual(range.leadingSize, 0);
      assert.strictEqual(range.trailingSize, 128);
    });

    test('scrolling past the first (tallest) items shifts the visible range', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: 150,
        viewportSize: 50,
        itemSizes,
      });

      assert.strictEqual(range.startIndex, 3);
      assert.strictEqual(range.endIndex, 3);
      assert.strictEqual(range.leadingSize, 128);
      assert.strictEqual(range.trailingSize, 32);
    });

    test('overscan pads the range on both sides', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: 150,
        viewportSize: 50,
        itemSizes,
        overscan: 1,
      });

      assert.strictEqual(range.startIndex, 2);
      assert.strictEqual(range.endIndex, 4);
      assert.strictEqual(range.trailingSize, 0);
    });

    test('an empty itemSizes list yields an empty range with no spacers', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: 0,
        viewportSize: 100,
        itemSizes: [],
      });

      assert.strictEqual(range.startIndex, 0);
      assert.strictEqual(range.endIndex, -1);
      assert.strictEqual(range.leadingSize, 0);
      assert.strictEqual(range.trailingSize, 0);
    });

    test('a negative scrollOffset clamps to 0', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: -500,
        viewportSize: 100,
        itemSizes,
      });

      assert.strictEqual(range.startIndex, 0);
      assert.strictEqual(range.leadingSize, 0);
    });

    test('a scrollOffset past the end clamps to the last full viewport', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: 10_000,
        viewportSize: 50,
        itemSizes,
      });

      assert.strictEqual(range.startIndex, 3);
      assert.strictEqual(range.endIndex, 4);
      assert.strictEqual(range.trailingSize, 0);
    });

    test('when the viewport is larger than total content, the whole list is visible', function (assert) {
      const range = computeVisibleRangeVariable({
        scrollOffset: 0,
        viewportSize: 1000,
        itemSizes,
      });

      assert.strictEqual(range.startIndex, 0);
      assert.strictEqual(range.endIndex, 4);
      assert.strictEqual(range.trailingSize, 0);
    });
  });
});
