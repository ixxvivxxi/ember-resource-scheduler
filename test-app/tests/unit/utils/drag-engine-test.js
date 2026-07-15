import { module, test } from 'qunit';
import { createDragEngine } from 'ember-resource-scheduler/utils/drag-engine';

function createCandidate(overrides = {}) {
  return {
    type: 'create',
    blockId: null,
    resourceId: 'room-1',
    lane: 0,
    unitStart: 2,
    unitEnd: 2,
    ...overrides,
  };
}

module('Unit | Utility | drag-engine', function () {
  test('isDragging/current reflect idle state before any drag starts', function (assert) {
    const engine = createDragEngine();

    assert.false(engine.isDragging);
    assert.strictEqual(engine.current, null);
  });

  test('start() begins a drag and returns the candidate annotated with validity', function (assert) {
    const engine = createDragEngine();

    const result = engine.start(createCandidate());

    assert.true(engine.isDragging);
    assert.true(result.valid);
    assert.strictEqual(result.type, 'create');
    assert.deepEqual(engine.current, createCandidate());
  });

  test('a full create sequence: start -> updatePointer (extend) -> end', function (assert) {
    const engine = createDragEngine();

    engine.start(createCandidate({ unitStart: 2, unitEnd: 2 }));
    engine.updatePointer({ unitEnd: 4 });
    const result = engine.end();

    assert.deepEqual(result, createCandidate({ unitStart: 2, unitEnd: 4 }));
    assert.false(engine.isDragging);
    assert.strictEqual(engine.current, null);
  });

  test('a move sequence updates resourceId/lane across the drag', function (assert) {
    const engine = createDragEngine();

    engine.start(
      createCandidate({
        type: 'move',
        blockId: 'b1',
        unitStart: 2,
        unitEnd: 4,
      }),
    );
    engine.updatePointer({
      resourceId: 'room-2',
      lane: 1,
      unitStart: 3,
      unitEnd: 5,
    });
    const result = engine.end();

    assert.strictEqual(result.resourceId, 'room-2');
    assert.strictEqual(result.lane, 1);
    assert.strictEqual(result.unitStart, 3);
    assert.strictEqual(result.unitEnd, 5);
  });

  test('resize-start and resize-end only move one edge of the span', function (assert) {
    const engine = createDragEngine();

    engine.start(
      createCandidate({
        type: 'resize-end',
        blockId: 'b1',
        unitStart: 2,
        unitEnd: 4,
      }),
    );
    engine.updatePointer({ unitEnd: 6 });
    const result = engine.end();

    assert.strictEqual(
      result.unitStart,
      2,
      'unitStart is untouched by a resize-end drag',
    );
    assert.strictEqual(result.unitEnd, 6);
  });

  test('canPlace(false) marks intermediate updates invalid but does not block the drag', function (assert) {
    const engine = createDragEngine({
      canPlace: (candidate) => candidate.unitEnd <= 5,
    });

    engine.start(createCandidate({ unitStart: 2, unitEnd: 2 }));
    const midDrag = engine.updatePointer({ unitEnd: 8 });

    assert.false(midDrag.valid);
    assert.true(
      engine.isDragging,
      'an invalid intermediate position does not end the drag',
    );
  });

  test('end() returns null (snap-back) when the final position is invalid', function (assert) {
    const engine = createDragEngine({
      canPlace: (candidate) => candidate.unitEnd <= 5,
    });

    engine.start(createCandidate({ unitStart: 2, unitEnd: 2 }));
    engine.updatePointer({ unitEnd: 8 });
    const result = engine.end();

    assert.strictEqual(result, null);
    assert.false(
      engine.isDragging,
      'the engine still returns to idle even on an invalid end',
    );
  });

  test('cancel() discards the in-progress drag without invoking canPlace', function (assert) {
    let canPlaceCalls = 0;
    const engine = createDragEngine({
      canPlace: () => {
        canPlaceCalls += 1;
        return true;
      },
    });

    engine.start(createCandidate());
    const callsAfterStart = canPlaceCalls;
    engine.cancel();

    assert.false(engine.isDragging);
    assert.strictEqual(engine.current, null);
    assert.strictEqual(
      canPlaceCalls,
      callsAfterStart,
      'cancel() does not call canPlace again',
    );
  });

  test('start() throws if a drag is already in progress', function (assert) {
    const engine = createDragEngine();
    engine.start(createCandidate());

    assert.throws(() => engine.start(createCandidate()), /already in progress/);
  });

  test('updatePointer()/end() throw when called with no drag in progress', function (assert) {
    const engine = createDragEngine();

    assert.throws(
      () => engine.updatePointer({ unitEnd: 4 }),
      /no drag in progress/,
    );
    assert.throws(() => engine.end(), /no drag in progress/);
  });

  test('cancel() is a safe no-op when called while idle', function (assert) {
    const engine = createDragEngine();

    engine.cancel();

    assert.false(engine.isDragging);
  });

  test('the engine can be reused for another drag after end()', function (assert) {
    const engine = createDragEngine();

    engine.start(createCandidate({ blockId: 'b1' }));
    engine.end();

    const result = engine.start(createCandidate({ blockId: 'b2' }));
    assert.strictEqual(result.blockId, 'b2');
  });
});
