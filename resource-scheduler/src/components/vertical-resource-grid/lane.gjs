import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { computeGaps } from '../../utils/resource-lanes.js';
import VerticalResourceGridBlock from './block.gjs';
import VerticalResourceGridEmptyCell from './empty-cell.gjs';
import VerticalResourceGridOverlay from './overlay.gjs';

function intersects(itemStart, itemEnd, rangeStart, rangeEnd) {
  return itemStart < rangeEnd && itemEnd > rangeStart;
}

export default class VerticalResourceGridLane extends Component {
  get style() {
    const left = this.args.laneIndex * this.args.laneWidth;
    return htmlSafe(`width: ${this.args.laneWidth}px; left: ${left}px;`);
  }

  get visibleRangeEnd() {
    return this.args.visibleUnitRange.endIndex + 1;
  }

  get visibleBlocks() {
    const { startIndex } = this.args.visibleUnitRange;
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
    const { startIndex } = this.args.visibleUnitRange;
    const rangeEnd = this.visibleRangeEnd;
    return this.gaps.filter((gap) =>
      intersects(gap.start, gap.end, startIndex, rangeEnd),
    );
  }

  get isDragTarget() {
    const preview = this.args.dragPreview;
    return Boolean(
      preview &&
      preview.resourceId === this.args.resource.id &&
      preview.lane === this.args.laneIndex,
    );
  }

  <template>
    <div class="rs-vertical-resource-grid__lane" style={{this.style}}>
      {{#each this.visibleGaps as |gap|}}
        <VerticalResourceGridEmptyCell
          @gap={{gap}}
          @axis={{@axis}}
          @resourceId={{@resource.id}}
          @lane={{@laneIndex}}
          @onStartDrag={{@onStartDrag}}
          @onUpdateDrag={{@onUpdateDrag}}
          @onEndDrag={{@onEndDrag}}
          @onCancelDrag={{@onCancelDrag}}
        />
      {{/each}}
      {{#each this.visibleBlocks key="id" as |block|}}
        <VerticalResourceGridBlock
          @entry={{block}}
          @axis={{@axis}}
          @laneLayout={{@laneLayout}}
          @dragPreview={{@dragPreview}}
          @onStartDrag={{@onStartDrag}}
          @onUpdateDrag={{@onUpdateDrag}}
          @onEndDrag={{@onEndDrag}}
          @onCancelDrag={{@onCancelDrag}}
        />
      {{/each}}
      {{#if this.isDragTarget}}
        <VerticalResourceGridOverlay
          @axis={{@axis}}
          @preview={{@dragPreview}}
        />
      {{/if}}
    </div>
  </template>
}
