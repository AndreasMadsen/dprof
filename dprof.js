'use strict';

const asyncHook = require('async_hooks');

const chain = require('stack-chain');
const zlib = require('zlib');
const fs = require('fs');

const version = require('./package.json').version;
const processStart = process.hrtime();

// Change the default stackTraceLimit if it haven't allready been overwritten
if (process.execArgv.indexOf('--stack_trace_limit') === -1 && Error.stackTraceLimit === 10) {
  Error.stackTraceLimit = 8;
}

//
// Setup hooks
//
const hooks = asyncHook.createHook({
  init: asyncInit,
  before: asyncBefore,
  after: asyncAfter,
  destroy: asyncDestroy
});

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

function Node(uid, handle, name, stack, parent) {
  const self = this;
  this.parent = parent === null ? null : parent.uid;
  this.name = name;
  this.uid = uid;
  this._init = timestamp();
  this._destroy = Infinity;
  this._before = [];
  this._after = [];
  this._unref = [];
  this._ref = [];
  this._initRef = !(
    this.name === 'TTY' || this.name === 'Pipe' || handle._timerUnref === true
  );
  this.children = [];
  this.stack = stack.map(function (site) {
    return new Site(site);
  });

  if (typeof handle.unref === 'function') {
    const unref = handle.unref;
    handle.unref = function () {
      const ret = unref.call(handle);
      self._unref.push(timestamp());
      return ret;
    };
  }
  if (typeof handle.ref === 'function') {
    const ref = handle.ref;
    handle.ref = function () {
      const ret = ref.call(handle);
      self._ref.push(timestamp());
      return ret;
    };
  }
}

function getCallSites(skip) {
  const limit = Error.stackTraceLimit;

  Error.stackTraceLimit = limit + skip;
  const stack = chain.callSite({
    extend: false,
    filter: true,
    slice: skip
  });
  Error.stackTraceLimit = limit;

  return stack;
}

Node.prototype.add = function (uid, handle, type) {
  const node = new Node(uid, handle, type, getCallSites(3), this);
  this.children.push(uid);
  return node;
};

Node.prototype.before = function () {
  this._before.push(timestamp());
};

Node.prototype.after = function () {
  this._after.push(timestamp());
};

Node.prototype.destroy = function () {
  this._destroy = timestamp();
};

Node.prototype.toJSON = function () {
  return {
    name: this.name,
    parent: this.parent,
    uid: this.uid,
    init: this._init,
    destroy: this._destroy,
    before: this._before,
    after: this._after,
    unref: this._unref,
    ref: this._ref,
    initRef: this._initRef,
    stack: this.stack,
    children: this.children
  };
};

Node.prototype.rootIntialize = function () {
  this._init = 0;
  this._before.push(0);
};

const root = new Node(
  1,
  {},
  'root',
  getCallSites(2),
  null
);
root.rootIntialize();

const nodes = new Map();

// Setup the root: fake hook events
hooks.disable();
process.nextTick(function () {
  root.after();
  root.destroy();
});
hooks.enable();


function asyncInit(uid, type, triggerId, handle) {
  // get initializing state
  let state;
  if (triggerId === 0 || triggerId === 1) {
    // 1 is always root
    // 0 is not root, but unknown. Use root for now.
    state = root;
  } else {
    state = nodes.get(triggerId);
  }

  // add new state node
  nodes.set(uid, state.add(uid, handle, type));
}

function asyncBefore(uid) {
  // Ignore our nextTick for the root duration
  if (!nodes.has(uid)) return;

  const state = nodes.get(uid);

  state.before();
}

function asyncAfter(uid) {
  // Ignore our nextTick for the root duration
  if (!nodes.has(uid)) return;

  const state = nodes.get(uid);

  state.after();
}

function asyncDestroy(uid) {
  // Ignore our nextTick for the root duration
  if (!nodes.has(uid)) return;

  const state = nodes.get(uid);

  state.destroy();
}

//
// Print result
//

if (process.argv.indexOf('--dprof-no-sigint') === -1 &&
    !process.env.hasOwnProperty('DPROF_NO_SIGINT')) {
  process.on('SIGINT', function handleSIGINT() {
    writeDataFile();

    // Trigger node's default handler
    process.removeAllListeners('SIGINT');
    process.kill(process.pid, 'SIGINT');
  });
}

process.on('exit', writeDataFile);

function writeDataFile() {
  // even though zlib is sync, it still fires async_hook events,
  // so disable the hooks just to be sure.
  hooks.disable();

  const data = {
    'total': timestamp(),
    'version': version,
    'root': root,
    'nodes': Array.from(nodes.values())
  };

  if (process.env.NODE_DPROF_DEBUG) {
    fs.writeFileSync('./dprof.json', JSON.stringify(data, null, 1));
  } else {
    fs.writeFileSync('./dprof.json.gz', zlib.gzipSync(JSON.stringify(data)));
  }
}
