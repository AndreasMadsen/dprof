'use strict';

var asyncWrap = require('./async_wrap.js');
var chain = require('stack-chain');
var fs = require('fs');

var version = require('./package.json').version;
var processStart = process.hrtime();

//
// Define node class
//

function Site(site) {
  this.filename = site.getFileName();
  this.line = site.getLineNumber();
  this.column = site.getColumnNumber();
}

function callSites() {
  return chain.callSite({ extend: false, filter: true, slice: 4 })
    .map(function (site) {
      return new Site(site);
    });
}

function timestamp() {
  var t = process.hrtime(processStart);
  return t[0] * 1e9 + t[1];
}

function Node(name) {
  this.name = name;
  this._init = timestamp();
  this._before = 0;
  this._after = 0;
  this.children = [];
  this.stack = callSites();
}

Node.prototype.add = function (handle) {
  var node = new Node(handle.constructor.name);
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

asyncWrap(asyncInit, asyncBefore, asyncAfter);

var root = new Node('root');
var state = root;

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
// TODO: in the current version of node nextTick doesn't invoke async_wrap,
// however in the future it will be nessarry to use an IGNORE flag, or
// disable async_wrap before this call.
process.nextTick(function () {
  root.rootFinished();
});

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
