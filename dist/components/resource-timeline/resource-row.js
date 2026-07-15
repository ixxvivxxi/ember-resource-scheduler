import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import ResourceTimelineLane from './lane.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class ResourceTimelineResourceRow extends Component {
  get style() {
    return htmlSafe(`height: ${this.args.height}px;`);
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
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-resource-timeline__resource-lanes\" style={{this.style}}>\n      {{#each this.lanes key=\"laneIndex\" as |lane|}}\n        <ResourceTimelineLane @resource={{@resource}} @laneIndex={{lane.laneIndex}} @laneHeight={{@laneHeight}} @blocks={{lane.blocks}} @axis={{@axis}} @laneLayout={{@laneLayout}} @pinnedLaneLayout={{@pinnedLaneLayout}} @visibleColumnRange={{@visibleColumnRange}} @dragPreview={{@dragPreview}} @onStartDrag={{@onStartDrag}} @onUpdateDrag={{@onUpdateDrag}} @onEndDrag={{@onEndDrag}} @onCancelDrag={{@onCancelDrag}} @onBlockActivate={{@onBlockActivate}} />\n      {{/each}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        ResourceTimelineLane
      })
    }), this);
  }
}

export { ResourceTimelineResourceRow as default };
//# sourceMappingURL=resource-row.js.map
