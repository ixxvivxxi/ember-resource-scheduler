import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import ResourceTimelineEmptyCell from './empty-cell.gjs';
import ResourceTimelineOverlay from './overlay.gjs';

/**
 * A row whose body is *not* lanes-of-blocks: the consumer draws its cells
 * itself (via the `summaryRow` named block) — an aggregate row, e.g. free
 * places per day, heat-mapped.
 *
 * The row still owns **one full-width drop surface**, so drag-to-create over
 * an aggregate row goes through the same drag engine as everywhere else and
 * reports a `create` gesture for this resource with `lane: 0`. The yielded
 * content is painted on top of it with `pointer-events: none`, so the numbers
 * are decoration and the gesture belongs to the row.
 *
 * Blocks are never rendered here — a `Block` is a thing you drag; a number is
 * not. A consumer that puts blocks on a summary resource simply sees nothing.
 */
export default class ResourceTimelineSummaryRow extends Component {
  get style() {
    return htmlSafe(`height: ${this.args.height}px;`);
  }

  get fullSpan() {
    return { start: 0, end: this.args.axis.unitCount };
  }

  get isDragTarget() {
    const preview = this.args.dragPreview;
    return Boolean(preview && preview.resourceId === this.args.resource.id);
  }

  <template>
    <div class="rs-resource-timeline__summary-row" style={{this.style}}>
      <ResourceTimelineEmptyCell
        @gap={{this.fullSpan}}
        @axis={{@axis}}
        @resourceId={{@resource.id}}
        @lane={{0}}
        @onStartDrag={{@onStartDrag}}
        @onUpdateDrag={{@onUpdateDrag}}
        @onEndDrag={{@onEndDrag}}
        @onCancelDrag={{@onCancelDrag}}
      />
      <div class="rs-resource-timeline__summary-content">
        {{yield}}
      </div>
      {{#if this.isDragTarget}}
        <ResourceTimelineOverlay @axis={{@axis}} @preview={{@dragPreview}} />
      {{/if}}
    </div>
  </template>
}
