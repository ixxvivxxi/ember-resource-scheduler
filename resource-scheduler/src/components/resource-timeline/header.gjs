import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

export default class ResourceTimelineHeader extends Component {
  get style() {
    return htmlSafe(`height: ${this.args.headerHeight}px;`);
  }

  get visibleUnits() {
    const { startIndex, endIndex } = this.args.visibleColumnRange;
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
          `left: ${axis.offsetForUnit(unit)}px; width: ${axis.unitSize}px;`,
        ),
      });
    }
    return units;
  }

  <template>
    <div class="rs-resource-timeline__header-row" style={{this.style}}>
      {{#each this.visibleUnits key="unit" as |cell|}}
        <div
          class="rs-resource-timeline__header-cell {{cell.className}}"
          style={{cell.style}}
        >
          {{cell.label}}
        </div>
      {{/each}}
    </div>
  </template>
}
