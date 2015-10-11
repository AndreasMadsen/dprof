'use strict';
require('../../dprof.js');

setTimeout(function () {
  setTimeout(function () { }, 10)

  setTimeout(function () { }, 10)
}, 10)
