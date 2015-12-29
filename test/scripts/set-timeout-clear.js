'use strict';
require('../../dprof.js');

const timer = setTimeout(function () { }, 1000);

setTimeout(function () {
  clearTimeout(timer);
}, 10);

setTimeout(function () { }, 100);
