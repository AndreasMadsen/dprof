'use strict';

const providers = process.binding('async_wrap').Providers;
const asyncWrap = require('./async_wrap.js');
const zlib = require('zlib');
const fs = require('fs');

const version = require('./package.json').version;
const processStart = process.hrtime();

// Change the default stackTraceLimit if it haven't allready been overwritten
if (process.execArgv.indexOf('--stack_trace_limit') === -1 && Error.stackTraceLimit === 10) {
  Error.stackTraceLimit = 8;
}

//
// Define node class
//

function Site(site) {
  this.description = site.toString();
  this.filename = site.getFileName();
  this.line = site.getLineNumber();
  this.collum = site.getColumnNumber();
}

function timestamp() {
  const t = process.hrtime(processStart);
  return t[0] * 1e9 + t[1];
}

function Node(name, stack) {
  this.name = name;
  this._init = timestamp();
  this._before = [];
  this._after = [];
  this.children = [];
  this.stack = stack.map(function (site) {
    return new Site(site);
  });
}

Node.prototype.add = function (handle) {
  const node = new Node(handle.constructor.name, asyncWrap.stackTrace(3));
  this.children.push(node);
  return node;
};

Node.prototype.before = function () {
  this._before.push(timestamp());
};

Node.prototype.after = function () {
  this._after.push(timestamp());
};

Node.prototype.toJSON = function () {
  return {
    name: this.name,
    init: this._init,
    before: this._before,
    after: this._after,
    stack: this.stack,
    children: this.children
  };
};

Node.prototype.rootIntialize = function () {
  this._init = 0;
  this._before.push(0);
};

//
// Setup hooks
//

asyncWrap.setup(asyncInit, asyncBefore, asyncAfter);

const root = new Node('root', asyncWrap.stackTrace(2));
      root.rootIntialize();
let state = root;

function asyncInit(provider, parent) {
  if (provider === providers.TIMERWRAP) {
    this._dprofIgnore = true;
    return;
  }

  if (parent) {
    this._dprofState = parent._dprofState.add(this, provider, parent);
  } else {
    this._dprofState = state.add(this, provider, parent);
  }
}

function asyncBefore() {
  if (this._dprofIgnore) return;

  this._dprofState.before();
  state = this._dprofState;
}

function asyncAfter() {
  if (this._dprofIgnore) return;
  
  this._dprofState.after();
  state = root;
}

// The root job is done when process.nextTick is called
asyncWrap.disable();
process.nextTick(function () {
  root.after();
});
asyncWrap.enable();

//
// Print result
//

process.on('exit', function () {
  // even though zlib is sync, it still fires async_wrap events,
  // so disable asyncWrap just to be sure.
  asyncWrap.disable();

  const data = {
    'total': timestamp(),
    'version': version,
    'root': root
  };

  if (process.env.NODE_DPROF_DEBUG) {
    fs.writeFileSync('./dprof.json', JSON.stringify(data, null, 1));
  } else {
    fs.writeFileSync('./dprof.json.gz', zlib.gzipSync(JSON.stringify(data)));
  }
});
