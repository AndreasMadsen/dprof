'use strict';

var asyncWrap = require('./async_wrap.js');
var chain = require('stack-chain');
var fs = require('fs');

var hrstart = process.hrtime();

//
// Define node class
//

function Site(site) {
  this.filename = site.getFileName();
  this.line = site.getLineNumber();
  this.column = site.getColumnNumber();
}

function nstime(relative) {
  var t = process.hrtime(relative);
  return t[0] * 1e9 + t[1];
}

function callSites() {
  return chain.callSite({ extend: false, filter: true, slice: 2 })
    .map(function (site) {
      return new Site(site);
    });
}

function Node(name) {
  this.name = name;
  this._relativeTime = process.hrtime();
  this._init = nstime(hrstart);
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
  this._before = nstime(this._relativeTime);
};

Node.prototype.after = function () {
  this._after = nstime(this._relativeTime);
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
  this._after = nstime(hrstart);
};

//
// Setup hooks
//

asyncWrap(asyncInit, asyncBefore, asyncAfter);

var root = new Node('root');
var state = root;

function asyncInit() {
  this._state = state.add(this);
}

function asyncBefore() {
  this._state.before();
  state = this._state;
}

function asyncAfter() {
  this._state.after();
  state = root;
}

// The root job is done when process.nextTick is called
process.nextTick(function () {
  root.rootFinished();
});

//
// Print result
//

process.on('exit', function () {
  fs.writeFileSync('./dprof.json', JSON.stringify({
    'total': nstime(hrstart),
    'root': root
  }, null, 1));
});
