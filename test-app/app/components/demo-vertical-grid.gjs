import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import VerticalResourceGrid from 'ember-resource-scheduler/components/vertical-resource-grid';
import { createMinuteAxis } from 'ember-resource-scheduler/utils/time-axis';

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 18 * 60;
const GRANULARITY_MINUTES = 15;

const RESOURCES = [
  { id: 'c1', label: 'Cabinet 101', laneCount: 1 },
  { id: 'c2', label: 'Cabinet 102', sublabel: '2 places', laneCount: 2 },
  { id: 'c3', label: 'Cabinet 103', laneCount: 1 },
];

const INITIAL_BLOCKS = [
  {
    id: 'a1',
    resourceId: 'c1',
    lane: 0,
    unitStart: 4,
    unitEnd: 6,
    label: 'Ivanova',
  },
  {
    id: 'a2',
    resourceId: 'c2',
    lane: 0,
    unitStart: 8,
    unitEnd: 10,
    label: 'Petrov',
  },
  {
    id: 'a3',
    resourceId: 'c2',
    lane: 1,
    unitStart: 9,
    unitEnd: 13,
    label: 'Sidorova',
  },
  {
    id: 'a4',
    resourceId: 'c3',
    lane: 0,
    unitStart: 16,
    unitEnd: 18,
    label: 'Kuznetsov',
  },
  {
    id: 'a5',
    resourceId: 'c1',
    lane: 0,
    unitStart: 0,
    unitEnd: 2,
    label: 'Locked',
    isReadOnly: true,
  },
];

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default class DemoVerticalGrid extends Component {
  axis = createMinuteAxis({
    start: DAY_START_MINUTES,
    end: DAY_END_MINUTES,
    unitSize: 32,
    granularity: GRANULARITY_MINUTES,
  });

  @tracked blocks = INITIAL_BLOCKS;
  @tracked lastGesture = null;

  canPlace = (candidate) => {
    return !this.blocks.some((block) => {
      if (block.id === candidate.blockId) {
        return false;
      }
      if (
        block.resourceId !== candidate.resourceId ||
        block.lane !== candidate.lane
      ) {
        return false;
      }
      return (
        candidate.unitStart < block.unitEnd &&
        candidate.unitEnd > block.unitStart
      );
    });
  };

  handleGesture = (result) => {
    this.lastGesture = result;

    if (result.type === 'create') {
      // A real consumer opens a create form/modal here, prefilled with
      // result.resourceId/lane/unitStart/unitEnd.
      return;
    }

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
  };

  unitLabelFor = (unit) => {
    // Only label hour boundaries (every 4th 15-minute unit) to avoid a
    // cluttered time column — gridlines still render for every unit.
    if (unit % (60 / GRANULARITY_MINUTES) !== 0) {
      return '';
    }
    return formatMinutes(this.axis.valueForUnit(unit));
  };

  <template>
    <div style="height: 480px; width: 500px; border: 1px solid #ccc;">
      <VerticalResourceGrid
        @resources={{RESOURCES}}
        @blocks={{this.blocks}}
        @axis={{this.axis}}
        @canPlace={{this.canPlace}}
        @onGesture={{this.handleGesture}}
        @unitLabelFor={{this.unitLabelFor}}
      />
    </div>
    {{#if this.lastGesture}}
      <pre
        id="last-vertical-gesture"
      >{{this.lastGesture.type}} {{this.lastGesture.blockId}}
        {{this.lastGesture.resourceId}} lane={{this.lastGesture.lane}}
        [{{this.lastGesture.unitStart}}, {{this.lastGesture.unitEnd}})</pre>
    {{/if}}
  </template>
}
