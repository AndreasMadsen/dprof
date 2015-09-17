'use strict';

function simplifyDump(dump) {
  return (function recursive(node) {
    return {
      name: node.name,
      stack: node.stack.map((cite) => cite.filename),
      children: node.children.map(recursive)
    };
  })(dump.root);
}
exports.simplifyDump = simplifyDump;
