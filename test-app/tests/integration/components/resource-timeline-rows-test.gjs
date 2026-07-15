import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, findAll, settled } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';
import ResourceTimeline from 'ember-resource-scheduler/components/resource-timeline';
import { createDayAxis } from 'ember-resource-scheduler/utils/time-axis';

/**
 * The two additions to the row contract:
 *
 * - `Resource.kind: 'summary'` — a row whose cells the consumer draws itself
 *   (an aggregate: free places per day, heat-mapped) instead of lanes of
 *   blocks. It still owns a full-width drop surface, so you can drag a date
 *   range on it.
 * - `@pinnedResources` — the same rows, in a sticky band above the scrolling
 *   body. A block must be draggable *out* of the band and onto a real resource
 *   below it, which is the one thing that needs hit-testing across two
 *   coordinate spaces.
 *
 * Collapsing a group is deliberately not the addon's business: the consumer
 * filters `@resources`. The test for it is that nothing else shifts.
 */

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

class TestState {
  axis = buildAxis();

  // A category (summary) followed by its two rooms — what a collapsible group
  // looks like from the addon's side: it is just an array the consumer builds.
  @tracked resources = [
    { id: 'cat:1', kind: 'summary', label: 'Double (44)', laneCount: 1 },
    { id: 'r1', label: '201', laneCount: 1 },
    { id: 'r2', label: '202', laneCount: 1 },
  ];

  @tracked pinnedResources = [
    { id: 'unassigned', label: 'Unassigned', laneCount: 1 },
  ];

  @tracked blocks = [
    {
      id: 'b1',
      resourceId: 'unassigned',
      lane: 0,
      unitStart: 2,
      unitEnd: 5,
      label: 'Acme Tour',
    },
    {
      id: 'b2',
      resourceId: 'r2',
      lane: 0,
      unitStart: 10,
      unitEnd: 12,
      label: 'Smith',
    },
  ];

  @tracked gestures = [];

  onGesture = (result) => {
    this.gestures = [...this.gestures, result];
  };
}

module(
  'Integration | Component | resource-timeline (summary + pinned rows)',
  function (hooks) {
    setupRenderingTest(hooks);

    // ember-qunit renders the test container at `transform: scale(0.5)`, so a
    // 32px lane measures 16 *client* px. Hit-testing compares a client-space
    // offset (`clientY - rect.top`) against the layout's own pixel sizes — in
    // a real browser those are the same space, under the transform they are
    // not, and a drop lands a row or two off. Everything below is about which
    // row a pointer resolves to, so the transform is turned off rather than
    // compensated for: the test should measure the addon, not the funhouse
    // mirror it is rendered in.
    hooks.beforeEach(function () {
      this.state = new TestState();

      const container = document.getElementById('ember-testing');
      this.containerTransform = container.style.transform;
      container.style.transform = 'none';
    });

    hooks.afterEach(function () {
      document.getElementById('ember-testing').style.transform =
        this.containerTransform;
    });

    async function renderTimeline(state) {
      await render(
        <template>
          <div style="width: 700px; height: 400px;">
            <ResourceTimeline
              @resources={{state.resources}}
              @pinnedResources={{state.pinnedResources}}
              @blocks={{state.blocks}}
              @axis={{state.axis}}
              @laneHeight={{LANE_HEIGHT}}
              @onGesture={{state.onGesture}}
            >
              <:name as |resource|>
                <div data-test-name={{resource.id}}>{{resource.label}}</div>
              </:name>
              <:summaryRow as |summary|>
                <div data-test-summary={{summary.resource.id}}>
                  free
                </div>
              </:summaryRow>
            </ResourceTimeline>
          </div>
        </template>,
      );
    }

    test('a summary row renders the yielded cells and no lanes', async function (assert) {
      await renderTimeline(this.state);

      assert.dom('[data-test-summary="cat:1"]').exists('the consumer draws it');
      assert
        .dom('.rs-resource-timeline__summary-row')
        .exists({ count: 1 }, 'one summary row, and only one');
      assert.strictEqual(
        find('.rs-resource-timeline__summary-row').style.height,
        `${LANE_HEIGHT}px`,
        'height comes from laneCount like any other row',
      );

      // A block is a thing you drag; a number is not. A summary row must not
      // grow lanes, or `computeGaps` would put drop surfaces around each cell.
      const summaryLanes = find(
        '.rs-resource-timeline__summary-row',
      ).querySelectorAll('.rs-resource-timeline__lane');
      assert.strictEqual(summaryLanes.length, 0, 'no lanes inside a summary');
    });

    test('the <:name> block replaces the name cell for every row kind', async function (assert) {
      await renderTimeline(this.state);

      // This is where a collapse chevron hangs — there was no slot for it
      // before, which is the whole reason the block exists.
      assert.dom('[data-test-name="cat:1"]').hasText('Double (44)');
      assert.dom('[data-test-name="r1"]').hasText('201');
      assert
        .dom('[data-test-name="unassigned"]')
        .exists('pinned rows get it too');
      assert
        .dom('.rs-resource-timeline__name-label')
        .doesNotExist('the default label markup is replaced, not doubled');
    });

    test('dragging a date range on a summary row emits a create gesture for it', async function (assert) {
      await renderTimeline(this.state);

      const row = find('.rs-resource-timeline__summary-row');
      const cell = row.querySelector('.rs-resource-timeline__empty-cell');
      assert.dom(cell).exists('the row is one full-width drop surface');

      const rect = row.getBoundingClientRect();
      const y = rect.top + rect.height / 2;
      const startX = rect.left + 3 * UNIT_SIZE + 4;

      await drag(cell, [
        { x: startX, y },
        { x: startX + 2 * UNIT_SIZE, y },
      ]);

      assert.strictEqual(this.state.gestures.length, 1);
      const [result] = this.state.gestures;
      assert.strictEqual(result.type, 'create');
      assert.strictEqual(
        result.resourceId,
        'cat:1',
        'the category, not a room — this is what pre-fills the booking form',
      );
      assert.strictEqual(result.lane, 0);
      assert.strictEqual(result.unitStart, 3);
      assert.strictEqual(result.unitEnd, 6);
      assert.deepEqual(
        result.cells,
        [{ resourceId: 'cat:1', lane: 0 }],
        'a horizontal-only drag stays one cell',
      );
    });

    test('dragging down across room rows reports every covered bed-line as cells', async function (assert) {
      await renderTimeline(this.state);

      // Body rooms render as resource-lanes rows (summary rows are separate):
      // r1 then r2, each a single lane. Grabbing r1 and dragging down into r2
      // must yield both bed-lines — the count is the number of places booked.
      const bodyRows = find('[data-rs-rows-content]').querySelectorAll(
        '.rs-resource-timeline__resource-lanes',
      );
      const r1Row = bodyRows[0];
      const r2Row = bodyRows[1];
      const r1Cell = r1Row.querySelector('.rs-resource-timeline__empty-cell');

      const r1Rect = r1Row.getBoundingClientRect();
      const r2Rect = r2Row.getBoundingClientRect();
      const startX = r1Rect.left + 3 * UNIT_SIZE + 4;

      await drag(r1Cell, [
        { x: startX, y: r1Rect.top + r1Rect.height / 2 },
        { x: startX + 2 * UNIT_SIZE, y: r2Rect.top + r2Rect.height / 2 },
      ]);

      assert.strictEqual(this.state.gestures.length, 1);
      const [result] = this.state.gestures;
      assert.strictEqual(result.type, 'create');
      assert.strictEqual(
        result.resourceId,
        'r1',
        'the anchor stays the start room, for single-row back-compat',
      );
      assert.deepEqual(
        result.cells,
        [
          { resourceId: 'r1', lane: 0 },
          { resourceId: 'r2', lane: 0 },
        ],
        'both covered bed-lines — two places',
      );
      assert.strictEqual(result.unitStart, 3);
      assert.strictEqual(result.unitEnd, 6);
    });

    test('a pinned row renders in the band, outside the scrolling body', async function (assert) {
      await renderTimeline(this.state);

      const band = find('[data-rs-pinned-rows]');
      assert.dom(band).exists();
      assert
        .dom(band.querySelector('.rs-resource-timeline__block'))
        .hasText('Acme Tour', 'its blocks live in the band');
      assert.strictEqual(
        band.querySelectorAll('.rs-resource-timeline__block').length,
        1,
        'only the pinned resource’s blocks',
      );

      const body = find('[data-rs-rows-content]');
      assert.strictEqual(
        body.querySelectorAll('.rs-resource-timeline__block').length,
        1,
        'the body keeps its own',
      );
    });

    test('a block drags OUT of the pinned band onto a resource in the body', async function (assert) {
      await renderTimeline(this.state);

      // The whole point of pinning the "Unassigned" row: source and
      // target are on one plane, so distributing a booking is one gesture.
      const band = find('[data-rs-pinned-rows]');
      const block = band.querySelector('.rs-resource-timeline__block');
      const blockRect = block.getBoundingClientRect();

      // Every y is derived from a real rect: the test container is rendered at
      // 50% scale, so a 32px lane measures 16 client px — arithmetic in
      // *logical* pixels lands a drop one row off (or on a boundary).
      const room = findAll('.rs-resource-timeline__resource-lanes').find(
        (element) => element.closest('[data-rs-rows-content]'),
      );
      const roomRect = room.getBoundingClientRect();

      await drag(block, [
        { x: blockRect.left + 5, y: blockRect.top + blockRect.height / 2 },
        { x: blockRect.left + 5, y: roomRect.top + roomRect.height / 2 },
      ]);

      assert.strictEqual(this.state.gestures.length, 1);
      const [result] = this.state.gestures;
      assert.strictEqual(result.type, 'move');
      assert.strictEqual(result.blockId, 'b1');
      assert.strictEqual(
        result.resourceId,
        'r1',
        'it lands on the real room it was dropped on — this is the whole distribution workflow',
      );
      assert.strictEqual(result.lane, 0);
    });

    test('a block drags from the body back INTO the pinned band', async function (assert) {
      await renderTimeline(this.state);

      const body = find('[data-rs-rows-content]');
      const block = body.querySelector('.rs-resource-timeline__block');
      const blockRect = block.getBoundingClientRect();

      const bandRect = find('[data-rs-pinned-rows]').getBoundingClientRect();

      await drag(block, [
        { x: blockRect.left + 5, y: blockRect.top + blockRect.height / 2 },
        { x: blockRect.left + 5, y: bandRect.top + bandRect.height / 2 },
      ]);

      const [result] = this.state.gestures;
      assert.strictEqual(result.type, 'move');
      assert.strictEqual(result.blockId, 'b2');
      assert.strictEqual(
        result.resourceId,
        'unassigned',
        'un-assigning a guest is the same gesture, backwards',
      );
    });

    test('collapsing a group is just a shorter @resources array', async function (assert) {
      await renderTimeline(this.state);
      assert.dom('[data-test-name="r1"]').exists('expanded: the rooms show');

      this.state.resources = this.state.resources.filter(
        (resource) => resource.kind === 'summary',
      );
      await settled();

      assert.dom('[data-test-name="r1"]').doesNotExist('collapsed');
      assert.dom('[data-test-summary="cat:1"]').exists('the category stays');
      assert
        .dom('[data-test-name="unassigned"]')
        .exists('and the pinned band is untouched by it');
    });

    test('without @pinnedResources there is no band at all', async function (assert) {
      const state = this.state;
      state.pinnedResources = [];

      await render(
        <template>
          <div style="width: 700px; height: 400px;">
            <ResourceTimeline
              @resources={{state.resources}}
              @blocks={{state.blocks}}
              @axis={{state.axis}}
              @onGesture={{state.onGesture}}
            />
          </div>
        </template>,
      );

      assert.dom('[data-rs-pinned-rows]').doesNotExist();
      // …and the default name markup is back, since no <:name> block is given.
      assert.dom('.rs-resource-timeline__name-label').exists();
    });
  },
);
