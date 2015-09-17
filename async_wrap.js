'use strict';

const asyncWrap = process.binding('async_wrap');
const chain = require('stack-chain');

function AsyncWrap() {
  this.enabled = false;
  this.skip = 0;
}

function NextTickWrap() {}

AsyncWrap.prototype.setup = function (init, before, after) {
  asyncWrap.setupHooks(init, before, after);

  // Overwrite next tick
  const self = this;
  const nextTick = process.nextTick;
  process.nextTick = function () {
    const enabled = self.enabled;
    const handle = new NextTickWrap();

    if (enabled) {
      self.skip += 1;
      init.call(handle);
      self.skip -= 1;
    }

    const args = Array.from(arguments);
    const callback = args[0];
    args[0] = function () {
      if (enabled) before.call(handle);
      callback.apply(null, arguments);
      if (enabled) after.call(handle);
    };
    nextTick.apply(process, args);
  };

  // Enable
  this.enable();
};

AsyncWrap.prototype.enable = function () {
  this.enabled = true;
  asyncWrap.enable();
};

AsyncWrap.prototype.disable = function () {
  this.enabled = false;
  asyncWrap.disable();
};

AsyncWrap.prototype.stackTrace = function (skip) {
  const limit = Error.stackTraceLimit;
  const slice = skip + this.skip;

  Error.stackTraceLimit = limit + slice;
  const stack = chain.callSite({
    extend: false,
    filter: true,
    slice: slice
  });
  Error.stackTraceLimit = limit;

  return stack;
};

module.exports = new AsyncWrap();
