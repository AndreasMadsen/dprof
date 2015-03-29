/*eslint-env browser */

(function (dump, d3) {
  // Get elements
  var info = d3.select('#info');
  var overview = d3.select('#overview');
  var ticks = d3.select('#ticks');
  var content = d3.select('#content');

  // Settings
  var timeScale = 1e9; // seconds
  var timeUnit = 'sec';
  var timelineHeight = 20;

  //
  // Flatten datastructure
  //
  function Flatten(data) {
    this.nodes = [];
    this.total = data.total / timeScale;
    this.version = data.version;
    this.insert(null, data.root);
  }

  function unpackFloat(float) {
    // JSON.stringify converts Infinity to null, which is wired
    // because Infinity is a part of the double type. So convert
    // it back, but use a real number, aka the total process time.
    return float === null ? dump.total : float;
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
    this.init = unpackFloat(node.init) / timeScale;
    this.before = unpackFloat(node.before) / timeScale;
    this.after = unpackFloat(node.after) / timeScale;
    this.top = this.index * timelineHeight + timelineHeight / 2;
  }

  Flatten.prototype.insert = function (parent, node) {
    var struct = new Node(parent, node, this.nodes.length);
    this.nodes.push(struct);
    node.children.forEach(this.insert.bind(this, struct));
  };

  Flatten.prototype.totalHeight = function () {
    return this.nodes[this.nodes.length - 1].top + timelineHeight / 2;
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

  var flatten = new Flatten(dump);

  //
  // Set stats
  //
  function drawState(text) {
    info.select('#stats')
      .text(`dprof version: ${flatten.version}\n` +
            `time: ${flatten.total.toFixed(8)} ${timeUnit}\n\n` +
            text);
  }
  drawState('');

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
      .tickFormat(function (d) { return (d ? xFormat(d) : '0'); });

  ticks.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, 24)')
    .call(xAxis);

  function updateTicks() {
    xScale.range([10, window.innerWidth - 10]);
    ticks.select('.x.axis').call(xAxis);
  }

  //
  // Set overview
  //
  var xOverview = d3.scale.linear()
    .range([10, window.innerWidth - 10])
    .domain([0, flatten.total]);

  var overviewNodes = flatten.overview();
  var yOverview = d3.scale.linear()
    .range([overview.node().clientHeight, 10])
    .domain([
      0,
      Math.max.apply(null, overviewNodes.map(function (change) {
        return change.concurrency;
      }))
    ]);

  // Area
  var area = d3.svg.area()
    .interpolate('step-after')
    .x(function(d) { return xOverview(d.time); })
    .y0(70)
    .y1(function(d) { return yOverview(d.concurrency); });

  var overviewPath = overview.append('path')
    .datum(overviewNodes);

  // Brush
  var brush = d3.svg.brush()
    .x(xOverview)
    .on('brush', function () {
      xScale.domain(brush.empty() ? xOverview.domain() : brush.extent());

      updateTicks();
      drawTimelines();
    });

  var gBrush = overview.append('g')
    .attr('class', 'brush')
    .call(brush);

  gBrush.selectAll('rect')
    .attr('height', overview.node().clientHeight + 1);

  // Draw
  function drawOverview() {
    xOverview.range([10, window.innerWidth - 10]);
    overviewPath.attr('d', area);
    if (!brush.empty()) brush.extent(brush.extent());
    gBrush.call(brush);
  }

  drawOverview();

  //
  // Draw timeline
  //

  // This is called when the brush is used or the window is resized
  function drawTimelines() {
    // Update content height
    content.style('height', flatten.totalHeight());

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
        return `M${xScale(0)} ${d.top}` + // Move to
               `H${xScale(flatten.total)}`; // Horizontal line to
      });

    barEnter.filter(function(d) { return d.parent; }).append('path')
      .attr('class', 'init');
    bar.select('.init')
      .attr('d', function (d) {
        // Add half after to top1. Add haft befor before top2
        return `M${xScale(d.init) - 1} ${d.parent.top + 6}` + // Move to
               `V${d.top + 3}`; // Vertical line to
      });

    barEnter.append('path')
      .attr('class', 'before');
    bar.select('.before')
      .attr('d', function (d) {
        return `M${xScale(d.init)} ${d.top}` + // Move to
               `H${xScale(d.before)}`; // Horizontal line to
      });

    barEnter.append('path')
      .attr('class', 'after');
    bar.select('.after')
      .attr('d', function (d) {
        return `M${xScale(d.before)} ${d.top}` + // Move to
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

    // Show only the last 6 callsites
    var stacktrace = node.stack.map(function (site) {
      return ' at ' + site.filename + ':' + site.line + ':' + site.column;
    }).join('\n');

    info.select('#stacktrace')
      .text('STACKTRACE:\n' + stacktrace);

    row.select('.background')
      .classed('selected', true);

    function toms(sec, size) {
      var ms = sec * timeScale / 1e6;
      var str = ms.toFixed(15);
      return str.slice(0, size);
    }

    drawState(`handle: ${node.name}\n` +
              `start: ${node.init.toFixed(8)} ${timeUnit}\n` +
              `wait: ${toms(node.before - node.init, 11)} ms\n` +
              `callback: ${toms(node.after - node.before, 7)} ms`);
  });

  //
  // handle resize
  //
  window.addEventListener('resize', function () {
    updateTicks();
    drawOverview();
    drawTimelines();
  });

})(window.datadump, window.d3);
