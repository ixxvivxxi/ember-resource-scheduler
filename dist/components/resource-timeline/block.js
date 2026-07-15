import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import schedulableBlock from '../../modifiers/schedulable-block.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class ResourceTimelineBlock extends Component {
  get isDragSource() {
    return this.args.dragPreview?.blockId === this.args.entry.id;
  }
  get style() {
    const {
      offset,
      size
    } = this.args.axis.spanToOffsetAndSize(this.args.entry.unitStart, this.args.entry.unitEnd);
    return htmlSafe(`left: ${offset}px; width: ${size}px;`);
  }
  // Optional: a consumer opening a block's own detail view (e.g.
  // double-clicking a booking bar) via `@onBlockActivate`. Domain-agnostic —
  // the addon only reports which `Block` was activated, never navigates
  // itself.
  activateBlock = entry => {
    this.args.onBlockActivate?.(entry);
  };
  static {
    setComponentTemplate(precompileTemplate("\n    {{!-- template-lint-disable no-invalid-interactive --}}\n    {{!-- A block opens its own detail view on dblclick when the consumer asks\n    for it (`@onBlockActivate`) \u2014 it is a draggable bar in a grid, not a\n    control, so it stays a div. --}}\n    <div class=\"rs-resource-timeline__block\n        {{if this.isDragSource \"rs-resource-timeline__block--drag-source\"}}\n        {{@entry.colorClass}}\" style={{this.style}} {{on \"dblclick\" (fn this.activateBlock @entry)}} {{schedulableBlock @entry mode=\"move\" axis=@axis laneLayout=@laneLayout pinnedLaneLayout=@pinnedLaneLayout onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}>\n      {{#unless @entry.isReadOnly}}\n        <div class=\"rs-resource-timeline__block-handle rs-resource-timeline__block-handle--start\" {{schedulableBlock @entry mode=\"resize-start\" axis=@axis laneLayout=@laneLayout onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}></div>\n      {{/unless}}\n      <div class=\"rs-resource-timeline__block-label\">{{@entry.label}}</div>\n      {{#unless @entry.isReadOnly}}\n        <div class=\"rs-resource-timeline__block-handle rs-resource-timeline__block-handle--end\" {{schedulableBlock @entry mode=\"resize-end\" axis=@axis laneLayout=@laneLayout onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}></div>\n      {{/unless}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        on,
        fn,
        schedulableBlock
      })
    }), this);
  }
}

export { ResourceTimelineBlock as default };
//# sourceMappingURL=block.js.map
