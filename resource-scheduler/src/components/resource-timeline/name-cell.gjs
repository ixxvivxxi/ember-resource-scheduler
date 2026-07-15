import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

/**
 * The sticky name cell of a row — the same markup for a pinned row and a body
 * row, and for both row kinds.
 *
 * `@hasCustomName` says whether the consumer passed a `name` block upstream
 * (that is where a collapse chevron hangs); without one, the cell falls back
 * to the `Resource`'s own label/sublabel.
 */
<template>
  {{! template-lint-disable no-invalid-interactive }}
  {{! A row's name cell opens that resource's own detail view on dblclick when
  the consumer asks for it (`@onResourceActivate`) — it is a cell in a grid,
  not a control, so it stays a div. }}
  <div
    class="rs-resource-timeline__name-cell
      {{if @activatable 'rs-resource-timeline__name-cell--activatable'}}"
    style={{@style}}
    {{on "dblclick" (fn @onActivate @resource)}}
  >
    {{#if @hasCustomName}}
      {{yield}}
    {{else}}
      <div class="rs-resource-timeline__name-label">{{@resource.label}}</div>
      {{#if @resource.sublabel}}
        <div
          class="rs-resource-timeline__name-sublabel"
        >{{@resource.sublabel}}</div>
      {{/if}}
    {{/if}}
  </div>
</template>
