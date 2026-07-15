import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

var ResourceTimelineNameCell = setComponentTemplate(precompileTemplate("\n  {{!-- template-lint-disable no-invalid-interactive --}}\n  {{!-- A row's name cell opens that resource's own detail view on dblclick when\n  the consumer asks for it (`@onResourceActivate`) \u2014 it is a cell in a grid,\n  not a control, so it stays a div. --}}\n  <div class=\"rs-resource-timeline__name-cell\n      {{if @activatable \"rs-resource-timeline__name-cell--activatable\"}}\" style={{@style}} {{on \"dblclick\" (fn @onActivate @resource)}}>\n    {{#if @hasCustomName}}\n      {{yield}}\n    {{else}}\n      <div class=\"rs-resource-timeline__name-label\">{{@resource.label}}</div>\n      {{#if @resource.sublabel}}\n        <div class=\"rs-resource-timeline__name-sublabel\">{{@resource.sublabel}}</div>\n      {{/if}}\n    {{/if}}\n  </div>\n", {
  strictMode: true,
  scope: () => ({
    on,
    fn
  })
}), templateOnly());

export { ResourceTimelineNameCell as default };
//# sourceMappingURL=name-cell.js.map
