import { modifier } from 'ember-modifier';

/**
 * Reports scroll position and viewport size so a consumer can compute the
 * visible range for column/row virtualization. Deliberately does not do
 * anything with drag state — auto-scroll-while-dragging is out of v1 scope.
 */
var scrollWindow = modifier(function scrollWindow(element, positionalArgs, {
  onChange
}) {
  function report() {
    onChange({
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      viewportWidth: element.clientWidth,
      viewportHeight: element.clientHeight
    });
  }
  element.addEventListener('scroll', report, {
    passive: true
  });
  const resizeObserver = new ResizeObserver(report);
  resizeObserver.observe(element);
  report();
  return () => {
    element.removeEventListener('scroll', report);
    resizeObserver.disconnect();
  };
});

export { scrollWindow as default };
//# sourceMappingURL=scroll-window.js.map
