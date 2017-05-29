'use strict';

const dump = require('./dump.js');

const ns2s = 1e-9;

//
// Flatten datastructure
//
function Flatten(data) {
  const root = new Node(data.root);

  // Construct map of all nodes
  const nodes = new Map([[1, root]]);
  for (const node of data.nodes) {
    nodes.set(node.uid, new Node(node));
  }

  // Cross reference children and parents
  for (const node of nodes.values()) {
    node.parent = node.parent === null ? null : nodes.get(node.parent);
    node.children = node.children.map((uid) => nodes.get(uid));
  }

  // To calculate the node.total value all children must be processed,
  // so walk backward from leafs to root.
  // TODO: Because the nodecore uid are created in an incrementing order
  // one could construct post-order walkthough of the DAG by simply looping
  // from `max(uids)` to 0. However `async_hook` (not nodecore) extends
  // the uids with negative values, so that is not possibol right now.
  // In the future when only nodecore is used, this can be simplified.
  backwardDAGWalk(nodes, (node) => node.updateTotal());

  this.tree = root;
  this.allNodes = this.nodes();

  this.total = data.total * ns2s;
  this.version = data.version;
}

function backwardDAGWalk(nodes, handler) {
  // Create a queue of all nodes whos children have been processed,
  // and create a counter for all other nodes counting how many children
  // that needs to be processed
  const childCounter = new Map();
  const nodeQueue = new Set();

  // Initialize the counter and queue
  for (const node of nodes.values()) {
    if (node.children.length === 0) {
      nodeQueue.add(node);
    } else {
      childCounter.set(node.uid, node.children.length);
    }
  }

  // Process nodes whos children have been processed, until there are no
  // more nodes.
  for (const node of nodeQueue.values()) {
    handler(node);

    // The root node doesn't have any children, so skip the backward walk
    if (node.parent === null) continue;

    // the number of children that has not been processed
    const missingChildren = childCounter.get(node.parent.uid) - 1;

    if (missingChildren === 0) {
      // parent is ready to be processed, so add to queue
      nodeQueue.add(node.parent);
      childCounter.delete(node.parent.uid);
    } else {
      childCounter.set(node.parent.uid, missingChildren);
    }
  }
}

function Node(node) {
  // Meta
  this.uid = node.uid; // d3 id, doesn't change
  this.parent = node.parent; // will be replaced by a Node reference
  this.collapsed = false;

  // Info
  this.name = node.name;
  this.uid = node.uid;
  this.stack = node.stack;
  this.initRef = node.initRef;

  // Convert init time
  this.init = node.init * ns2s;

  // If the node wasn't destroyed set the destroy time to the total lifetime
  this.destroy = (node.destroy === null) ? dump.total * ns2s : node.destroy * ns2s;

  // Convert before and after time
  this.before = node.before.map((v) => v * ns2s);
  this.after = node.after.map((v) => v * ns2s);
  this.unref = node.unref.map((v) => v * ns2s);
  this.ref = node.ref.map((v) => v * ns2s);

  // Compile a list of state changes
  const changes = [].concat(
    this.before.map((time) => new StateChange(time, 'sync', true)),
    this.after.map((time) => new StateChange(time, 'sync', false)),
    this.unref.map((time) => new StateChange(time, 'ref', false)),
    this.ref.map((time) => new StateChange(time, 'ref', true))
  );
  // Sort the state in order of time
  // TODO: use merge instead of sort for O(n) performance over O(n log(n))
  changes.sort((a, b) => a.time - b.time);

  // Compile a list of states
  const states = new States(this.init, false, this.initRef);
  states.changes(changes);
  states.end(this.destroy);
  this.states = states.list;

  // Total time, including all children will be updated.
  this.total = 0;

  // top position, will be updated
  this.index = NaN;
  this.top = NaN;

   // will be replaced by a list of Node references
  this.children = node.children;
}

function StateChange(time, type, update) {
  this.time = time;
  this.type = type;
  this.update = update;
}

function State(start, sync, ref) {
  this.start = start;
  this.end = 0;
  this.sync = sync;
  this.ref = ref;
  this.type = (this.sync ? 'callback' : 'wait') + ' ' + (this.ref ? 'ref' : 'unref');
}

function States(time, sync, ref) {
  this.list = [new State(time, sync, ref)];
  this.last = this.list[0];
}

States.prototype.add = function (time, sync, ref) {
  this.last.end = time;
  this.last = new State(time, sync, ref)
  this.list.push(this.last);
};

States.prototype.end = function (time) {
  this.last.end = time;
};

States.prototype.changes = function (changes) {
  for (const change of changes) {
    if (change.type === 'sync') {
      this.add(change.time, change.update, this.last.ref);
    } else if (change.type === 'ref') {
      this.add(change.time, this.last.sync, change.update);
    }
  }
};

Node.prototype.updateTotal = function () {
  // Update total, to be the max of the childrens total and the after time
  // of this node.
  this.total = this.destroy;
  for (const child of this.children) {
    this.total = Math.max(this.total, child.total);
  }
};

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

  // This is implemented as an non-recursive preorder walker, to prevent
  // stack overflow.
  const stack = [this.tree];
  while (stack.length > 0) {
    const node = stack.pop();
    node.setIndex(nodes.length);
    nodes.push(node);
    if (!node.collapsed) stack.push(...node.children.slice(0).reverse());
  }

  return nodes;
};

Flatten.prototype._calcInitDeltas = function () {
  return this.allNodes.map(function (node) {
    return { 'time': node.init, 'delta': +1 };
  });
};

Flatten.prototype._calcAfterDeltas = function () {
  return this.allNodes.map(function (node) {
    return { 'time': node.destroy, 'delta': -1 };
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
