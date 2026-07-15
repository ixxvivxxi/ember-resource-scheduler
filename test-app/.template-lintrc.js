'use strict';

module.exports = {
  extends: 'recommended',
  rules: {
    // Sizing the demo/test containers needs a plain inline style; matches
    // the override in resource-scheduler/.template-lintrc.cjs.
    'no-inline-styles': false,
  },
};
