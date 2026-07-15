import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

export default class VerticalResourceGridTimeHeader extends Component {
  get style() {
    return htmlSafe(`width: ${this.args.timeColWidth}px;`);
  }

  get visibleUnits() {
    const { startIndex, endIndex } = this.args.visibleUnitRange;
    const axis = this.args.axis;
    const unitLabelFor = this.args.unitLabelFor;
    const unitClassFor = this.args.unitClassFor;

    const units = [];
    for (let unit = startIndex; unit <= endIndex; unit += 1) {
      units.push({
        unit,
        label: unitLabelFor
          ? unitLabelFor(unit)
          : String(axis.valueForUnit(unit)),
        className: unitClassFor?.(unit) ?? '',
        style: htmlSafe(
          `top: ${axis.offsetForUnit(unit)}px; height: ${axis.unitSize}px;`,
        ),
      });
    }
    return units;
  }

  <template>
    <div class="rs-vertical-resource-grid__time-header" style={{this.style}}>
      {{#each this.visibleUnits key="unit" as |cell|}}
        <div
          class="rs-vertical-resource-grid__time-header-cell {{cell.className}}"
          style={{cell.style}}
        >
          {{cell.label}}
        </div>
      {{/each}}
    </div>
  </template>
}
