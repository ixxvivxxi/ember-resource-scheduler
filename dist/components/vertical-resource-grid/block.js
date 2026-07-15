import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import schedulableBlock from '../../modifiers/schedulable-block.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class VerticalResourceGridBlock extends Component {
  get isDragSource() {
    return this.args.dragPreview?.blockId === this.args.entry.id;
  }
  get style() {
    const {
      offset,
      size
    } = this.args.axis.spanToOffsetAndSize(this.args.entry.unitStart, this.args.entry.unitEnd);
    return htmlSafe(`top: ${offset}px; height: ${size}px;`);
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-vertical-resource-grid__block\n        {{if this.isDragSource \"rs-vertical-resource-grid__block--drag-source\"}}\n        {{@entry.colorClass}}\" style={{this.style}} {{schedulableBlock @entry mode=\"move\" axis=@axis laneLayout=@laneLayout orientation=\"vertical\" onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}>\n      {{#unless @entry.isReadOnly}}\n        <div class=\"rs-vertical-resource-grid__block-handle rs-vertical-resource-grid__block-handle--start\" {{schedulableBlock @entry mode=\"resize-start\" axis=@axis laneLayout=@laneLayout orientation=\"vertical\" onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}></div>\n      {{/unless}}\n      <div class=\"rs-vertical-resource-grid__block-label\">{{@entry.label}}</div>\n      {{#unless @entry.isReadOnly}}\n        <div class=\"rs-vertical-resource-grid__block-handle rs-vertical-resource-grid__block-handle--end\" {{schedulableBlock @entry mode=\"resize-end\" axis=@axis laneLayout=@laneLayout orientation=\"vertical\" onStart=@onStartDrag onUpdate=@onUpdateDrag onEnd=@onEndDrag onCancel=@onCancelDrag}}></div>\n      {{/unless}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        schedulableBlock
      })
    }), this);
  }
}

export { VerticalResourceGridBlock as default };
//# sourceMappingURL=block.js.map
