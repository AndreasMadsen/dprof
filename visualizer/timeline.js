/*eslint-env browser */

var d3 = require('d3');
var inherits = require('inherits');
var events = require('events');
var flatten = require('./flatten.js');

var timelineHeight = 20;

function TimelineLayout() {
  var self = this;

  this._ticksElem = d3.select('#ticks');
  this._contentElem = d3.select('#content');
  this._containerElem = d3.select('#content-box');

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

  // Set content height
  var totalHeight = flatten.nodes[flatten.nodes.length - 1].top + 0.5;
  this._contentElem.style('height', totalHeight * timelineHeight);

  // Handle mouse click
  this._contentElem.on('click', this._onclick.bind(this));

  // Handle scoll
  this._scollSet = false;
  var prevHorizontalScroll = 0;
  var scrollTimeout = null;
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

TimelineLayout.prototype.highlightNode = function (node) {
  // Toggle selected class
  this._contentElem.selectAll('g .background')
    .classed('selected', false);

  this._contentElem.select(`g:nth-child(${node.index + 1}) .background`)
    .classed('selected', true);
};

TimelineLayout.prototype._getClickedNode = function () {
  // Calculate the index of the row there was clicked on
  var rowIndex = Math.floor((
    d3.event.y - this._contentElem.node().getBoundingClientRect().top
  ) / timelineHeight);

  // Select node
  return flatten.nodes[rowIndex];
};

TimelineLayout.prototype._onclick = function () {
  this.emit('click', this._getClickedNode());
};

TimelineLayout.prototype._onhscroll = function () {
  // Calculate the domain, from the scoll position
  var elem = this._containerElem.node();
  var domain = [
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
   return `M${this._xScale(0)} ${node.top * timelineHeight}` + // Move to
          `H${this._xScale(flatten.total)}`; // Horizontal line to
};

TimelineLayout.prototype._calcBeforeLine = function (node) {
  return `M${this._xScale(node.init)} ${node.top * timelineHeight}` + // Move to
         `H${this._xScale(node.before)}`; // Horizontal line to
};

TimelineLayout.prototype._calcAfterLine = function (node) {
  return `M${this._xScale(node.before)} ${node.top * timelineHeight}` + // Move to
         `H${this._xScale(node.after)}`; // Horizontal line to
};

TimelineLayout.prototype._drawTimelines = function () {
  // Insert data dump
  var bar = this._contentElem
    .selectAll('g')
      .data(flatten.nodes, function (d) { return d.id; });
  var barEnter = bar
    .enter().append('g')
      .attr('class', 'timeline');

  // Draw background line
  barEnter.append('path')
    .attr('class', function (d, i) {
      return 'background ' + (i % 2 ? 'even' : 'odd');
    });
  bar.select('.background')
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
    .attr('class', 'before');
  bar.select('.before')
    .attr('d', this._calcBeforeLine.bind(this));

  // Draw after line
  barEnter.append('path')
    .attr('class', 'after');
  bar.select('.after')
    .attr('d', this._calcAfterLine.bind(this));
};

TimelineLayout.prototype.draw = function () {
  // Update axis
  this._xTickScale.range([10, window.innerWidth - 10]);
  this._xAxisElem.call(this._xAxis);

  // Update content range
  var timelineWidth = window.innerWidth * this._xZoom;
  this._xScale.range([10, timelineWidth - 10]);
  this._contentElem.style('width', timelineWidth);
  // When setting scrollLeft the scoll event will fire, this can
  // create an evil recursion, so ignore the next scoll event (scollSet = true).
  this._scollSet = true;
  this._containerElem.node().scrollLeft = this._xScale(this._xOffset) - 10;

  // Redraw elements
  this._drawTimelines();
};

module.exports = new TimelineLayout();
