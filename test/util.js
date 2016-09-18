'use strict';

const path = require('path');

const userPath = path.resolve(__dirname, '..');
function removeUserPath(cite) {
  const filename = cite.filename;
  if (filename.includes('/') && filename.slice(0, 9) !== 'internal/') {
    cite.filename = filename.slice(userPath.length);
  }
}

function prepareNode(node) {
  node.stack.forEach((cite) => removeUserPath(cite));
}

function prepareDump(dump) {
  prepareNode(dump.root);
  dump.nodes.forEach(prepareNode);
  return dump;
}
exports.prepareDump = prepareDump;

function simplifyNode(node) {
  return {
    name: node.name,
    uid: node.uid,
    parent: node.parent,
    init: node.init === null ? 'null' : typeof node.init,
    destroy: node.destroy === null ? 'null' : typeof node.destroy,
    before: `Array(${node.before.length})`,
    after: `Array(${node.after.length})`,
    unrefed: `${node.unrefed}`,
    stack: node.stack.map((cite) => cite.filename),
    children: node.children
  };
}

function simplifyDump(dump) {
  return {
    root: simplifyNode(dump.root),
    nodes: dump.nodes.map(simplifyNode)
  }
}
exports.simplifyDump = simplifyDump;
