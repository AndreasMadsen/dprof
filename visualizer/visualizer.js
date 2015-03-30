/*eslint-env browser */

var d3 = require('d3');
var flatten = require('./flatten.js');
var overview = require('./overview.js');
var info = require('./info.js');

// Get elements
var ticks = d3.select('#ticks');
var content = d3.select('#content');

// Settings
var timelineHeight = 20;

//
// Do initial draw
//
info.draw();
overview.draw();

//
// Setup scale
//
var xScale = d3.scale.linear()
  .range([10, window.innerWidth - 10])
  .domain([0, flatten.total]);

var xFormat = xScale.tickFormat();
var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('top')
    .tickFormat(function (d) {
      if (Math.floor(d) === d) {
        return d.toString();
      } else {
        return xFormat(d);
      }
    });

ticks.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0, 24)')
  .call(xAxis);

function updateTicks() {
  xFormat = xScale.tickFormat();
  xScale.range([10, window.innerWidth - 10]);
  ticks.select('.x.axis').call(xAxis);
}

//
// Draw timeline
//

// This is called when the brush is used or the window is resized
function drawTimelines() {
  // Update content height
  var totalHeight = flatten.nodes[flatten.nodes.length - 1].top + 0.5;
  content.style('height', totalHeight * timelineHeight);

  // Insert data dump
  var bar = content
    .selectAll('g')
      .data(flatten.nodes, function (d) { return d.id; });
  var barEnter = bar
    .enter().append('g')
      .attr('class', 'timeline');

  barEnter.append('path')
    .attr('class', function (d, i) {
      return 'background ' + (i % 2 ? 'even' : 'odd');
    });
  bar.select('.background')
    .attr('d', function (d) {
      return `M${xScale(0)} ${d.top * timelineHeight}` + // Move to
             `H${xScale(flatten.total)}`; // Horizontal line to
    });

  barEnter.filter(function(d) { return d.parent; }).append('path')
    .attr('class', 'init');
  bar.select('.init')
    .attr('d', function (d) {
      // Add half after to top1. Add haft befor before top2
      return `M${xScale(d.init) - 1} ${d.parent.top * timelineHeight + 6}` + // Move to
             `V${d.top * timelineHeight + 3}`; // Vertical line to
    });

  barEnter.append('path')
    .attr('class', 'before');
  bar.select('.before')
    .attr('d', function (d) {
      return `M${xScale(d.init)} ${d.top * timelineHeight}` + // Move to
             `H${xScale(d.before)}`; // Horizontal line to
    });

  barEnter.append('path')
    .attr('class', 'after');
  bar.select('.after')
    .attr('d', function (d) {
      return `M${xScale(d.before)} ${d.top * timelineHeight}` + // Move to
             `H${xScale(d.after)}`; // Horizontal line to
    });
}
drawTimelines();

//
// Show info for timeline
//
content.on('click', function () {
  // Calculate the index of the row there was clicked on
  var rowIndex = Math.floor((
    d3.event.y - content.node().getBoundingClientRect().top
  ) / timelineHeight);

  content.selectAll('g .background')
    .classed('selected', false);

  var row = content.selectAll(`g:nth-child(${rowIndex + 1})`);
  var node = row.datum();

  row.select('.background')
    .classed('selected', true);

  info.setNode(node);
  info.draw();
});

//
// handle resize
//
window.addEventListener('resize', function () {
  updateTicks();
  overview.draw();
  drawTimelines();
});


// Update graph when the brush is used
overview.on('brush', function (domain) {
  xScale.domain(domain);
  updateTicks();
  drawTimelines();
});
