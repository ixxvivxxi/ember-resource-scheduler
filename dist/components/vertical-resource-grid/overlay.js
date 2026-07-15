import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class VerticalResourceGridOverlay extends Component {
  get style() {
    const {
      offset,
      size
    } = this.args.axis.spanToOffsetAndSize(this.args.preview.unitStart, this.args.preview.unitEnd);
    return htmlSafe(`top: ${offset}px; height: ${size}px;`);
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-vertical-resource-grid__overlay\n        {{unless @preview.valid \"rs-vertical-resource-grid__overlay--invalid\"}}\" style={{this.style}}></div>\n  ", {
      strictMode: true
    }), this);
  }
}

export { VerticalResourceGridOverlay as default };
//# sourceMappingURL=overlay.js.map
