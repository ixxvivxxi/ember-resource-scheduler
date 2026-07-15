import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import dropSurface from '../../modifiers/drop-surface.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class ResourceTimelineEmptyCell extends Component {
  get style() {
    const {
      offset,
      size
    } = this.args.axis.spanToOffsetAndSize(this.args.gap.start, this.args.gap.end);
    return htmlSafe(`left: ${offset}px; width: ${size}px;`);
  }
  get target() {
    return {
      resourceId: this.args.resourceId,
      lane: this.args.lane
    };
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-resource-timeline__empty-cell\" style={{this.style}} {{dropSurface this.target axis=@axis laneLayout=@laneLayout onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}></div>\n  ", {
      strictMode: true,
      scope: () => ({
        dropSurface
      })
    }), this);
  }
}

export { ResourceTimelineEmptyCell as default };
//# sourceMappingURL=empty-cell.js.map
