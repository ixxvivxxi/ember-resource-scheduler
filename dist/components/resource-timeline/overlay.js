import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class ResourceTimelineOverlay extends Component {
  get style() {
    const {
      offset,
      size
    } = this.args.axis.spanToOffsetAndSize(this.args.preview.unitStart, this.args.preview.unitEnd);
    return htmlSafe(`left: ${offset}px; width: ${size}px;`);
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-resource-timeline__overlay\n        {{unless @preview.valid \"rs-resource-timeline__overlay--invalid\"}}\" style={{this.style}}></div>\n  ", {
      strictMode: true
    }), this);
  }
}

export { ResourceTimelineOverlay as default };
//# sourceMappingURL=overlay.js.map
