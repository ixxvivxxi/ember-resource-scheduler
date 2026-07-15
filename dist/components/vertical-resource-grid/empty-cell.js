import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import dropSurface from '../../modifiers/drop-surface.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class VerticalResourceGridEmptyCell extends Component {
  get style() {
    const {
      offset,
      size
    } = this.args.axis.spanToOffsetAndSize(this.args.gap.start, this.args.gap.end);
    return htmlSafe(`top: ${offset}px; height: ${size}px;`);
  }
  get target() {
    return {
      resourceId: this.args.resourceId,
      lane: this.args.lane
    };
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-vertical-resource-grid__empty-cell\" style={{this.style}} {{dropSurface this.target axis=@axis orientation=\"vertical\" onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}></div>\n  ", {
      strictMode: true,
      scope: () => ({
        dropSurface
      })
    }), this);
  }
}

export { VerticalResourceGridEmptyCell as default };
//# sourceMappingURL=empty-cell.js.map
