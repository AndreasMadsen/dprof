'use strict';

var asyncWrap = require('./async_wrap.js');
var fs = require('fs');

var hrstart = process.hrtime();

//
// Define node class
//

function Node(name) {
  this.name = name;
  this._relativeTime = process.hrtime();
  this._init = this._getTime(hrstart);
  this._before = 0;
  this._after = 0;
  this.children = [];
}

Node.prototype.add = function (handle) {
  var node = new Node(handle.constructor.name);
  this.children.push(node);
  return node;
};

Node.prototype.before = function () {
  this._before = this._getTime(this._relativeTime);
};

Node.prototype.after = function () {
  this._after = this._getTime(this._relativeTime);
};

Node.prototype._getTime = function (relative) {
  var t = process.hrtime(relative);
  return t[0] * 1e9 + t[1];
};

Node.prototype.toJSON = function () {
  return {
    name: this.name,
    init: this._init,
    before: this._before,
    after: this._after,
    children: this.children
  };
};

Node.prototype.exit = function () {
  this._init = 0;
  this._before = 0;
  this._after = this._getTime(hrstart);
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

//
// Print result
//

process.on('exit', function () {
  root.exit();
  fs.writeFileSync('./dprof.json', JSON.stringify(root, null, 1));
});
