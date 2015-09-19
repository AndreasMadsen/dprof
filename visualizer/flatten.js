'use strict';

const dump = require('./dump.js');

const ns2s = 1e-9;

//
// Flatten datastructure
//
function Flatten(data) {
  this.tree = new Node(null, data.root, 0);
  this.allNodes = this.nodes();

  this.total = data.total * ns2s;
  this.version = data.version;
}

let idCounter = 0;

function Node(parent, node, index) {
  // Meta
  this.index = idCounter; // related to top position
  this.id = index; // d3 id, doesn't change
  this.parent = parent;
  this.collapsed = false;

  // Info
  this.name = node.name;
  this.stack = node.stack;

  // Position
  this.init = node.init * ns2s;
  this.before = [];
  this.after = [];

  // If no before event was fired, set it to the process lifespan
  if (node.before.length === 0) {
    this.before = [dump.total * ns2s];
    this.after = [dump.total * ns2s];
  } else {
    this.before = node.before.map((v) => v * ns2s);
    this.after = node.after.map((v) => v * ns2s);
  }

  this.end = Math.max.apply(null, this.after);

  this.total = 0;
  this.top = this.index + 0.5;

  // Create children note and maintain an array containing the total lifespan
  // for each child.
  const totals = [this.end];
  this.children = node.children.map(function (child) {
    child = new Node(this, child, ++idCounter);
    totals.push(child.total);
    return child;
  }, this);

  // Update total, to be the max of the childrens total and the after time
  // of this node.
  this.total = Math.max.apply(null, totals);
}

Node.prototype.setIndex = function (index) {
  this.index = index;
  this.top = index + 0.5;
};

Node.prototype.toggleCollapsed = function () {
  this.collapsed = !this.collapsed;
};

Flatten.prototype.nodes = function () {
  // Flatten out the nodes, removed children of collapsed nodes and calculate
  // index.
  const nodes = [];
  (function recursive(node) {
    node.setIndex(nodes.length);
    nodes.push(node);
    if (!node.collapsed) node.children.forEach(recursive);
  })(this.tree);

  return nodes;
};

Flatten.prototype._calcInitDeltas = function () {
  return this.allNodes.map(function (node) {
    return { 'time': node.init, 'delta': +1 };
  });
};

Flatten.prototype._calcAfterDeltas = function () {
  return this.allNodes.map(function (node) {
    return { 'time': node.end, 'delta': -1 };
  });
};

Flatten.prototype.overview = function () {
  // This will give an overview of the concurrency in the process timespan.

  // Create an array of deltas
  const deltas = this._calcInitDeltas()
    .concat(this._calcAfterDeltas())
    .sort(function (a, b) {
      return a.time - b.time;
    });

  // Now do a communicative sum of the deltas
  let concurrency = 0;
  return deltas.map(function (change) {
    concurrency += change.delta;

    return {
      'time': change.time,
      'concurrency': concurrency
    };
  });
};

module.exports = new Flatten(dump);
