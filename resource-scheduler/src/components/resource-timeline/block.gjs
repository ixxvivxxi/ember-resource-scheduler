import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import schedulableBlock from '../../modifiers/schedulable-block.js';

export default class ResourceTimelineBlock extends Component {
  get isDragSource() {
    return this.args.dragPreview?.blockId === this.args.entry.id;
  }

  get style() {
    const { offset, size } = this.args.axis.spanToOffsetAndSize(
      this.args.entry.unitStart,
      this.args.entry.unitEnd,
    );
    return htmlSafe(`left: ${offset}px; width: ${size}px;`);
  }

  // Optional: a consumer opening a block's own detail view (e.g.
  // double-clicking a booking bar) via `@onBlockActivate`. Domain-agnostic —
  // the addon only reports which `Block` was activated, never navigates
  // itself.
  activateBlock = (entry) => {
    this.args.onBlockActivate?.(entry);
  };

  <template>
    {{! template-lint-disable no-invalid-interactive }}
    {{! A block opens its own detail view on dblclick when the consumer asks
    for it (`@onBlockActivate`) — it is a draggable bar in a grid, not a
    control, so it stays a div. }}
    <div
      class="rs-resource-timeline__block
        {{if this.isDragSource 'rs-resource-timeline__block--drag-source'}}
        {{@entry.colorClass}}"
      style={{this.style}}
      {{on "dblclick" (fn this.activateBlock @entry)}}
      {{schedulableBlock
        @entry
        mode="move"
        axis=@axis
        laneLayout=@laneLayout
        pinnedLaneLayout=@pinnedLaneLayout
        onStart=@onStartDrag
        onUpdate=@onUpdateDrag
        onEnd=@onEndDrag
        onCancel=@onCancelDrag
      }}
    >
      {{#unless @entry.isReadOnly}}
        <div
          class="rs-resource-timeline__block-handle rs-resource-timeline__block-handle--start"
          {{schedulableBlock
            @entry
            mode="resize-start"
            axis=@axis
            laneLayout=@laneLayout
            onStart=@onStartDrag
            onUpdate=@onUpdateDrag
            onEnd=@onEndDrag
            onCancel=@onCancelDrag
          }}
        ></div>
      {{/unless}}
      <div class="rs-resource-timeline__block-label">{{@entry.label}}</div>
      {{#unless @entry.isReadOnly}}
        <div
          class="rs-resource-timeline__block-handle rs-resource-timeline__block-handle--end"
          {{schedulableBlock
            @entry
            mode="resize-end"
            axis=@axis
            laneLayout=@laneLayout
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
