import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { computeGaps } from '../../utils/resource-lanes.js';
import ResourceTimelineBlock from './block.gjs';
import ResourceTimelineEmptyCell from './empty-cell.gjs';
import ResourceTimelineOverlay from './overlay.gjs';

function intersects(itemStart, itemEnd, rangeStart, rangeEnd) {
  return itemStart < rangeEnd && itemEnd > rangeStart;
}

export default class ResourceTimelineLane extends Component {
  get style() {
    const top = this.args.laneIndex * this.args.laneHeight;
    return htmlSafe(`height: ${this.args.laneHeight}px; top: ${top}px;`);
  }

  get visibleRangeEnd() {
    return this.args.visibleColumnRange.endIndex + 1;
  }

  get visibleBlocks() {
    const { startIndex } = this.args.visibleColumnRange;
    const rangeEnd = this.visibleRangeEnd;
    return this.args.blocks.filter((block) =>
      intersects(block.unitStart, block.unitEnd, startIndex, rangeEnd),
    );
  }

  get gaps() {
    return computeGaps(this.args.blocks, {
      getStart: (block) => block.unitStart,
      getEnd: (block) => block.unitEnd,
      compare: (a, b) => a - b,
      rangeStart: 0,
      rangeEnd: this.args.axis.unitCount,
    });
  }

  get visibleGaps() {
    const { startIndex } = this.args.visibleColumnRange;
    const rangeEnd = this.visibleRangeEnd;
    return this.gaps.filter((gap) =>
      intersects(gap.start, gap.end, startIndex, rangeEnd),
    );
  }

  get isDragTarget() {
    const preview = this.args.dragPreview;
    if (!preview) {
      return false;
    }
    // A create gesture reports every covered lane cell in `cells`; the
    // selection band is the union of the per-lane overlay across them. Other
    // gestures (move/resize) carry no `cells`, so fall back to the anchor cell.
    if (preview.cells) {
      return preview.cells.some(
        (cell) =>
          cell.resourceId === this.args.resource.id &&
          cell.lane === this.args.laneIndex,
      );
    }
    return (
      preview.resourceId === this.args.resource.id &&
      preview.lane === this.args.laneIndex
    );
  }

  <template>
    <div class="rs-resource-timeline__lane" style={{this.style}}>
      {{#each this.visibleGaps as |gap|}}
        <ResourceTimelineEmptyCell
          @gap={{gap}}
          @axis={{@axis}}
          @laneLayout={{@laneLayout}}
          @resourceId={{@resource.id}}
          @lane={{@laneIndex}}
          @onStartDrag={{@onStartDrag}}
          @onUpdateDrag={{@onUpdateDrag}}
          @onEndDrag={{@onEndDrag}}
          @onCancelDrag={{@onCancelDrag}}
        />
      {{/each}}
      {{#each this.visibleBlocks key="id" as |block|}}
        <ResourceTimelineBlock
          @entry={{block}}
          @axis={{@axis}}
          @laneLayout={{@laneLayout}}
          @pinnedLaneLayout={{@pinnedLaneLayout}}
          @dragPreview={{@dragPreview}}
          @onStartDrag={{@onStartDrag}}
          @onUpdateDrag={{@onUpdateDrag}}
          @onEndDrag={{@onEndDrag}}
          @onCancelDrag={{@onCancelDrag}}
          @onBlockActivate={{@onBlockActivate}}
        />
      {{/each}}
      {{#if this.isDragTarget}}
        <ResourceTimelineOverlay @axis={{@axis}} @preview={{@dragPreview}} />
      {{/if}}
    </div>
  </template>
}
