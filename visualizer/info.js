'use strict';

const d3 = require('d3');
const flatten = require('./flatten.js');

function StatsLayout() {
  const info = d3.select('#info');
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
  const ms = sec * 1e3;
  const str = ms.toFixed(15);
  return str.slice(0, size);
}

StatsLayout.prototype.draw = function () {
  let stats = this._constantStats;
  let trace = '';

  if (this._node !== null) {
    stats += '\n' +
      `handle: ${this._node.name}\n` +
      `start: ${this._node.init.toFixed(8)} sec\n` +
      `wait: ${toms(this._node.before - this._node.init, 11)} ms\n` +
      `callback: ${toms(this._node.after - this._node.before, 7)} ms`;

    trace += this._node.stack.map(function (site) {
      return ' at ' + site.description;
    }).join('\n');
  }

  this._statsElem.text(stats);
  this._traceElem.text(trace);
};

module.exports = new StatsLayout();
