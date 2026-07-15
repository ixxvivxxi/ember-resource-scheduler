import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import schedulableBlock from '../../modifiers/schedulable-block.js';

export default class VerticalResourceGridBlock extends Component {
  get isDragSource() {
    return this.args.dragPreview?.blockId === this.args.entry.id;
  }

  get style() {
    const { offset, size } = this.args.axis.spanToOffsetAndSize(
      this.args.entry.unitStart,
      this.args.entry.unitEnd,
    );
    return htmlSafe(`top: ${offset}px; height: ${size}px;`);
  }

  <template>
    <div
      class="rs-vertical-resource-grid__block
        {{if this.isDragSource 'rs-vertical-resource-grid__block--drag-source'}}
        {{@entry.colorClass}}"
      style={{this.style}}
      {{schedulableBlock
        @entry
        mode="move"
        axis=@axis
        laneLayout=@laneLayout
        orientation="vertical"
        onStart=@onStartDrag
        onUpdate=@onUpdateDrag
        onEnd=@onEndDrag
        onCancel=@onCancelDrag
      }}
    >
      {{#unless @entry.isReadOnly}}
        <div
          class="rs-vertical-resource-grid__block-handle rs-vertical-resource-grid__block-handle--start"
          {{schedulableBlock
            @entry
            mode="resize-start"
            axis=@axis
            laneLayout=@laneLayout
            orientation="vertical"
            onStart=@onStartDrag
            onUpdate=@onUpdateDrag
            onEnd=@onEndDrag
            onCancel=@onCancelDrag
          }}
        ></div>
      {{/unless}}
      <div class="rs-vertical-resource-grid__block-label">{{@entry.label}}</div>
      {{#unless @entry.isReadOnly}}
        <div
          class="rs-vertical-resource-grid__block-handle rs-vertical-resource-grid__block-handle--end"
          {{schedulableBlock
            @entry
            mode="resize-end"
            axis=@axis
            laneLayout=@laneLayout
            orientation="vertical"
            onStart=@onStartDrag
            onUpdate=@onUpdateDrag
            onEnd=@onEndDrag
            onCancel=@onCancelDrag
          }}
        ></div>
      {{/unless}}
    </div>
  </template>
}
