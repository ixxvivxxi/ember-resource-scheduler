import { modifier } from 'ember-modifier';
import { lanesContentElementFor, rowsContentElementFor, pinnedRowsElementFor, unitForClientPoint, resourceLaneForClientPoint } from './pointer-geometry.js';

/**
 * Drives move/resize-start/resize-end drags for one Block element (or one
 * of its resize handles, via `mode`). Always re-derives the candidate from
 * the pointer's *absolute* position each move (rather than accumulating
 * deltas) so there's no drift across a long drag. `orientation` (default
 * 'horizontal') is the only difference between resource-timeline and
 * vertical-resource-grid — see pointer-geometry.js.
 */
var schedulableBlock = modifier(function schedulableBlock(element, [block], {
  mode = 'move',
  axis,
  laneLayout,
  pinnedLaneLayout = null,
  orientation = 'horizontal',
  onStart,
  onUpdate,
  onEnd,
  onCancel
}) {
  function handlePointerDown(event) {
    if (block.isReadOnly || event.button !== 0) {
      return;
    }
    if (mode !== 'move') {
      event.stopPropagation();
    }
    event.preventDefault();
    // Best-effort: capture keeps the drag alive if the pointer leaves the
    // element mid-move, but its absence (e.g. an already-released pointer)
    // shouldn't abort the gesture itself.
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    const lanesContentElement = lanesContentElementFor(element);
    const rowsContentElement = mode === 'move' ? rowsContentElementFor(element) : null;
    // The pinned band is a second hit-test target: a block dragged out of a
    // pinned row must be able to land on a resource in the scrolling body,
    // and a block from the body must be able to go back into it.
    const pinned = mode === 'move' && pinnedLaneLayout ? {
      layout: pinnedLaneLayout,
      element: pinnedRowsElementFor(element)
    } : null;
    const pointerDownUnit = unitForClientPoint(event.clientX, event.clientY, axis, lanesContentElement, orientation);
    const duration = block.unitEnd - block.unitStart;
    onStart({
      type: mode,
      blockId: block.id,
      resourceId: block.resourceId,
      lane: block.lane,
      unitStart: block.unitStart,
      unitEnd: block.unitEnd,
      sourceBlock: block
    });
    function handlePointerMove(moveEvent) {
      const currentUnit = unitForClientPoint(moveEvent.clientX, moveEvent.clientY, axis, lanesContentElement, orientation);
      const deltaUnits = currentUnit - pointerDownUnit;
      if (mode === 'move') {
        const unitStart = block.unitStart + deltaUnits;
        const located = resourceLaneForClientPoint(moveEvent.clientX, moveEvent.clientY, laneLayout, rowsContentElement, orientation, pinned);
        onUpdate({
          unitStart,
          unitEnd: unitStart + duration,
          resourceId: located?.resourceId ?? block.resourceId,
          lane: located?.lane ?? block.lane
        });
      } else if (mode === 'resize-end') {
        onUpdate({
          unitEnd: Math.max(block.unitStart + 1, block.unitEnd + deltaUnits)
        });
      } else if (mode === 'resize-start') {
        onUpdate({
          unitStart: Math.min(block.unitEnd - 1, block.unitStart + deltaUnits)
        });
      }
    }
    function finish() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeydown);
    }
    function handlePointerUp() {
      finish();
      onEnd();
    }
    function handleKeydown(keyEvent) {
      if (keyEvent.key === 'Escape') {
        finish();
        onCancel();
      }
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeydown);
  }
  element.addEventListener('pointerdown', handlePointerDown);
  return () => {
    element.removeEventListener('pointerdown', handlePointerDown);
  };
});

export { schedulableBlock as default };
//# sourceMappingURL=schedulable-block.js.map
