'use strict';

module.exports = function (asyncInit, asyncBefore, asyncAfter) {
  // Right now async_wrap is an internal C++ module,
  // thus require doesn't work.

  var asyncWrap = process.binding('async_wrap');

  // Think of `CallInitHook` as the property name
  // and `kCallInitHook` as the way to access it
  var kCallInitHook = 0;
  var asyncHooksObject = {};

  // Enable async wrap
  asyncWrap.setupHooks(asyncHooksObject,
    asyncInit, asyncBefore, asyncAfter);

  // Enable init events (default 0)
  // Must be set after `async_wrap.setupHooks` is called
  asyncHooksObject[kCallInitHook] = 1;
};
