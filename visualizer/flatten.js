
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
  this.nodes = [];
  this.total = unpackTime(data.total) * ns2s;
  this.version = data.version;
  this.insert(null, data.root);
}

function Node(parent, node, index) {
  // Meta
  this.index = index; // related to top position
  this.id = index; // d3 id, doesn't change
  this.parent = parent;

  // Info
  this.name = node.name;
  this.stack = node.stack;

  // Position
  this.init = unpackTime(node.init) * ns2s;
  this.before = unpackTime(node.before) * ns2s;
  this.after = unpackTime(node.after) * ns2s;
  this.top = this.index + 0.5;
}

Flatten.prototype.insert = function (parent, node) {
  var struct = new Node(parent, node, this.nodes.length);
  this.nodes.push(struct);
  node.children.forEach(this.insert.bind(this, struct));
};

Flatten.prototype._calcDeltas = function (name, delta) {
  return this.nodes.map(function (node) {
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
