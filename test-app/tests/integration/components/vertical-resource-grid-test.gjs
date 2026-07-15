import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, findAll, settled } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';
import VerticalResourceGrid from 'ember-resource-scheduler/components/vertical-resource-grid';
import { createMinuteAxis } from 'ember-resource-scheduler/utils/time-axis';

const UNIT_SIZE = 32;
const LANE_WIDTH = 32;

function buildAxis(unitCount = 20) {
  return createMinuteAxis({
    start: 0,
    end: unitCount * 15,
    unitSize: UNIT_SIZE,
    granularity: 15,
  });
}

class TestState {
  axis = buildAxis();
  @tracked resources = [
    { id: 'r1', label: 'Cabinet 1', laneCount: 1 },
    { id: 'r2', label: 'Cabinet 2', laneCount: 2 },
  ];
  @tracked blocks = [
    {
      id: 'b1',
      resourceId: 'r1',
      lane: 0,
      unitStart: 2,
      unitEnd: 5,
      label: 'Patient',
    },
  ];
  @tracked gestures = [];

  canPlace = (candidate) => {
    return !this.blocks.some(
      (block) =>
        block.id !== candidate.blockId &&
        block.resourceId === candidate.resourceId &&
        block.lane === candidate.lane &&
        candidate.unitStart < block.unitEnd &&
        candidate.unitEnd > block.unitStart,
    );
  };

  onGesture = (result) => {
    this.gestures = [...this.gestures, result];
    if (result.type !== 'create') {
      this.blocks = this.blocks.map((block) =>
        block.id === result.blockId
          ? {
              ...block,
              resourceId: result.resourceId,
              lane: result.lane,
              unitStart: result.unitStart,
              unitEnd: result.unitEnd,
            }
          : block,
      );
    }
  };
}

// Pointer events need real clientX/clientY math; @ember/test-helpers'
// triggerEvent doesn't construct a full PointerEvent, so gestures are
// dispatched directly, mirroring how a real browser drag delivers them.
function firePointer(target, type, { x, y, pointerId = 1 }) {
  const element = typeof target === 'string' ? find(target) : target;
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: x,
    clientY: y,
  });
  element.dispatchEvent(event);
}

async function drag(startTarget, points) {
  firePointer(startTarget, 'pointerdown', points[0]);
  for (const point of points.slice(1)) {
    firePointer(window, 'pointermove', point);
  }
  firePointer(window, 'pointerup', points[points.length - 1]);
  await settled();
}

module('Integration | Component | vertical-resource-grid', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.state = new TestState();
  });

  async function renderGrid(state) {
    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <VerticalResourceGrid
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
          />
        </div>
      </template>,
    );
  }

  test('renders a block positioned by its unitStart/unitEnd via the axis', async function (assert) {
    await renderGrid(this.state);

    const block = find('.rs-vertical-resource-grid__block');
    assert.dom(block).exists();
    assert.dom(block).hasText('Patient');
    assert.strictEqual(block.style.top, `${2 * UNIT_SIZE}px`);
    assert.strictEqual(block.style.height, `${3 * UNIT_SIZE}px`);
  });

  test('a full move sequence updates unitStart/unitEnd/resourceId via onGesture', async function (assert) {
    await renderGrid(this.state);

    const block = find('.rs-vertical-resource-grid__block');
    const rect = block.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 10;

    await drag(block, [
      { x, y: startY },
      { x, y: startY + UNIT_SIZE },
      { x, y: startY + 2 * UNIT_SIZE },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'move');
    assert.strictEqual(result.resourceId, 'r1');
    assert.strictEqual(result.unitStart, 4);
    assert.strictEqual(result.unitEnd, 7);
  });

  test('a full resize-end sequence extends the block without moving unitStart', async function (assert) {
    await renderGrid(this.state);

    const handle = find('.rs-vertical-resource-grid__block-handle--end');
    const rect = handle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 2;

    await drag(handle, [
      { x, y: startY },
      { x, y: startY + UNIT_SIZE },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'resize-end');
    assert.strictEqual(result.unitStart, 2);
    assert.strictEqual(result.unitEnd, 6);
  });

  test('a full resize-start sequence moves unitStart without moving unitEnd', async function (assert) {
    await renderGrid(this.state);

    const handle = find('.rs-vertical-resource-grid__block-handle--start');
    const rect = handle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 2;

    await drag(handle, [
      { x, y: startY },
      { x, y: startY - UNIT_SIZE },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'resize-start');
    assert.strictEqual(result.unitStart, 1);
    assert.strictEqual(result.unitEnd, 5);
  });

  test('a full create sequence on an empty cell reports the dragged range', async function (assert) {
    await renderGrid(this.state);

    // r1 (laneCount 1) is the first rendered resource column; scope the
    // query to it so this doesn't accidentally grab a gap belonging to r2.
    const r1Column = findAll('.rs-vertical-resource-grid__resource-column')[0];
    const cell = r1Column.querySelector(
      '.rs-vertical-resource-grid__empty-cell',
    );
    const rect = cell.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 5 * UNIT_SIZE;

    await drag(cell, [
      { x, y: startY },
      { x, y: startY + 2 * UNIT_SIZE },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'create');
    assert.strictEqual(result.resourceId, 'r1');
    assert.strictEqual(result.lane, 0);
    assert.strictEqual(result.unitEnd - result.unitStart, 3);
  });

  test('an invalid drop (canPlace rejects it) snaps back and does not call onGesture', async function (assert) {
    this.state.blocks = [
      {
        id: 'b1',
        resourceId: 'r1',
        lane: 0,
        unitStart: 2,
        unitEnd: 5,
        label: 'Patient',
      },
      {
        id: 'b2',
        resourceId: 'r1',
        lane: 0,
        unitStart: 10,
        unitEnd: 12,
        label: 'Other',
      },
    ];
    await renderGrid(this.state);

    const block = findAll('.rs-vertical-resource-grid__block').find((el) =>
      el.textContent.includes('Patient'),
    );
    const rect = block.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 10;

    // Drag onto b2's exact span — must be rejected by canPlace.
    const deltaUnits = 10 - 2;
    await drag(block, [
      { x, y: startY },
      { x, y: startY + deltaUnits * UNIT_SIZE },
    ]);

    assert.strictEqual(
      this.state.gestures.length,
      0,
      'onGesture is not called for an invalid drop',
    );
    const rectAfter = block.getBoundingClientRect();
    assert.strictEqual(
      rectAfter.top,
      rect.top,
      'the block snaps back to its original position',
    );
  });

  test('shows the invalid-preview class while hovering an occupied span', async function (assert) {
    this.state.blocks = [
      {
        id: 'b1',
        resourceId: 'r1',
        lane: 0,
        unitStart: 2,
        unitEnd: 5,
        label: 'Patient',
      },
      {
        id: 'b2',
        resourceId: 'r1',
        lane: 0,
        unitStart: 10,
        unitEnd: 12,
        label: 'Other',
      },
    ];
    await renderGrid(this.state);

    const block = findAll('.rs-vertical-resource-grid__block').find((el) =>
      el.textContent.includes('Patient'),
    );
    const rect = block.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 10;

    firePointer(block, 'pointerdown', { x, y: startY });
    firePointer(window, 'pointermove', { x, y: startY + 8 * UNIT_SIZE });
    await settled();

    assert
      .dom('.rs-vertical-resource-grid__overlay')
      .hasClass('rs-vertical-resource-grid__overlay--invalid');

    firePointer(window, 'pointerup', { x, y: startY + 8 * UNIT_SIZE });
    await settled();
  });

  test('Escape cancels an in-progress drag with no onGesture call and no visual change', async function (assert) {
    await renderGrid(this.state);

    const block = find('.rs-vertical-resource-grid__block');
    const rect = block.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = rect.top + 10;

    firePointer(block, 'pointerdown', { x, y: startY });
    firePointer(window, 'pointermove', { x, y: startY + UNIT_SIZE });
    await settled();

    assert
      .dom('.rs-vertical-resource-grid__overlay')
      .exists('a preview is shown mid-drag');

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settled();

    assert
      .dom('.rs-vertical-resource-grid__overlay')
      .doesNotExist('the preview is cleared on cancel');
    assert.strictEqual(
      this.state.gestures.length,
      0,
      'onGesture is not called on cancel',
    );

    const rectAfter = block.getBoundingClientRect();
    assert.strictEqual(rectAfter.top, rect.top, 'the block did not move');
  });

  test('a multi-lane resource renders each lane at a distinct horizontal offset', async function (assert) {
    this.state.blocks = [
      {
        id: 'b1',
        resourceId: 'r2',
        lane: 0,
        unitStart: 1,
        unitEnd: 3,
        label: 'Lane0',
      },
      {
        id: 'b2',
        resourceId: 'r2',
        lane: 1,
        unitStart: 1,
        unitEnd: 3,
        label: 'Lane1',
      },
    ];
    await renderGrid(this.state);

    const lane0Block = findAll('.rs-vertical-resource-grid__block').find((el) =>
      el.textContent.includes('Lane0'),
    );
    const lane1Block = findAll('.rs-vertical-resource-grid__block').find((el) =>
      el.textContent.includes('Lane1'),
    );

    // r2 (laneCount 2) is the second resource column, so its two lanes are
    // the last two `.rs-vertical-resource-grid__lane` elements. Compare
    // against the lane element's own rendered width rather than a
    // hardcoded pixel constant, so this isn't coupled to rendering scale.
    const [lane0, lane1] = findAll('.rs-vertical-resource-grid__lane').slice(
      -2,
    );
    const laneWidth = lane0.getBoundingClientRect().width;

    const left0 = lane0Block.getBoundingClientRect().left;
    const left1 = lane1Block.getBoundingClientRect().left;
    const laneLeft0 = lane0.getBoundingClientRect().left;
    const laneLeft1 = lane1.getBoundingClientRect().left;

    assert.strictEqual(
      laneLeft1 - laneLeft0,
      laneWidth,
      'lane 1 sits exactly one lane-width to the right of lane 0',
    );
    assert.strictEqual(
      left1 - left0,
      laneWidth,
      'the blocks inside each lane are offset by the same amount',
    );
  });

  test('dragging a block into the second lane of a multi-lane resource reports that lane', async function (assert) {
    this.state.resources = [{ id: 'r2', label: 'Cabinet 2', laneCount: 2 }];
    this.state.blocks = [
      {
        id: 'b1',
        resourceId: 'r2',
        lane: 0,
        unitStart: 1,
        unitEnd: 3,
        label: 'Patient',
      },
    ];
    await renderGrid(this.state);

    const block = find('.rs-vertical-resource-grid__block');
    const rect = block.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const y = rect.top + 10;
    const targetX = startX + LANE_WIDTH;

    await drag(block, [
      { x: startX, y },
      { x: targetX, y },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.resourceId, 'r2');
    assert.strictEqual(result.lane, 1);
  });
});
