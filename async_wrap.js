'use strict';

var asyncWrap = process.binding('async_wrap');
var chain = require('stack-chain');

Error.stackTraceLimit = Infinity;

var kCallInitHook = 0;

function AsyncWrap() {
  this.enabled = false;
  this.skip = 0;
}

function NextTickWrap() {}

AsyncWrap.prototype.setup = function (init, before, after) {
  asyncWrap.setupHooks(init, before, after);

  // Overwrite next tick
  var self = this;
  var nextTick = process.nextTick;
  process.nextTick = function () {
    var enabled = self.enabled;
    var handle = new NextTickWrap();

    if (enabled) {
      self.skip += 1;
      init.call(handle);
      self.skip -= 1;
    }

    var args = Array.from(arguments);
    var callback = args[0];
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
  var limit = Error.stackTraceLimit;
  var slice = skip + this.skip;

  Error.stackTraceLimit = 7 + slice;
  var stack = chain.callSite({
    extend: false,
    filter: true,
    slice: skip + this.skip
  });
  Error.stackTraceLimit = limit;

  return stack;
};

module.exports = new AsyncWrap();
