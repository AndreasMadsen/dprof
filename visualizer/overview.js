/*eslint-env browser */

var d3 = require('d3');
var inherits = require('inherits');
var events = require('events');
var flatten = require('./flatten.js');

function OverviewLayout() {
  var self = this;

  this._overviewElem = d3.select('#overview');
  this._overviewNodes = flatten.overview();

  // The x range depends on the window size, so set that in .draw
  this._xScale = d3.scale.linear()
    .domain([0, flatten.total]);

  var maxConcurrency = Math.max.apply(null,
    this._overviewNodes.map(function (change) {
      return change.concurrency;
    })
  );

  // The y scale is static, as it is fixed in the flexbox
  this._yScale = d3.scale.linear()
    .range([this._overviewElem.node().clientHeight, 10])
    .domain([0, maxConcurrency]);

  // Area
  this._area = d3.svg.area()
    .interpolate('step-after')
    .x(function(d) { return self._xScale(d.time); })
    .y0(70)
    .y1(function(d) { return self._yScale(d.concurrency); });

  this._areaElem = this._overviewElem.append('path')
    .datum(this._overviewNodes);

  // Brush
  this._brush = d3.svg.brush()
    .x(this._xScale)
    .on('brush', this._onbrush.bind(this));

  this._brushElem = this._overviewElem.append('g')
    .attr('class', 'brush')
    .call(this._brush);

  // Add +1 (really +2 including the border from .clientHeight) to hide
  // the white border on the top and bottom of the brush rect.
  this._brushElem.selectAll('rect')
    .attr('height', this._overviewElem.node().clientHeight + 1);
}
inherits(OverviewLayout, events.EventEmitter);

OverviewLayout.prototype._onbrush = function () {
  // get new brush domain
  var domain = this._xScale.domain();
  if (!this._brush.empty()) domain = this._brush.extent();

  this.emit('brush', domain);
};

OverviewLayout.prototype.draw = function () {
  // Update the range if the window size changed
  this._xScale.range([10, window.innerWidth - 10]);
  // Hack to recalculate brush range (not domain), this is important if
  // the window size change
  if (!this._brush.empty()) this._brush.extent(this._brush.extent());

  // Redraw elements
  this._areaElem.attr('d', this._area);
  this._brushElem.call(this._brush);
};

module.exports = new OverviewLayout();
