import Component from '@glimmer/component';
import { tracked, cached } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import { createDragEngine } from '../utils/drag-engine.js';
import { buildLaneLayout } from '../utils/lane-layout.js';
import { computeVisibleRange, computeVisibleRangeVariable } from '../utils/virtualize.js';
import scrollWindow from '../modifiers/scroll-window.js';
import VerticalResourceGridTimeHeader from './vertical-resource-grid/time-header.js';
import VerticalResourceGridResourceColumn from './vertical-resource-grid/resource-column.js';
import '../styles/resource-scheduler.css';
import './vertical-resource-grid.css';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import { g, i, n } from 'decorator-transforms/runtime';

const DEFAULT_LANE_WIDTH = 32;
const DEFAULT_HEADER_HEIGHT = 32;
const DEFAULT_TIME_COL_WIDTH = 60;
const DEFAULT_OVERSCAN = 2;
/**
 * The vertical-resource-grid view: a direct transposition of
 * resource-timeline (see its doc comment) — time runs top-to-bottom
 * (`@axis` is a minute-axis here rather than a day-axis) and resources sit
 * side-by-side as columns instead of stacked rows. Shares every non-visual
 * primitive and the drag modifiers (via `orientation="vertical"`) with
 * resource-timeline; only the presentational component tree differs, since
 * the DOM/CSS structure doesn't transpose cleanly enough to be worth a
 * single orientation-aware component.
 *
 * `@laneWidth`/`@headerHeight`/`@timeColWidth` are plain JS numbers used
 * for layout math — keep them numerically in sync with the
 * `--rs-lane-width`/`--rs-header-height`/`--rs-time-col-width` CSS custom
 * properties that control the actual rendered size.
 */
class VerticalResourceGrid extends Component {
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
  get blocks() {
    return this.args.blocks ?? [];
  }
  get laneWidth() {
    return this.args.laneWidth ?? DEFAULT_LANE_WIDTH;
  }
  get headerHeight() {
    return this.args.headerHeight ?? DEFAULT_HEADER_HEIGHT;
  }
  get timeColWidth() {
    return this.args.timeColWidth ?? DEFAULT_TIME_COL_WIDTH;
  }
  get overscan() {
    return this.args.overscan ?? DEFAULT_OVERSCAN;
  }
  // @cached: see resource-timeline.gjs — laneLayout is a modifier arg, and
  // an unmemoized new object on every scroll tick would tear down and
  // reinstall every block's pointer handlers for no reason.
  get laneLayout() {
    return buildLaneLayout(this.resources, {
      laneSize: this.laneWidth
    });
  }
  // @cached: see resource-timeline.gjs's `blocksByResource` — `columns` is
  // sliced on every scroll tick, so an unmemoized regroup-the-whole-list here
  // makes the grid visibly lag behind the (instant, native) scrollbar during
  // fast scrolling.
  static {
    n(this.prototype, "laneLayout", [cached]);
  }
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
  get columns() {
    const blocksByResource = this.blocksByResource;
    const laneWidth = this.laneWidth;
    return this.resources.map(resource => {
      const width = Math.max(1, resource.laneCount ?? 1) * laneWidth;
      return {
        resource,
        blocks: blocksByResource.get(resource.id) ?? [],
        width,
        style: htmlSafe(`width: ${width}px;`)
      };
    });
  }
  static {
    n(this.prototype, "columns", [cached]);
  }
  get visibleUnitRange() {
    return computeVisibleRange({
      // header-row occupies flow height before lanes-row (see
      // resource-timeline.gjs's equivalent headerHeight subtraction).
      scrollOffset: this.scrollTop - this.headerHeight,
      viewportSize: this.viewportHeight,
      itemCount: this.args.axis.unitCount,
      itemSize: this.args.axis.unitSize,
      overscan: this.overscan
    });
  }
  get visibleColumnRange() {
    return computeVisibleRangeVariable({
      // time-header occupies flow width before the resource columns.
      scrollOffset: this.scrollLeft - this.timeColWidth,
      viewportSize: this.viewportWidth,
      itemSizes: this.laneLayout.itemSizes,
      overscan: this.overscan
    });
  }
  get visibleColumns() {
    const {
      startIndex,
      endIndex
    } = this.visibleColumnRange;
    return this.columns.slice(startIndex, endIndex + 1);
  }
  get leadingColumnSpacerSize() {
    return this.visibleColumnRange.leadingSize;
  }
  get trailingColumnSpacerSize() {
    return this.visibleColumnRange.trailingSize;
  }
  get cornerStyle() {
    return htmlSafe(`width: ${this.timeColWidth}px;`);
  }
  get lanesRowStyle() {
    return htmlSafe(`height: ${this.args.axis.totalSize}px;`);
  }
  get leadingColumnSpacerStyle() {
    return htmlSafe(`width: ${this.leadingColumnSpacerSize}px;`);
  }
  get trailingColumnSpacerStyle() {
    return htmlSafe(`width: ${this.trailingColumnSpacerSize}px;`);
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
  static {
    setComponentTemplate(precompileTemplate("\n    <div class=\"rs-vertical-resource-grid\" ...attributes>\n      <div class=\"rs-vertical-resource-grid__viewport\" {{scrollWindow onChange=this.handleScrollChange}}>\n        <div class=\"rs-vertical-resource-grid__body\">\n          <div class=\"rs-vertical-resource-grid__header-row\">\n            <div class=\"rs-vertical-resource-grid__corner\" style={{this.cornerStyle}}></div>\n            {{#if this.leadingColumnSpacerSize}}\n              <div style={{this.leadingColumnSpacerStyle}}></div>\n            {{/if}}\n            {{#each this.visibleColumns key=\"resource.id\" as |column|}}\n              <div class=\"rs-vertical-resource-grid__resource-header-cell\" style={{column.style}}>\n                <div class=\"rs-vertical-resource-grid__resource-header-label\">{{column.resource.label}}</div>\n                {{#if column.resource.sublabel}}\n                  <div class=\"rs-vertical-resource-grid__resource-header-sublabel\">{{column.resource.sublabel}}</div>\n                {{/if}}\n              </div>\n            {{/each}}\n            {{#if this.trailingColumnSpacerSize}}\n              <div style={{this.trailingColumnSpacerStyle}}></div>\n            {{/if}}\n          </div>\n          <div class=\"rs-vertical-resource-grid__lanes-row\" data-rs-lanes-content style={{this.lanesRowStyle}}>\n            <VerticalResourceGridTimeHeader @axis={{@axis}} @timeColWidth={{this.timeColWidth}} @visibleUnitRange={{this.visibleUnitRange}} @unitClassFor={{@unitClassFor}} @unitLabelFor={{@unitLabelFor}} />\n            <div class=\"rs-vertical-resource-grid__columns-content\" data-rs-rows-content>\n              {{#if this.leadingColumnSpacerSize}}\n                <div style={{this.leadingColumnSpacerStyle}}></div>\n              {{/if}}\n              {{#each this.visibleColumns key=\"resource.id\" as |column|}}\n                <VerticalResourceGridResourceColumn @resource={{column.resource}} @blocks={{column.blocks}} @width={{column.width}} @axis={{@axis}} @laneWidth={{this.laneWidth}} @laneLayout={{this.laneLayout}} @visibleUnitRange={{this.visibleUnitRange}} @dragPreview={{this.dragPreview}} @onStartDrag={{this.startDrag}} @onUpdateDrag={{this.updateDrag}} @onEndDrag={{this.endDrag}} @onCancelDrag={{this.cancelDrag}} />\n              {{/each}}\n              {{#if this.trailingColumnSpacerSize}}\n                <div style={{this.trailingColumnSpacerStyle}}></div>\n              {{/if}}\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        scrollWindow,
        VerticalResourceGridTimeHeader,
        VerticalResourceGridResourceColumn
      })
    }), this);
  }
}

export { VerticalResourceGrid as default };
//# sourceMappingURL=vertical-resource-grid.js.map
