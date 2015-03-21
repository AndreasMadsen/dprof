#!/bin/env node

var endpoint = require('endpoint');
var extend = require('util-extend');

process.stdin.pipe(endpoint(function (err, dprof) {
  if (err) throw err;
  dprof = JSON.parse(dprof);

  var content = new Node(dprof.root, dprof.total, 1, new State(), new Root());

  var svg = new Element('svg').attr({ xmlns: 'http://www.w3.org/2000/svg', width: 1000 });

  process.stdout.write(svg.start() + '\n');
  process.stdout.write(content.stringify() + '\n');
  process.stdout.write(svg.end());
}));

function Root() {
  this.top = 0;
}

function State() {
  this.y = 0;
}

function Node(node, total, depth, state, parent) {
  this.name = node.name;
  this.init = Math.floor(node.init / total * 1000);
  this.before = Math.floor((node.init + node.before) / total * 1000);
  this.after = Math.floor((node.init + node.after) / total * 1000);
  this.stack = node.stack;

  this.depth = depth;
  this.state = state;
  this.parent = parent;
  this.top = state.y;

  this.elems = [];
  this.elems.push(new Element('rect').attr({
    x: this.init,
    y: this.top,
    width: this.before - this.init,
    height: 20,
    fill: 'SteelBlue',
    style: 'shape-rendering: crispEdges'
  }));
  this.elems.push(new Element('rect').attr({
    x: this.before,
    y: this.top,
    width: this.after - this.before,
    height: 20,
    fill: 'IndianRed',
    style: 'shape-rendering: crispEdges'
  }));
  this.elems.push(new Element('line').attr({
    x1: this.init,
    y1: this.parent.top + 20,
    x2: this.init,
    y2: this.top + 20,
    style: 'stroke: #000; stroke-width: 2px'
  }));

  this.state.y += 20;
  this.children = node.children.map(function (child) {
    return new Node(child, total, depth + 1, state, this);
  }, this);
}

Node.prototype._indent = function () {
  var s = '';
  for (var i = 0; i < this.depth; i++) {
    s += '  ';
  }
  return s;
};

Node.prototype.stringify = function () {
  var content = [];
  this.elems.forEach(function (elem) {
    content.push(this._indent() + elem.singleton());
  }, this);
  this.children.forEach(function (child) {
    content.push(child.stringify());
  }, this);

  return content.join('\n');
};

function Element(name) {
  this._name = name;
  this._attr = {};
}

Element.prototype.attr = function (attr) {
  extend(this._attr, attr);
  return this;
};

Element.prototype.start = function () {
  var start = '<' + this._name;
  Object.keys(this._attr).forEach(function (k) {
    start += ' ' + k + '="' + this._attr[k] + '"';
  }, this);
  start += '>';
  return start;
};

Element.prototype.end = function () {
  return '</' + this._name + '>';
};

Element.prototype.singleton = function () {
  return this.start() + this.end();
};
