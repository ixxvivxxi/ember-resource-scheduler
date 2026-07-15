import { modifier } from 'ember-modifier';
import { lanesContentElementFor, rowsContentElementFor, unitForClientPoint, resourceLaneForClientPoint, cellsBetween } from './pointer-geometry.js';

/**
 * Drives a drag-to-create gesture starting from an empty-cell gap. The gesture
 * always extends the axis (date) range as the pointer moves. When a
 * `laneLayout` is supplied it *also* tracks the resource/lane cell under the
 * pointer and reports every lane cell the drag rectangle covers as `cells`
 * (top-to-bottom), so a consumer can create N places from one gesture; the
 * anchor `resourceId`/`lane` stay pinned to the start cell for single-row
 * back-compat. Without a `laneLayout` the gesture is single-cell as before.
 * `orientation` (default 'horizontal') — see pointer-geometry.js.
 */
var dropSurface = modifier(function dropSurface(element, [{
  resourceId,
  lane
}], {
  axis,
  laneLayout = null,
  orientation = 'horizontal',
  onStart,
  onUpdate,
  onEnd,
  onCancel
}) {
  const startCell = {
    resourceId,
    lane
  };
  function handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // ignore — see schedulable-block.js
    }
    const lanesContentElement = lanesContentElementFor(element);
    const rowsContentElement = laneLayout ? rowsContentElementFor(element) : null;
    const pointerDownUnit = unitForClientPoint(event.clientX, event.clientY, axis, lanesContentElement, orientation);
    onStart({
      type: 'create',
      blockId: null,
      resourceId,
      lane,
      unitStart: pointerDownUnit,
      unitEnd: pointerDownUnit + 1,
      cells: [startCell]
    });
    function coveredCells(moveEvent) {
      if (!laneLayout) {
        return [startCell];
      }
      const currentCell = resourceLaneForClientPoint(moveEvent.clientX, moveEvent.clientY, laneLayout, rowsContentElement, orientation);
      return currentCell ? cellsBetween(laneLayout, startCell, currentCell) : [startCell];
    }
    function handlePointerMove(moveEvent) {
      const currentUnit = unitForClientPoint(moveEvent.clientX, moveEvent.clientY, axis, lanesContentElement, orientation);
      onUpdate({
        unitStart: Math.min(pointerDownUnit, currentUnit),
        unitEnd: Math.max(pointerDownUnit, currentUnit) + 1,
        cells: coveredCells(moveEvent)
      });
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

export { dropSurface as default };
//# sourceMappingURL=drop-surface.js.map
