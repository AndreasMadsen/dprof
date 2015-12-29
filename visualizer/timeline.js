/*eslint-env browser */
'use strict';

const d3 = require('d3');
const inherits = require('inherits');
const events = require('events');
const flatten = require('./flatten.js');

const timelineHeight = 20;

function TimelineLayout() {
  const self = this;

  this._ticksElem = d3.select('#ticks');
  this._contentElem = d3.select('#content');
  this._containerElem = d3.select('#content-box');

  // Current node list
  this._nodes = flatten.nodes();

  // Define scale for timeline
  this._xZoom = 1;
  this._xOffset = 0;
  this._xScale = d3.scale.linear()
    .domain([0, flatten.total]);

  // The x range depends on the window size, so set that in .draw
  this._xTickScale = d3.scale.linear()
    .domain([0, flatten.total]);
  this._xTickFormat = this._xTickScale.tickFormat();

  this._xAxis = d3.svg.axis()
    .scale(this._xTickScale)
    .orient('top')
    .tickFormat(function (d) {
      if (Math.floor(d) === d) {
        return d.toString();
      } else {
        return self._xTickFormat(d);
      }
    });

  this._xAxisElem = this._ticksElem.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, 24)');

  // Handle mouse click
  this._contentElem.on('click', this._onclick.bind(this));
  this._contentElem.on('dblclick', this._ondblclick.bind(this));

  // Handle scoll
  this._scollSet = false;
  let prevHorizontalScroll = 0;
  let scrollTimeout = null;
  this._containerElem.on('scroll', function onscroll() {
    if (prevHorizontalScroll !== this.scrollLeft && !self._scollSet) {
      prevHorizontalScroll = this.scrollLeft;
      clearTimeout(scrollTimeout);
      self._onhscroll();
      scrollTimeout = setTimeout(onscroll.bind(this), 50);
    } else if (self._scollSet) {
      self._scollSet = false;
    }
  });
}
inherits(TimelineLayout, events.EventEmitter);

TimelineLayout.prototype.setDomain = function (domain) {
  // Update tick domain and refit the tick format function
  this._xTickScale.domain(domain);
  this._xTickFormat = this._xTickScale.tickFormat();

  // Calculate zoom factor
  this._xZoom = flatten.total / (domain[1] - domain[0]);
  this._xOffset = domain[0];
};

TimelineLayout.prototype.setNodes = function (nodes) {
  this._nodes = nodes;
};

TimelineLayout.prototype.highlightNode = function (node) {
  // Toggle selected class
  this._contentElem.selectAll('g .background')
    .classed('selected', false);

  this._contentElem.select(`g:nth-child(${node.index + 1}) .background`)
    .classed('selected', true);
};

TimelineLayout.prototype._getClickedNode = function () {
  // Calculate the index of the row there was clicked on
  const rowIndex = Math.floor((
    d3.event.y - this._contentElem.node().getBoundingClientRect().top
  ) / timelineHeight);

  // Select node
  return this._contentElem.select(`g:nth-child(${rowIndex + 1})`).datum();
};

TimelineLayout.prototype._onclick = function () {
  this.emit('click', this._getClickedNode());
};

TimelineLayout.prototype._ondblclick = function () {
  this.emit('dblclick', this._getClickedNode());
};

TimelineLayout.prototype._onhscroll = function () {
  // Calculate the domain, from the scoll position
  const elem = this._containerElem.node();
  const domain = [
    this._xScale.invert(elem.scrollLeft + 10),
    this._xScale.invert(elem.scrollLeft + window.innerWidth - 10)
  ];

  // Do a fast update and redraw of the ticks
  this._xTickScale.domain(domain);
  this._xAxisElem.call(this._xAxis);

  // Notify that the view area have changed on the horizontal axis
  this.emit('hscroll', domain);
};

TimelineLayout.prototype._calcInitLine = function (node) {
  //  x: The line is 2px wide, so move one to the left such that the hole
  //     line is visble.
  // y1: The line start from an init box (12px high), start the line just after
  //     that init box.
  // y2: The line ends in a before box (6px high), end the line just after
  //     that before line.
  return `M${this._xScale(node.init) - 1} ` +
         `${node.parent.top * timelineHeight + 6} ` + // Move to
         `V${node.top * timelineHeight + 3}`; // Vertical line to
};

TimelineLayout.prototype._calcBackgroundLine = function (node) {
  return `M${this._xScale(0)} ${node.top * timelineHeight} ` + // Move to
         `H${this._xScale(flatten.total)}`; // Horizontal line to
};

TimelineLayout.prototype._calcWaitLine = function (node) {
  const path = [];

  // Between (init - before) and (after - before)
  let prevTime = node.init;
  for (let i = 0; i < node.before.length; i++) {
    path.push(`M${this._xScale(prevTime)} ${node.top * timelineHeight} ` + // Move to
              `H${this._xScale(node.before[i])}`); // Horizontal line to
    prevTime = node.after[i];
  }

  // Between (init/after - destroy)
  path.push(`M${this._xScale(prevTime)} ${node.top * timelineHeight} ` + // Move to
            `H${this._xScale(node.destroy)}`); // Horizontal line to

  return path.join(' ');
};

TimelineLayout.prototype._calcCallbackLine = function (node) {
  const path = [];

  // Between (before - after)
  for (let i = 0; i < node.before.length; i++) {
    path.push(`M${this._xScale(node.before[i])} ${node.top * timelineHeight} ` + // Move to
              `H${this._xScale(node.after[i])}`); // Horizontal line to
  }

  return path.join(' ');
};

TimelineLayout.prototype._calcTotalLine = function (node) {
  if (!node.collapsed) return '';

  return `M${this._xScale(node.destroy)} ${node.top * timelineHeight} ` + // Move to
         `H${this._xScale(node.total)}`; // Horizontal line to
};

TimelineLayout.prototype._drawTimelines = function () {
  // Setup d3 selection
  const bar = this._contentElem
    .selectAll('g')
      .data(this._nodes, function (d) { return d.id; });

  //
  // Remove groups
  bar.exit().remove();

  //
  // Insert groups
  const barEnter = bar
    .enter().append('g')
      .attr('class', 'timeline');

  // Draw background line
  barEnter.append('path')
    .attr('class', function (d, i) {
      return 'background ' + (i % 2 ? 'even' : 'odd');
    });
  bar.select('.background')
    .classed('even', function (d, i) { return i % 2 === 0; })
    .classed('odd', function (d, i) { return i % 2 === 1; })
    .attr('d', this._calcBackgroundLine.bind(this));

  // Draw init line
  // The first timeline is the process start and thus have no init line.
  // Filter that away.
  barEnter.filter(function(d, i) { return i !== 0; }).append('path')
    .attr('class', 'init');
  bar.select('.init')
    .attr('d', this._calcInitLine.bind(this));

  // Draw before line
  barEnter.append('path')
    .attr('class', 'wait');
  bar.select('.wait')
    .attr('d', this._calcWaitLine.bind(this));

  // Draw after line
  barEnter.append('path')
    .attr('class', 'callback');
  bar.select('.callback')
    .attr('d', this._calcCallbackLine.bind(this));

  // Draw after line
  barEnter.append('path')
    .attr('class', 'total');
  bar.select('.total')
    .attr('d', this._calcTotalLine.bind(this));

  //
  // Order elements
  bar.order();
};

TimelineLayout.prototype.draw = function () {
  // Update axis
  this._xTickScale.range([10, window.innerWidth - 10]);
  this._xAxisElem.call(this._xAxis);

  // Update content range
  const rangeWidth = window.innerWidth - 20;
  const svgWidth = rangeWidth * this._xZoom + 20;
  this._xScale.range([10, svgWidth - 10]);
  this._contentElem.style('width', svgWidth);
  // When setting scrollLeft the scoll event will fire, this can
  // create an evil recursion, so ignore the next scoll event (scollSet = true).
  this._scollSet = true;
  this._containerElem.node().scrollLeft = this._xScale(this._xOffset) - 10;

  // Set content height
  const totalHeight = this._nodes[this._nodes.length - 1].top + 0.5;
  this._contentElem.style('height', totalHeight * timelineHeight);

  // Redraw elements
  this._drawTimelines();
};

module.exports = new TimelineLayout();
