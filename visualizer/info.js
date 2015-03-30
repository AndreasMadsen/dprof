
var d3 = require('d3');
var flatten = require('./flatten');

function StatsLayout() {
  var info = d3.select('#info');
  this._statsElem = info.select('#stats');
  this._traceElem = info.select('#stacktrace');
  this._node = null;

  // dprof version and time isn't going to change so build that string here.
  this._constantStats = `dprof version: ${flatten.version}\n` +
                        `time: ${flatten.total.toFixed(8)} sec\n`;
}

StatsLayout.prototype.setNode = function (node) {
  this._node = node;
};

function toms(sec, size) {
  var ms = sec * 1e3;
  var str = ms.toFixed(15);
  return str.slice(0, size);
}

StatsLayout.prototype.draw = function () {
  var stats = this._constantStats;
  var trace = '';

  if (this._node !== null) {
    stats += '\n' +
      `handle: ${this._node.name}\n` +
      `start: ${this._node.init.toFixed(8)} sec\n` +
      `wait: ${toms(this._node.before - this._node.init, 11)} ms\n` +
      `callback: ${toms(this._node.after - this._node.before, 7)} ms`;

    trace += 'STACKTRACE:\n' +
      this._node.stack.map(function (site) {
        return ' at ' + site.filename + ':' + site.line + ':' + site.column;
      }).join('\n');
  }

  this._statsElem.text(stats);
  this._traceElem.text(trace);
};

module.exports = new StatsLayout();
