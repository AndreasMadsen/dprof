'use strict';
require('../../dprof.js');

setImmediate(function recursive(remaining) {
  if (remaining === 0) return;
  setImmediate(recursive, remaining - 1);
}, 2500);
