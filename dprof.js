'use strict';

const asyncWrap = require('./async_wrap.js');
const fs = require('fs');

const version = require('./package.json').version;
const processStart = process.hrtime();

//
// Define node class
//

function Site(site) {
  this.filename = site.getFileName();
  this.line = site.getLineNumber();
  this.column = site.getColumnNumber();
}

function timestamp() {
  const t = process.hrtime(processStart);
  return t[0] * 1e9 + t[1];
}

function Node(name, stack) {
  this.name = name;
  this._init = timestamp();
  this._before = Infinity;
  this._after = Infinity;
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
  this._before = timestamp();
};

Node.prototype.after = function () {
  this._after = timestamp();
};

Node.prototype.toJSON = function () {
  return {
    name: this.name,
    init: this._init,
    before: this._before,
    after: this._after,
    children: this.children,
    stack: this.stack
  };
};

Node.prototype.rootFinished = function () {
  this._init = 0;
  this._before = 0;
  this.after();
};

//
// Setup hooks
//

asyncWrap.setup(asyncInit, asyncBefore, asyncAfter);

const root = new Node('root', asyncWrap.stackTrace(2));
let state = root;

function asyncInit() {
  this._dprofState = state.add(this);
}

function asyncBefore() {
  this._dprofState.before();
  state = this._dprofState;
}

function asyncAfter() {
  this._dprofState.after();
  state = root;
}

// The root job is done when process.nextTick is called
asyncWrap.disable();
process.nextTick(function () {
  root.rootFinished();
});
asyncWrap.enable();

//
// Print result
//

process.on('exit', function () {
  fs.writeFileSync('./dprof.json', JSON.stringify({
    'total': timestamp(),
    'version': version,
    'root': root
  }, null, 1));
});
