import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class ResourceTimelineHeader extends Component {
  get style() {
    return htmlSafe(`height: ${this.args.headerHeight}px;`);
  }
  get visibleUnits() {
    const {
      startIndex,
      endIndex
    } = this.args.visibleColumnRange;
    const axis = this.args.axis;
    const unitLabelFor = this.args.unitLabelFor;
    const unitClassFor = this.args.unitClassFor;
    const units = [];
    for (let unit = startIndex; unit <= endIndex; unit += 1) {
      units.push({
        unit,
        label: unitLabelFor ? unitLabelFor(unit) : String(axis.valueForUnit(unit)),
        className: unitClassFor?.(unit) ?? '',
        style: htmlSafe(`left: ${axis.offsetForUnit(unit)}px; width: ${axis.unitSize}px;`)
      });
    }
    return units;
  }
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-resource-timeline__header-row\" style={{this.style}}>\n      {{#each this.visibleUnits key=\"unit\" as |cell|}}\n        <div class=\"rs-resource-timeline__header-cell {{cell.className}}\" style={{cell.style}}>\n          {{cell.label}}\n        </div>\n      {{/each}}\n    </div>\n  ", {
      strictMode: true
    }), this);
  }
}

export { ResourceTimelineHeader as default };
//# sourceMappingURL=header.js.map
