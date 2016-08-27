'use strict';

const path = require('path');

const userPath = path.resolve(__dirname, '..');
function removeUserPath(cite) {
  const filename = cite.filename;
  if (filename.includes('/') && filename.slice(0, 9) !== 'internal/') {
    cite.filename = filename.slice(userPath.length);
  }
}

function prepearDump(dump) {
  (function recursive(node) {
    node.stack.forEach((cite) => removeUserPath(cite));
    node.children.forEach(recursive);
  })(dump.root);

  return dump;
}
exports.prepearDump = prepearDump;

function simplifyDump(dump) {
  return (function recursive(node) {
    return {
      name: node.name,
      init: node.init === null ? 'null' : typeof node.init,
      destroy: node.destroy === null ? 'null' : typeof node.destroy,
      before: `Array(${node.before.length})`,
      after: `Array(${node.after.length})`,
      stack: node.stack.map((cite) => cite.filename),
      children: node.children.map(recursive)
    };
  })(dump.root);
}
exports.simplifyDump = simplifyDump;
