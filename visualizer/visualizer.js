/*eslint-env browser */
'use strict';

const info = require('./info.js');
const overview = require('./overview.js');
const timeline = require('./timeline.js');
const flatten = require('./flatten.js');

//
// Do initial draw
//
info.draw();
overview.draw();
timeline.draw();

//
// Handle events
//
window.addEventListener('resize', function () {
  overview.draw();
  timeline.draw();
});

overview.on('brush', function (domain) {
  timeline.setDomain(domain);
  timeline.draw();
});

timeline.on('click', function (node) {
  info.setNode(node);
  info.draw();

  timeline.highlightNode(node);
});

timeline.on('dblclick', function (node) {
  node.toggleCollapsed();
  timeline.setNodes(flatten.nodes());
  timeline.draw();
});

timeline.on('hscroll', function (domain) {
  overview.setDomain(domain);
  overview.draw();
});
