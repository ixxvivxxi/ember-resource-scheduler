'use strict';

module.exports = {
  extends: 'recommended',
  rules: {
    // Pixel-position virtualization/drag layout needs computed inline
    // styles (offsets/sizes can't be static CSS classes); still required
    // to build them as htmlSafe strings in JS, not concatenate in-template
    // (style-concatenation stays enabled).
    'no-inline-styles': false,
  },
};
