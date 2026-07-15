import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

export default class ResourceTimelineOverlay extends Component {
  get style() {
    const { offset, size } = this.args.axis.spanToOffsetAndSize(
      this.args.preview.unitStart,
      this.args.preview.unitEnd,
    );
    return htmlSafe(`left: ${offset}px; width: ${size}px;`);
  }

  <template>
    <div
      class="rs-resource-timeline__overlay
        {{unless @preview.valid 'rs-resource-timeline__overlay--invalid'}}"
      style={{this.style}}
    ></div>
  </template>
}
