import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import VerticalResourceGridLane from './lane.gjs';

export default class VerticalResourceGridResourceColumn extends Component {
  get style() {
    return htmlSafe(`width: ${this.args.width}px;`);
  }

  get laneCount() {
    return Math.max(1, this.args.resource.laneCount ?? 1);
  }

  get lanes() {
    const blocks = this.args.blocks;
    return Array.from({ length: this.laneCount }, (_, laneIndex) => ({
      laneIndex,
      blocks: blocks.filter((block) => block.lane === laneIndex),
    }));
  }

  <template>
    <div
      class="rs-vertical-resource-grid__resource-column"
      style={{this.style}}
    >
      {{#each this.lanes key="laneIndex" as |lane|}}
        <VerticalResourceGridLane
          @resource={{@resource}}
          @laneIndex={{lane.laneIndex}}
          @laneWidth={{@laneWidth}}
          @blocks={{lane.blocks}}
          @axis={{@axis}}
          @laneLayout={{@laneLayout}}
          @visibleUnitRange={{@visibleUnitRange}}
          @dragPreview={{@dragPreview}}
          @onStartDrag={{@onStartDrag}}
          @onUpdateDrag={{@onUpdateDrag}}
          @onEndDrag={{@onEndDrag}}
          @onCancelDrag={{@onCancelDrag}}
        />
      {{/each}}
    </div>
  </template>
}
