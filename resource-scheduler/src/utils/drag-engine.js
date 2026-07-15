const IDLE = 'idle';
const DRAGGING = 'dragging';

/**
 * Pure drag/resize state machine — no DOM, no Pointer Events. A consumer
 * modifier drives it via start/updatePointer/end/cancel and is responsible
 * for translating real pointer coordinates into resource/lane/unit
 * candidates before calling in.
 */
export function createDragEngine({ canPlace = () => true } = {}) {
  let state = IDLE;
  let gesture = null;

  function assertDragging(method) {
    if (state !== DRAGGING) {
      throw new Error(
        `drag-engine: ${method}() called with no drag in progress`,
      );
    }
  }

  function toResult(candidate) {
    return { ...candidate, valid: canPlace(candidate) };
  }

  return {
    get isDragging() {
      return state === DRAGGING;
    },
    get current() {
      return gesture ? { ...gesture } : null;
    },

    start(candidate) {
      if (state === DRAGGING) {
        throw new Error(
          'drag-engine: start() called while a drag is already in progress',
        );
      }
      state = DRAGGING;
      gesture = { ...candidate };
      return toResult(gesture);
    },

    updatePointer(partial) {
      assertDragging('updatePointer');
      gesture = { ...gesture, ...partial };
      return toResult(gesture);
    },

    end() {
      assertDragging('end');
      const finished = gesture;
      state = IDLE;
      gesture = null;
      return canPlace(finished) ? { ...finished } : null;
    },

    cancel() {
      state = IDLE;
      gesture = null;
    },
  };
}
