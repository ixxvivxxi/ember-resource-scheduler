import Component from '@glimmer/component';
import { tracked, cached } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import { hash } from '@ember/helper';
import { createDragEngine } from '../utils/drag-engine.js';
import { buildLaneLayout } from '../utils/lane-layout.js';
import { computeVisibleRange, computeVisibleRangeVariable } from '../utils/virtualize.js';
import scrollWindow from '../modifiers/scroll-window.js';
import ResourceTimelineHeader from './resource-timeline/header.js';
import ResourceTimelineNameCell from './resource-timeline/name-cell.js';
import ResourceTimelineResourceRow from './resource-timeline/resource-row.js';
import ResourceTimelineSummaryRow from './resource-timeline/summary-row.js';
import '../styles/resource-scheduler.css';
import './resource-timeline.css';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import { g, i, n } from 'decorator-transforms/runtime';

const DEFAULT_LANE_HEIGHT = 32;
const DEFAULT_HEADER_HEIGHT = 32;
const DEFAULT_NAME_COL_WIDTH = 90;
const DEFAULT_PLACE_COL_WIDTH = 28;
const DEFAULT_OVERSCAN = 2;
/**
 * Orchestrates the resource-timeline view: groups `@blocks` by resource,
 * owns the single drag-engine instance and scroll/viewport state, and
 * windows both axes for virtualization. Everything else is presentational
 * subcomponents driven entirely off the args/getters here.
 *
 * `@laneHeight`/`@headerHeight`/`@nameColWidth` are plain JS numbers (like
 * `unitSize` on the time-axis) used for layout math (row heights,
 * hit-testing, virtualization) — keep them numerically in sync with the
 * `--rs-lane-height`/`--rs-header-height`/`--rs-name-col-width` CSS custom
 * properties that control the actual rendered size.
 *
 * **A row is one of two kinds** (`Resource.kind`, default `'lanes'`):
 * - `'lanes'` — the normal row: lanes of draggable `Block`s.
 * - `'summary'` — an aggregate row whose cells the consumer draws itself via
 *   the `summaryRow` named block (e.g. free places per day, heat-mapped). It
 *   carries one full-width drop surface, so drag-to-create works there too.
 *
 * **`@pinnedResources`** renders the same two row kinds in a sticky band
 * directly under the header, outside the virtualized body. Dragging a block
 * *between* the band and the body is a normal move — hit-testing spans both
 * (see pointer-geometry.js).
 *
 * Grouping/collapsing is deliberately *not* here: a consumer that wants a
 * collapsible group renders a `summary` row and filters `@resources` itself.
 * The addon knows about rows, lanes and time — never about domain hierarchy.
 */
class ResourceTimeline extends Component {
  static {
    g(this.prototype, "scrollLeft", [tracked], function () {
      return 0;
    });
  }
  #scrollLeft = (i(this, "scrollLeft"), void 0);
  static {
    g(this.prototype, "scrollTop", [tracked], function () {
      return 0;
    });
  }
  #scrollTop = (i(this, "scrollTop"), void 0);
  static {
    g(this.prototype, "viewportWidth", [tracked], function () {
      return 0;
    });
  }
  #viewportWidth = (i(this, "viewportWidth"), void 0);
  static {
    g(this.prototype, "viewportHeight", [tracked], function () {
      return 0;
    });
  }
  #viewportHeight = (i(this, "viewportHeight"), void 0);
  static {
    g(this.prototype, "dragPreview", [tracked], function () {
      return null;
    });
  }
  #dragPreview = (i(this, "dragPreview"), void 0);
  dragEngine = createDragEngine({
    canPlace: candidate => this.args.canPlace?.(candidate) ?? true
  });
  get resources() {
    return this.args.resources ?? [];
  }
  get pinnedResources() {
    return this.args.pinnedResources ?? [];
  }
  get hasPinnedRows() {
    return this.pinnedResources.length > 0;
  }
  get blocks() {
    return this.args.blocks ?? [];
  }
  get laneHeight() {
    return this.args.laneHeight ?? DEFAULT_LANE_HEIGHT;
  }
  get headerHeight() {
    return this.args.headerHeight ?? DEFAULT_HEADER_HEIGHT;
  }
  get nameColWidth() {
    return this.args.nameColWidth ?? DEFAULT_NAME_COL_WIDTH;
  }
  // Only reserved when a consumer passes `@laneLabelFor` — otherwise the
  // column isn't rendered at all and takes no horizontal space.
  get placeColWidth() {
    return this.args.laneLabelFor ? this.args.placeColWidth ?? DEFAULT_PLACE_COL_WIDTH : 0;
  }
  // Opt-in second sticky header row (e.g. a per-day occupancy summary) via
  // the `headerExtraCorner`/`headerExtraRow` named blocks. `extraHeaderHeight`
  // is a required plain-number arg (like `laneHeight`/`headerHeight`) so the
  // row-virtualization math below can account for it — it is not inferred
  // from block presence to avoid a zero-height sticky row when a consumer
  // passes the blocks but forgets the height (or vice versa).
  get hasExtraHeader() {
    return Boolean(this.args.extraHeaderHeight);
  }
  get extraHeaderHeight() {
    return this.args.extraHeaderHeight ?? 0;
  }
  get overscan() {
    return this.args.overscan ?? DEFAULT_OVERSCAN;
  }
  // @cached: `laneLayout` is passed as a named arg to the schedulable-block/
  // drop-surface modifiers, which reinstall whenever any of their args
  // changes by reference — without memoizing, every scroll/resize tick (a
  // new object from this getter) would tear down and reinstall every
  // block's pointer handlers for no reason.
  get laneLayout() {
    return buildLaneLayout(this.resources, {
      laneSize: this.laneHeight
    });
  }
  // The pinned band's own coordinate space: it never scrolls, so its rows
  // cannot share the body's layout (whose offsets are relative to the
  // scrolled content). Two layouts, one gesture — see pointer-geometry.js.
  static {
    n(this.prototype, "laneLayout", [cached]);
  }
  get pinnedLaneLayout() {
    return buildLaneLayout(this.pinnedResources, {
      laneSize: this.laneHeight
    });
  }
  static {
    n(this.prototype, "pinnedLaneLayout", [cached]);
  }
  get pinnedBandHeight() {
    return this.pinnedLaneLayout.totalSize;
  }
  // @cached: `visibleRows` slices this on every scroll tick (scrollTop is
  // tracked) — without memoizing, every wheel event would re-group the
  // *entire* block list and re-map *every* resource just to read a handful
  // of visible rows, backing up behind fast-fired scroll events and making
  // the grid visibly lag a second or more behind the (instant, native)
  // scrollbar.
  get blocksByResource() {
    const map = new Map();
    for (const block of this.blocks) {
      if (!map.has(block.resourceId)) {
        map.set(block.resourceId, []);
      }
      map.get(block.resourceId).push(block);
    }
    return map;
  }
  static {
    n(this.prototype, "blocksByResource", [cached]);
  }
  buildRow = resource => {
    const laneCount = Math.max(1, resource.laneCount ?? 1);
    const height = laneCount * this.laneHeight;
    return {
      resource,
      isSummary: resource.kind === 'summary',
      blocks: this.blocksByResource.get(resource.id) ?? [],
      height,
      style: htmlSafe(`height: ${height}px;`)
    };
  };
  get rows() {
    return this.resources.map(this.buildRow);
  }
  static {
    n(this.prototype, "rows", [cached]);
  }
  get pinnedRows() {
    return this.pinnedResources.map(this.buildRow);
  }
  static {
    n(this.prototype, "pinnedRows", [cached]);
  }
  get visibleColumnRange() {
    return computeVisibleRange({
      // The sticky name-column (and, when present, the sticky place-column)
      // still occupy flow width in the shared scroll container (sticky
      // positioning only changes paint position, not layout), so scrollLeft
      // is offset by their combined width relative to the lanes-column's own
      // [0, totalSize] coordinate space.
      scrollOffset: this.scrollLeft - this.nameColWidth - this.placeColWidth,
      viewportSize: this.viewportWidth,
      itemCount: this.args.axis.unitCount,
      itemSize: this.args.axis.unitSize,
      overscan: this.overscan
    });
  }
  get visibleRowRange() {
    return computeVisibleRangeVariable({
      // The pinned band sits above the body in flow (as the header does), so
      // the body's own [0, totalSize] space starts that much further down.
      scrollOffset: this.scrollTop - this.headerHeight - this.extraHeaderHeight - this.pinnedBandHeight,
      viewportSize: this.viewportHeight,
      itemSizes: this.laneLayout.itemSizes,
      overscan: this.overscan
    });
  }
  get visibleRows() {
    const {
      startIndex,
      endIndex
    } = this.visibleRowRange;
    return this.rows.slice(startIndex, endIndex + 1);
  }
  get leadingRowSpacerSize() {
    return this.visibleRowRange.leadingSize;
  }
  get trailingRowSpacerSize() {
    return this.visibleRowRange.trailingSize;
  }
  get cornerStyle() {
    return htmlSafe(`height: ${this.headerHeight}px;`);
  }
  // Spans both header rows as one blank sticky block — there's no
  // consumer-yielded content for the place-column's own corner, unlike the
  // name-column's, which gets a separate `headerExtraCorner` block.
  get placeCornerStyle() {
    return htmlSafe(`height: ${this.headerHeight + this.extraHeaderHeight}px;`);
  }
  get cornerExtraStyle() {
    return htmlSafe(`height: ${this.extraHeaderHeight}px; top: ${this.headerHeight}px;`);
  }
  get headerExtraRowStyle() {
    return htmlSafe(`height: ${this.extraHeaderHeight}px; top: ${this.headerHeight}px;`);
  }
  // All three columns pin their band at the same offset — right below the
  // header (and the extra header row, when there is one).
  get pinnedBandStyle() {
    return htmlSafe(`top: ${this.headerHeight + this.extraHeaderHeight}px; height: ${this.pinnedBandHeight}px;`);
  }
  get lanesColumnStyle() {
    return htmlSafe(`width: ${this.args.axis.totalSize}px;`);
  }
  get leadingRowSpacerStyle() {
    return htmlSafe(`height: ${this.leadingRowSpacerSize}px;`);
  }
  get trailingRowSpacerStyle() {
    return htmlSafe(`height: ${this.trailingRowSpacerSize}px;`);
  }
  // Per-lane sticky labels in the place-column (e.g. bed numbers) — only
  // computed when a consumer passes `@laneLabelFor`. Reuses each row's
  // already-computed `resource`/`style` rather than recomputing them. A
  // summary row has no lanes, so it gets no labels — just the right height.
  placeRowsFor = rows => {
    const laneLabelFor = this.args.laneLabelFor;
    if (!laneLabelFor) {
      return [];
    }
    const laneHeight = this.laneHeight;
    return rows.map(row => {
      const laneCount = row.isSummary ? 0 : Math.max(1, row.resource.laneCount ?? 1);
      return {
        resource: row.resource,
        style: row.style,
        lanes: Array.from({
          length: laneCount
        }, (_, laneIndex) => ({
          laneIndex,
          label: laneLabelFor(row.resource, laneIndex),
          style: htmlSafe(`top: ${laneIndex * laneHeight}px; height: ${laneHeight}px;`)
        }))
      };
    });
  };
  get placeRows() {
    return this.placeRowsFor(this.visibleRows);
  }
  get pinnedPlaceRows() {
    return this.placeRowsFor(this.pinnedRows);
  }
  handleScrollChange = ({
    scrollLeft,
    scrollTop,
    viewportWidth,
    viewportHeight
  }) => {
    this.scrollLeft = scrollLeft;
    this.scrollTop = scrollTop;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  };
  startDrag = candidate => {
    this.dragPreview = this.dragEngine.start(candidate);
  };
  updateDrag = partial => {
    this.dragPreview = this.dragEngine.updatePointer(partial);
  };
  endDrag = () => {
    const result = this.dragEngine.end();
    this.dragPreview = null;
    if (result) {
      this.args.onGesture?.(result);
    }
  };
  cancelDrag = () => {
    this.dragEngine.cancel();
    this.dragPreview = null;
  };
  // Optional: a consumer opening a resource's own detail view (e.g.
  // double-clicking a room name) via `@onResourceActivate`. Domain-agnostic
  // — the addon only reports which `Resource` was activated, never
  // navigates itself.
  activateResource = resource => {
    this.args.onResourceActivate?.(resource);
  };
  static {
    setComponentTemplate(precompileTemplate("\n    {{#let (component ResourceTimelineNameCell activatable=@onResourceActivate onActivate=this.activateResource hasCustomName=(has-block \"name\")) (component ResourceTimelineResourceRow axis=@axis laneHeight=this.laneHeight laneLayout=this.laneLayout pinnedLaneLayout=this.pinnedLaneLayout visibleColumnRange=this.visibleColumnRange dragPreview=this.dragPreview onStartDrag=this.startDrag onUpdateDrag=this.updateDrag onEndDrag=this.endDrag onCancelDrag=this.cancelDrag onBlockActivate=@onBlockActivate) (component ResourceTimelineSummaryRow axis=@axis dragPreview=this.dragPreview onStartDrag=this.startDrag onUpdateDrag=this.updateDrag onEndDrag=this.endDrag onCancelDrag=this.cancelDrag) as |NameCell LaneRow SummaryRow|}}\n      <div class=\"rs-resource-timeline\" ...attributes>\n        <div class=\"rs-resource-timeline__viewport\" {{scrollWindow onChange=this.handleScrollChange}}>\n          <div class=\"rs-resource-timeline__body\">\n            <div class=\"rs-resource-timeline__name-column\">\n              <div class=\"rs-resource-timeline__corner\" style={{this.cornerStyle}}></div>\n              {{#if this.hasExtraHeader}}\n                <div class=\"rs-resource-timeline__corner-extra\" style={{this.cornerExtraStyle}}>\n                  {{yield to=\"headerExtraCorner\"}}\n                </div>\n              {{/if}}\n              {{#if this.hasPinnedRows}}\n                <div class=\"rs-resource-timeline__pinned-names\" style={{this.pinnedBandStyle}}>\n                  {{#each this.pinnedRows key=\"resource.id\" as |row|}}\n                    <NameCell @resource={{row.resource}} @style={{row.style}}>\n                      {{yield row.resource to=\"name\"}}\n                    </NameCell>\n                  {{/each}}\n                </div>\n              {{/if}}\n              {{#if this.leadingRowSpacerSize}}\n                <div style={{this.leadingRowSpacerStyle}}></div>\n              {{/if}}\n              {{#each this.visibleRows key=\"resource.id\" as |row|}}\n                <NameCell @resource={{row.resource}} @style={{row.style}}>\n                  {{yield row.resource to=\"name\"}}\n                </NameCell>\n              {{/each}}\n              {{#if this.trailingRowSpacerSize}}\n                <div style={{this.trailingRowSpacerStyle}}></div>\n              {{/if}}\n            </div>\n            {{#if @laneLabelFor}}\n              <div class=\"rs-resource-timeline__place-column\">\n                <div class=\"rs-resource-timeline__corner\" style={{this.placeCornerStyle}}></div>\n                {{#if this.hasPinnedRows}}\n                  <div class=\"rs-resource-timeline__pinned-places\" style={{this.pinnedBandStyle}}>\n                    {{#each this.pinnedPlaceRows key=\"resource.id\" as |row|}}\n                      <div class=\"rs-resource-timeline__place-cell-group\" style={{row.style}}>\n                        {{#each row.lanes key=\"laneIndex\" as |lane|}}\n                          <div class=\"rs-resource-timeline__place-cell\" style={{lane.style}}>{{lane.label}}</div>\n                        {{/each}}\n                      </div>\n                    {{/each}}\n                  </div>\n                {{/if}}\n                {{#if this.leadingRowSpacerSize}}\n                  <div style={{this.leadingRowSpacerStyle}}></div>\n                {{/if}}\n                {{#each this.placeRows key=\"resource.id\" as |row|}}\n                  <div class=\"rs-resource-timeline__place-cell-group\" style={{row.style}}>\n                    {{#each row.lanes key=\"laneIndex\" as |lane|}}\n                      <div class=\"rs-resource-timeline__place-cell\" style={{lane.style}}>{{lane.label}}</div>\n                    {{/each}}\n                  </div>\n                {{/each}}\n                {{#if this.trailingRowSpacerSize}}\n                  <div style={{this.trailingRowSpacerStyle}}></div>\n                {{/if}}\n              </div>\n            {{/if}}\n            <div class=\"rs-resource-timeline__lanes-column\" data-rs-lanes-content style={{this.lanesColumnStyle}}>\n              <ResourceTimelineHeader @axis={{@axis}} @headerHeight={{this.headerHeight}} @visibleColumnRange={{this.visibleColumnRange}} @unitClassFor={{@unitClassFor}} @unitLabelFor={{@unitLabelFor}} />\n              {{#if this.hasExtraHeader}}\n                <div class=\"rs-resource-timeline__header-extra-row\" style={{this.headerExtraRowStyle}}>\n                  {{yield (hash axis=@axis visibleColumnRange=this.visibleColumnRange) to=\"headerExtraRow\"}}\n                </div>\n              {{/if}}\n              {{#if this.hasPinnedRows}}\n                <div class=\"rs-resource-timeline__pinned-rows\" data-rs-pinned-rows style={{this.pinnedBandStyle}}>\n                  {{#each this.pinnedRows key=\"resource.id\" as |row|}}\n                    {{#if row.isSummary}}\n                      <SummaryRow @resource={{row.resource}} @height={{row.height}}>\n                        {{yield (hash resource=row.resource axis=@axis visibleColumnRange=this.visibleColumnRange) to=\"summaryRow\"}}\n                      </SummaryRow>\n                    {{else}}\n                      <LaneRow @resource={{row.resource}} @blocks={{row.blocks}} @height={{row.height}} />\n                    {{/if}}\n                  {{/each}}\n                </div>\n              {{/if}}\n              <div data-rs-rows-content>\n                {{#if this.leadingRowSpacerSize}}\n                  <div style={{this.leadingRowSpacerStyle}}></div>\n                {{/if}}\n                {{#each this.visibleRows key=\"resource.id\" as |row|}}\n                  {{#if row.isSummary}}\n                    <SummaryRow @resource={{row.resource}} @height={{row.height}}>\n                      {{yield (hash resource=row.resource axis=@axis visibleColumnRange=this.visibleColumnRange) to=\"summaryRow\"}}\n                    </SummaryRow>\n                  {{else}}\n                    <LaneRow @resource={{row.resource}} @blocks={{row.blocks}} @height={{row.height}} />\n                  {{/if}}\n                {{/each}}\n                {{#if this.trailingRowSpacerSize}}\n                  <div style={{this.trailingRowSpacerStyle}}></div>\n                {{/if}}\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    {{/let}}\n  ", {
      strictMode: true,
      scope: () => ({
        ResourceTimelineNameCell,
        ResourceTimelineResourceRow,
        ResourceTimelineSummaryRow,
        scrollWindow,
        ResourceTimelineHeader,
        hash
      })
    }), this);
  }
}

export { ResourceTimeline as default };
//# sourceMappingURL=resource-timeline.js.map
