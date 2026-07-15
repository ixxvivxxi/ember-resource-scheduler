import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import dropSurface from '../../modifiers/drop-surface.js';

export default class ResourceTimelineEmptyCell extends Component {
  get style() {
    const { offset, size } = this.args.axis.spanToOffsetAndSize(
      this.args.gap.start,
      this.args.gap.end,
    );
    return htmlSafe(`left: ${offset}px; width: ${size}px;`);
  }

  get target() {
    return { resourceId: this.args.resourceId, lane: this.args.lane };
  }

  <template>
    <div
      class="rs-resource-timeline__empty-cell"
      style={{this.style}}
      {{dropSurface
        this.target
        axis=@axis
        laneLayout=@laneLayout
        onStart=@onStartDrag
        onUpdate=@onUpdateDrag
        onEnd=@onEndDrag
        onCancel=@onCancelDrag
      }}
    ></div>
  </template>
}
