import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
  render,
  find,
  findAll,
  settled,
  triggerEvent,
} from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';
import ResourceTimeline from 'ember-resource-scheduler/components/resource-timeline';
import { createDayAxis } from 'ember-resource-scheduler/utils/time-axis';

const UNIT_SIZE = 32;
const LANE_HEIGHT = 32;

const numericDateOps = {
  diffInDays: (from, to) => to - from,
  addDays: (date, n) => date + n,
};

function buildAxis(unitCount = 20) {
  return createDayAxis({
    start: 0,
    end: unitCount - 1,
    unitSize: UNIT_SIZE,
    dateOps: numericDateOps,
  });
}

class TestState {
  axis = buildAxis();
  @tracked resources = [
    { id: 'r1', label: 'Room 1', laneCount: 1 },
    { id: 'r2', label: 'Room 2', laneCount: 2 },
  ];
  @tracked blocks = [
    {
      id: 'b1',
      resourceId: 'r1',
      lane: 0,
      unitStart: 2,
      unitEnd: 5,
      label: 'Guest',
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

module('Integration | Component | resource-timeline', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.state = new TestState();
  });

  async function renderTimeline(state) {
    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
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
    await renderTimeline(this.state);

    const block = find('.rs-resource-timeline__block');
    assert.dom(block).exists();
    assert.dom(block).hasText('Guest');
    assert.strictEqual(block.style.left, `${2 * UNIT_SIZE}px`);
    assert.strictEqual(block.style.width, `${3 * UNIT_SIZE}px`);
  });

  test('a full move sequence updates unitStart/unitEnd/resourceId via onGesture', async function (assert) {
    await renderTimeline(this.state);

    const block = find('.rs-resource-timeline__block');
    const rect = block.getBoundingClientRect();
    const startX = rect.left + 10;
    const y = rect.top + rect.height / 2;

    await drag(block, [
      { x: startX, y },
      { x: startX + UNIT_SIZE, y },
      { x: startX + 2 * UNIT_SIZE, y },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'move');
    assert.strictEqual(result.resourceId, 'r1');
    assert.strictEqual(result.unitStart, 4);
    assert.strictEqual(result.unitEnd, 7);
  });

  test('a full resize-end sequence extends the block without moving unitStart', async function (assert) {
    await renderTimeline(this.state);

    const handle = find('.rs-resource-timeline__block-handle--end');
    const rect = handle.getBoundingClientRect();
    const startX = rect.left + 2;
    const y = rect.top + rect.height / 2;

    await drag(handle, [
      { x: startX, y },
      { x: startX + UNIT_SIZE, y },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'resize-end');
    assert.strictEqual(result.unitStart, 2);
    assert.strictEqual(result.unitEnd, 6);
  });

  test('a full resize-start sequence moves unitStart without moving unitEnd', async function (assert) {
    await renderTimeline(this.state);

    const handle = find('.rs-resource-timeline__block-handle--start');
    const rect = handle.getBoundingClientRect();
    const startX = rect.left + 2;
    const y = rect.top + rect.height / 2;

    await drag(handle, [
      { x: startX, y },
      { x: startX - UNIT_SIZE, y },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.type, 'resize-start');
    assert.strictEqual(result.unitStart, 1);
    assert.strictEqual(result.unitEnd, 5);
  });

  test('a full create sequence on an empty cell reports the dragged range', async function (assert) {
    await renderTimeline(this.state);

    // r1 (laneCount 1) is the first rendered resource row; scope the query
    // to it so this doesn't accidentally grab a gap belonging to r2.
    const r1Row = findAll('.rs-resource-timeline__resource-lanes')[0];
    const cell = r1Row.querySelector('.rs-resource-timeline__empty-cell');
    const rect = cell.getBoundingClientRect();
    const startX = rect.left + 5 * UNIT_SIZE;
    const y = rect.top + rect.height / 2;

    await drag(cell, [
      { x: startX, y },
      { x: startX + 2 * UNIT_SIZE, y },
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
        label: 'Guest',
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
    await renderTimeline(this.state);

    const block = findAll('.rs-resource-timeline__block').find((el) =>
      el.textContent.includes('Guest'),
    );
    const rect = block.getBoundingClientRect();
    const startX = rect.left + 10;
    const y = rect.top + rect.height / 2;

    // Drag onto b2's exact span — must be rejected by canPlace.
    const deltaUnits = 10 - 2;
    await drag(block, [
      { x: startX, y },
      { x: startX + deltaUnits * UNIT_SIZE, y },
    ]);

    assert.strictEqual(
      this.state.gestures.length,
      0,
      'onGesture is not called for an invalid drop',
    );
    const rectAfter = block.getBoundingClientRect();
    assert.strictEqual(
      rectAfter.left,
      rect.left,
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
        label: 'Guest',
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
    await renderTimeline(this.state);

    const block = findAll('.rs-resource-timeline__block').find((el) =>
      el.textContent.includes('Guest'),
    );
    const rect = block.getBoundingClientRect();
    const startX = rect.left + 10;
    const y = rect.top + rect.height / 2;

    firePointer(block, 'pointerdown', { x: startX, y });
    firePointer(window, 'pointermove', { x: startX + 8 * UNIT_SIZE, y });
    await settled();

    assert
      .dom('.rs-resource-timeline__overlay')
      .hasClass('rs-resource-timeline__overlay--invalid');

    firePointer(window, 'pointerup', { x: startX + 8 * UNIT_SIZE, y });
    await settled();
  });

  test('Escape cancels an in-progress drag with no onGesture call and no visual change', async function (assert) {
    await renderTimeline(this.state);

    const block = find('.rs-resource-timeline__block');
    const rect = block.getBoundingClientRect();
    const startX = rect.left + 10;
    const y = rect.top + rect.height / 2;

    firePointer(block, 'pointerdown', { x: startX, y });
    firePointer(window, 'pointermove', { x: startX + UNIT_SIZE, y });
    await settled();

    assert
      .dom('.rs-resource-timeline__overlay')
      .exists('a preview is shown mid-drag');

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settled();

    assert
      .dom('.rs-resource-timeline__overlay')
      .doesNotExist('the preview is cleared on cancel');
    assert.strictEqual(
      this.state.gestures.length,
      0,
      'onGesture is not called on cancel',
    );

    const rectAfter = block.getBoundingClientRect();
    assert.strictEqual(rectAfter.left, rect.left, 'the block did not move');
  });

  test('a multi-lane resource renders each lane at a distinct vertical offset', async function (assert) {
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
    await renderTimeline(this.state);

    const lane0Block = findAll('.rs-resource-timeline__block').find((el) =>
      el.textContent.includes('Lane0'),
    );
    const lane1Block = findAll('.rs-resource-timeline__block').find((el) =>
      el.textContent.includes('Lane1'),
    );

    // r2 (laneCount 2) is the second resource row, so its two lanes are the
    // last two `.rs-resource-timeline__lane` elements. Compare against the
    // lane element's own rendered height rather than a hardcoded pixel
    // constant, so this isn't coupled to the environment's rendering scale.
    const [lane0, lane1] = findAll('.rs-resource-timeline__lane').slice(-2);
    const laneHeight = lane0.getBoundingClientRect().height;

    const top0 = lane0Block.getBoundingClientRect().top;
    const top1 = lane1Block.getBoundingClientRect().top;
    const laneTop0 = lane0.getBoundingClientRect().top;
    const laneTop1 = lane1.getBoundingClientRect().top;

    assert.strictEqual(
      laneTop1 - laneTop0,
      laneHeight,
      'lane 1 sits exactly one lane-height below lane 0',
    );
    assert.strictEqual(
      top1 - top0,
      laneHeight,
      'the blocks inside each lane are offset by the same amount',
    );
  });

  test('dragging a block into the second lane of a multi-lane resource reports that lane', async function (assert) {
    this.state.resources = [{ id: 'r2', label: 'Room 2', laneCount: 2 }];
    this.state.blocks = [
      {
        id: 'b1',
        resourceId: 'r2',
        lane: 0,
        unitStart: 1,
        unitEnd: 3,
        label: 'Guest',
      },
    ];
    await renderTimeline(this.state);

    const block = find('.rs-resource-timeline__block');
    const rect = block.getBoundingClientRect();
    const startX = rect.left + 10;
    const startY = rect.top + rect.height / 2;
    const targetY = startY + LANE_HEIGHT;

    await drag(block, [
      { x: startX, y: startY },
      { x: startX, y: targetY },
    ]);

    assert.strictEqual(this.state.gestures.length, 1);
    const [result] = this.state.gestures;
    assert.strictEqual(result.resourceId, 'r2');
    assert.strictEqual(result.lane, 1);
  });

  test('@laneLabelFor renders a sticky place-column with one label per lane', async function (assert) {
    this.state.resources = [
      { id: 'r1', label: 'Room 1', laneCount: 1 },
      { id: 'r2', label: 'Room 2', laneCount: 2 },
    ];
    const state = this.state;
    const laneLabelFor = (resource, laneIndex) => `${resource.id}-${laneIndex}`;

    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
            @laneLabelFor={{laneLabelFor}}
          />
        </div>
      </template>,
    );

    assert.dom('.rs-resource-timeline__place-column').exists();
    const cells = findAll('.rs-resource-timeline__place-cell');
    assert.strictEqual(cells.length, 3, 'one cell per lane (1 + 2)');
    assert.dom(cells[0]).hasText('r1-0');
    assert.dom(cells[1]).hasText('r2-0');
    assert.dom(cells[2]).hasText('r2-1');
  });

  test('omitting @laneLabelFor renders no place-column', async function (assert) {
    await renderTimeline(this.state);

    assert.dom('.rs-resource-timeline__place-column').doesNotExist();
  });

  test('@extraHeaderHeight + named blocks render a second sticky header row', async function (assert) {
    const state = this.state;
    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
            @extraHeaderHeight={{20}}
          >
            <:headerExtraCorner>corner</:headerExtraCorner>
            <:headerExtraRow as |ctx|>
              <span
                data-test-extra-cell
              >{{ctx.visibleColumnRange.startIndex}}</span>
            </:headerExtraRow>
          </ResourceTimeline>
        </div>
      </template>,
    );

    assert.dom('.rs-resource-timeline__corner-extra').hasText('corner');
    assert.dom('[data-test-extra-cell]').exists();

    const dateHeader = find('.rs-resource-timeline__header-row');
    const extraRow = find('.rs-resource-timeline__header-extra-row');
    assert.strictEqual(
      extraRow.getBoundingClientRect().top,
      dateHeader.getBoundingClientRect().bottom,
      'the extra row sits directly below the date header row',
    );
  });

  test('omitting @extraHeaderHeight renders no extra header row even if blocks are passed', async function (assert) {
    const state = this.state;
    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
          >
            <:headerExtraCorner>corner</:headerExtraCorner>
            <:headerExtraRow as |ctx|>
              <span
                data-test-extra-cell
              >{{ctx.visibleColumnRange.startIndex}}</span>
            </:headerExtraRow>
          </ResourceTimeline>
        </div>
      </template>,
    );

    assert.dom('.rs-resource-timeline__corner-extra').doesNotExist();
    assert.dom('.rs-resource-timeline__header-extra-row').doesNotExist();
  });

  test('--rs-day-shading is layered behind the gridline pattern on every lane', async function (assert) {
    const state = this.state;
    // The addon's own theming stylesheet declares `--rs-day-shading: none`
    // directly on `.rs-resource-timeline` (its default) — a *specified*
    // value on that exact element, which always wins over whatever an
    // ancestor's inline style would otherwise inherit down. A consumer must
    // therefore set the override on the `<ResourceTimeline>` invocation
    // itself (forwarded to its root element via `...attributes`), not on a
    // wrapper div around it.
    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
            style="--rs-day-shading: linear-gradient(to right, red 0px, red 32px);"
          />
        </div>
      </template>,
    );

    const lane = find('.rs-resource-timeline__lane');
    const backgroundImage = getComputedStyle(lane).backgroundImage;
    assert.true(
      backgroundImage.includes('linear-gradient'),
      'the built-in gridline gradient is present',
    );
    assert.strictEqual(
      backgroundImage.split('gradient(').length - 1,
      2,
      'the consumer-set day-shading gradient is layered on top of it',
    );
  });

  test('@onResourceActivate fires with the resource on a name-cell dblclick', async function (assert) {
    const state = this.state;
    let activated = null;
    const onResourceActivate = (resource) => (activated = resource);

    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
            @onResourceActivate={{onResourceActivate}}
          />
        </div>
      </template>,
    );

    const nameCell = find('.rs-resource-timeline__name-cell');
    assert
      .dom(nameCell)
      .hasClass('rs-resource-timeline__name-cell--activatable');

    await triggerEvent(nameCell, 'dblclick');

    assert.strictEqual(activated, this.state.resources[0]);
  });

  test('omitting @onResourceActivate renders no activatable affordance and dblclick is a no-op', async function (assert) {
    await renderTimeline(this.state);

    const nameCell = find('.rs-resource-timeline__name-cell');
    assert
      .dom(nameCell)
      .doesNotHaveClass('rs-resource-timeline__name-cell--activatable');

    await triggerEvent(nameCell, 'dblclick');
    assert.ok(true, 'dblclick with no handler does not throw');
  });

  test('@onBlockActivate fires with the block entry on a block dblclick', async function (assert) {
    const state = this.state;
    let activated = null;
    const onBlockActivate = (entry) => (activated = entry);

    await render(
      <template>
        <div style="width: 700px; height: 300px;">
          <ResourceTimeline
            @resources={{state.resources}}
            @blocks={{state.blocks}}
            @axis={{state.axis}}
            @canPlace={{state.canPlace}}
            @onGesture={{state.onGesture}}
            @onBlockActivate={{onBlockActivate}}
          />
        </div>
      </template>,
    );

    const block = find('.rs-resource-timeline__block');

    await triggerEvent(block, 'dblclick');

    assert.strictEqual(activated, this.state.blocks[0]);
  });

  test('omitting @onBlockActivate leaves block dblclick a no-op', async function (assert) {
    await renderTimeline(this.state);

    const block = find('.rs-resource-timeline__block');

    await triggerEvent(block, 'dblclick');
    assert.ok(true, 'dblclick with no handler does not throw');
  });
});
