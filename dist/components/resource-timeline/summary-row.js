import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import ResourceTimelineEmptyCell from './empty-cell.js';
import ResourceTimelineOverlay from './overlay.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class ResourceTimelineSummaryRow extends Component {
  get style() {
    return htmlSafe(`height: ${this.args.height}px;`);
  }
  get fullSpan() {
    return {
      start: 0,
      end: this.args.axis.unitCount
    };
  }
  get isDragTarget() {
    const preview = this.args.dragPreview;
    return Boolean(preview && preview.resourceId === this.args.resource.id);
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-resource-timeline__summary-row\" style={{this.style}}>\n      <ResourceTimelineEmptyCell @gap={{this.fullSpan}} @axis={{@axis}} @resourceId={{@resource.id}} @lane={{0}} @onStartDrag={{@onStartDrag}} @onUpdateDrag={{@onUpdateDrag}} @onEndDrag={{@onEndDrag}} @onCancelDrag={{@onCancelDrag}} />\n      <div class=\"rs-resource-timeline__summary-content\">\n        {{yield}}\n      </div>\n      {{#if this.isDragTarget}}\n        <ResourceTimelineOverlay @axis={{@axis}} @preview={{@dragPreview}} />\n      {{/if}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        ResourceTimelineEmptyCell,
        ResourceTimelineOverlay
      })
    }), this);
  }
}

export { ResourceTimelineSummaryRow as default };
//# sourceMappingURL=summary-row.js.map
