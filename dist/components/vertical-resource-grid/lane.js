import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { computeGaps } from '../../utils/resource-lanes.js';
import VerticalResourceGridBlock from './block.js';
import VerticalResourceGridEmptyCell from './empty-cell.js';
import VerticalResourceGridOverlay from './overlay.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

function intersects(itemStart, itemEnd, rangeStart, rangeEnd) {
  return itemStart < rangeEnd && itemEnd > rangeStart;
}
class VerticalResourceGridLane extends Component {
  get style() {
    const left = this.args.laneIndex * this.args.laneWidth;
    return htmlSafe(`width: ${this.args.laneWidth}px; left: ${left}px;`);
  }
  get visibleRangeEnd() {
    return this.args.visibleUnitRange.endIndex + 1;
  }
  get visibleBlocks() {
    const {
      startIndex
    } = this.args.visibleUnitRange;
    const rangeEnd = this.visibleRangeEnd;
    return this.args.blocks.filter(block => intersects(block.unitStart, block.unitEnd, startIndex, rangeEnd));
  }
  get gaps() {
    return computeGaps(this.args.blocks, {
      getStart: block => block.unitStart,
      getEnd: block => block.unitEnd,
      compare: (a, b) => a - b,
      rangeStart: 0,
      rangeEnd: this.args.axis.unitCount
    });
  }
  get visibleGaps() {
    const {
      startIndex
    } = this.args.visibleUnitRange;
    const rangeEnd = this.visibleRangeEnd;
    return this.gaps.filter(gap => intersects(gap.start, gap.end, startIndex, rangeEnd));
  }
  get isDragTarget() {
    const preview = this.args.dragPreview;
    return Boolean(preview && preview.resourceId === this.args.resource.id && preview.lane === this.args.laneIndex);
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-vertical-resource-grid__lane\" style={{this.style}}>\n      {{#each this.visibleGaps as |gap|}}\n        <VerticalResourceGridEmptyCell @gap={{gap}} @axis={{@axis}} @resourceId={{@resource.id}} @lane={{@laneIndex}} @onStartDrag={{@onStartDrag}} @onUpdateDrag={{@onUpdateDrag}} @onEndDrag={{@onEndDrag}} @onCancelDrag={{@onCancelDrag}} />\n      {{/each}}\n      {{#each this.visibleBlocks key=\"id\" as |block|}}\n        <VerticalResourceGridBlock @entry={{block}} @axis={{@axis}} @laneLayout={{@laneLayout}} @dragPreview={{@dragPreview}} @onStartDrag={{@onStartDrag}} @onUpdateDrag={{@onUpdateDrag}} @onEndDrag={{@onEndDrag}} @onCancelDrag={{@onCancelDrag}} />\n      {{/each}}\n      {{#if this.isDragTarget}}\n        <VerticalResourceGridOverlay @axis={{@axis}} @preview={{@dragPreview}} />\n      {{/if}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        VerticalResourceGridEmptyCell,
        VerticalResourceGridBlock,
        VerticalResourceGridOverlay
      })
    }), this);
  }
}

export { VerticalResourceGridLane as default };
//# sourceMappingURL=lane.js.map
