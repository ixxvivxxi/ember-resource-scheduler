import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import ResourceTimeline from 'ember-resource-scheduler/components/resource-timeline';
import { createDayAxis } from 'ember-resource-scheduler/utils/time-axis';

const dateOps = {
  diffInDays(from, to) {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
  },
  addDays(date, n) {
    const result = new Date(date);
    result.setDate(result.getDate() + n);
    return result;
  },
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

const TODAY = startOfToday();

const RESOURCES = [
  { id: 'r1', label: 'Room 101', laneCount: 1 },
  { id: 'r2', label: 'Room 102', sublabel: '2 beds', laneCount: 2 },
  { id: 'r3', label: 'Room 103', laneCount: 1 },
  { id: 'r4', label: 'Room 104', sublabel: '3 beds', laneCount: 3 },
  { id: 'r5', label: 'Room 105', laneCount: 1 },
];

const INITIAL_BLOCKS = [
  {
    id: 'b1',
    resourceId: 'r1',
    lane: 0,
    unitStart: 1,
    unitEnd: 4,
    label: 'Ivanov',
  },
  {
    id: 'b2',
    resourceId: 'r2',
    lane: 0,
    unitStart: 2,
    unitEnd: 6,
    label: 'Petrov',
  },
  {
    id: 'b3',
    resourceId: 'r2',
    lane: 1,
    unitStart: 3,
    unitEnd: 8,
    label: 'Sidorov',
  },
  {
    id: 'b4',
    resourceId: 'r4',
    lane: 1,
    unitStart: 5,
    unitEnd: 10,
    label: 'Kuznetsova',
  },
  {
    id: 'b5',
    resourceId: 'r5',
    lane: 0,
    unitStart: 0,
    unitEnd: 2,
    label: 'Locked',
    isReadOnly: true,
  },
];

export default class DemoTimeline extends Component {
  axis = createDayAxis({
    start: TODAY,
    end: dateOps.addDays(TODAY, 29),
    unitSize: 32,
    dateOps,
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
      // result.resourceId/lane/unitStart/unitEnd, and only adds a Block once
      // the form is submitted.
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
    const date = this.axis.valueForUnit(unit);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  unitClassFor = (unit) => {
    const date = this.axis.valueForUnit(unit);
    const classes = [];
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      classes.push('is-weekend');
    }
    if (dateOps.diffInDays(date, TODAY) === 0) {
      classes.push('is-today');
    }
    return classes.join(' ');
  };

  <template>
    <div style="height: 480px; width: 800px; border: 1px solid #ccc;">
      <ResourceTimeline
        @resources={{RESOURCES}}
        @blocks={{this.blocks}}
        @axis={{this.axis}}
        @canPlace={{this.canPlace}}
        @onGesture={{this.handleGesture}}
        @unitLabelFor={{this.unitLabelFor}}
        @unitClassFor={{this.unitClassFor}}
      />
    </div>
    {{#if this.lastGesture}}
      <pre
        id="last-gesture"
      >{{this.lastGesture.type}} {{this.lastGesture.blockId}}
        {{this.lastGesture.resourceId}} lane={{this.lastGesture.lane}}
        [{{this.lastGesture.unitStart}}, {{this.lastGesture.unitEnd}})</pre>
    {{/if}}
  </template>
}
