'use strict';

const async_hooks = require('async_hooks');
// process._rawDebug('>>> currentId:', async_hooks.currentId());

// const preHook = async_hooks.createHook({
//   init (uid) {
//     process._rawDebug('preInit', uid, (new Error()).stack.substring(6))
//   },
//   before(){},
//   after(){},
//   destroy(){}
// })
// preHook.enable();

const chain = require('stack-chain');
const zlib = require('zlib');
const fs = require('fs');

const version = require('./package.json').version;
const processStart = process.hrtime();

// Change the default stackTraceLimit if it haven't allready been overwritten
if (process.execArgv.indexOf('--stack_trace_limit') === -1 && Error.stackTraceLimit === 10) {
  Error.stackTraceLimit = 8;
}

// preHook.disable()
//
// Setup hooks
//
const asyncHook = async_hooks.createHook({
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
  this.parent = parent === null ? null : parent.uid;
  this.name = name;
  this.uid = uid;
  this._init = timestamp();
  this._destroy = Infinity;
  this._before = [];
  this._after = [];
  this._unref = [];
  this._ref = [];
  this.unrefed = this.name === 'TTYWRAP' || this.name === 'PIPEWRAP' || handle._timerUnref === true;
  this.children = [];
  this.stack = stack.map(function (site) {
    return new Site(site);
  });

  if (typeof handle.unref === 'function') {
    const unref = handle.unref;
    handle.unref = () => {
      const ret = unref.call(handle);
      this._unref.push(timestamp())
      return ret;
    }
  }
  if (typeof handle.ref === 'function') {
    const ref = handle.ref;
    handle.ref = () => {
      const ret = ref.call(handle);
      this._ref.push(timestamp())
      return ret;
    }
  }

  // asyncHook.disable();
  // if (!this.unrefed && typeof handle.hasRef === 'function') {
  //   process.nextTick(() => {
  //     this.unrefed = !handle.hasRef();
  //   });
  // }
  // asyncHook.enable();
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
    unrefed: this.unrefed,
    stack: this.stack,
    children: this.children
  };
};

Node.prototype.rootIntialize = function () {
  this._init = 0;
  this._before.push(0);
};

const root = new Node(
  0,
  {},
  'root',
  getCallSites(2),
  null
);
root.rootIntialize();

const nodes = new Map();
let currState = root;

function asyncInit(uid, type, parentUid, handle) {
  // process._rawDebug('init:' + uid, parentUid);

  // Ignore our nextTick for the root duration
  // TODO(Fishrock123): detect this better.
  if (uid === 2) return

  // if (type === 'Timeout') {
  //   process._rawDebug('Timeout', uid, handle._idleTimeout)
  // }

  // get parent state
  // root is always UID 1
  const state = (parentUid === 1 ? currState : nodes.get(parentUid));

  // add new state node
  // process._rawDebug('>>> UID:', uid)
  nodes.set(uid, state.add(uid, handle, type));
}

function asyncBefore(uid) {
  // Ignore our nextTick for the root duration
  // TODO(Fishrock123): detect this better.
  if (uid === 2) return

  const state = nodes.get(uid);

  state.before();
  currState = state;
}

function asyncAfter(uid) {
  // Ignore our nextTick for the root duration
  // TODO(Fishrock123): detect this better.
  if (uid === 2) return

  const state = nodes.get(uid);

  state.after();
  currState = root;
}

function asyncDestroy(uid) {
  // Ignore our nextTick for the root duration
  // TODO(Fishrock123): detect this better.
  if (uid === 2) return

  // process._rawDebug('destroy:' + uid)
  const state = nodes.get(uid);
  // if (state === undefined) return

  // if (!state) {
  //   process._rawDebug('>>>>', uid)
  // }

  state.destroy();
}

// The root job is done when process.nextTick is called
asyncHook.disable();
process.nextTick(function () {
  root.after();
  root.destroy();
});
asyncHook.enable();

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
  // even though zlib is sync, it still fires async_wrap events,
  // so disable asyncWrap just to be sure.
  asyncHook.disable();

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
