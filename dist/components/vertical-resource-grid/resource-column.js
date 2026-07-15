import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import VerticalResourceGridLane from './lane.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class VerticalResourceGridResourceColumn extends Component {
  get style() {
    return htmlSafe(`width: ${this.args.width}px;`);
  }
  get laneCount() {
    return Math.max(1, this.args.resource.laneCount ?? 1);
  }
  get lanes() {
    const blocks = this.args.blocks;
    return Array.from({
      length: this.laneCount
    }, (_, laneIndex) => ({
      laneIndex,
      blocks: blocks.filter(block => block.lane === laneIndex)
    }));
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-vertical-resource-grid__resource-column\" style={{this.style}}>\n      {{#each this.lanes key=\"laneIndex\" as |lane|}}\n        <VerticalResourceGridLane @resource={{@resource}} @laneIndex={{lane.laneIndex}} @laneWidth={{@laneWidth}} @blocks={{lane.blocks}} @axis={{@axis}} @laneLayout={{@laneLayout}} @visibleUnitRange={{@visibleUnitRange}} @dragPreview={{@dragPreview}} @onStartDrag={{@onStartDrag}} @onUpdateDrag={{@onUpdateDrag}} @onEndDrag={{@onEndDrag}} @onCancelDrag={{@onCancelDrag}} />\n      {{/each}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        VerticalResourceGridLane
      })
    }), this);
  }
}

export { VerticalResourceGridResourceColumn as default };
//# sourceMappingURL=resource-column.js.map
