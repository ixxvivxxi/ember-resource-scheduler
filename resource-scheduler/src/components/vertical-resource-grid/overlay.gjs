import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

export default class VerticalResourceGridOverlay extends Component {
  get style() {
    const { offset, size } = this.args.axis.spanToOffsetAndSize(
      this.args.preview.unitStart,
      this.args.preview.unitEnd,
    );
    return htmlSafe(`top: ${offset}px; height: ${size}px;`);
  }

  <template>
    <div
      class="rs-vertical-resource-grid__overlay
        {{unless @preview.valid 'rs-vertical-resource-grid__overlay--invalid'}}"
      style={{this.style}}
    ></div>
  </template>
}
