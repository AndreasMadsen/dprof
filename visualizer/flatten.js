
var dump = require('./dump.js');

var ns2s = 1e-9;


function unpackTime(float) {
  // JSON.stringify converts Infinity to null, which is wired
  // because Infinity is a part of the double type. So convert
  // it back, but use a real number, aka the total process time.
  return (float === null ? dump.total : float);
}

//
// Flatten datastructure
//
function Flatten(data) {
  this.tree = new Node(null, data.root, 0);
  this.allNodes = this.nodes();

  this.total = unpackTime(data.total) * ns2s;
  this.version = data.version;
}

var idCounter = 0;

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
  this.init = unpackTime(node.init) * ns2s;
  this.before = unpackTime(node.before) * ns2s;
  this.after = unpackTime(node.after) * ns2s;
  this.total = 0;
  this.top = this.index + 0.5;

  // Children
  var totals = [this.after];
  this.children = node.children.map(function (child) {
    child = new Node(this, child, ++idCounter);
    totals.push(node.total);
    return child;
  }, this);

  // Update total, to be the max of the childrens total and the before time
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
  var nodes = [];
  (function recursive(node) {
    node.setIndex(nodes.length);
    nodes.push(node);
    if (!node.collapsed) node.children.forEach(recursive);
  })(this.tree);

  return nodes;
};

Flatten.prototype._calcDeltas = function (name, delta) {
  return this.allNodes.map(function (node) {
    return { 'time': node[name], 'delta': delta };
  });
};

Flatten.prototype.overview = function () {
  // This will give an overview of the concurrency in the process timespan.

  // Create an array of deltas
  var deltas = this._calcDeltas('init', +1)
    .concat(this._calcDeltas('after', -1))
    .sort(function (a, b) {
      return a.time - b.time;
    });

  // Now do a communicative sum of the deltas
  var concurrency = 0;
  return deltas.map(function (change) {
    concurrency += change.delta;

    return {
      'time': change.time,
      'concurrency': concurrency
    };
  });
};

module.exports = new Flatten(dump);
