
var d3 = require('d3');
var flatten = require('./flatten');

function StatsLayout() {
  this._elem = d3.select('#info #stats');
  this._node = null;

  // dprof version and time isn't going to change so build that string here.
  this._constant = `dprof version: ${flatten.version}\n` +
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
  var content = this._constant;

  if (this._node !== null) {
    content += '\n' +
      `handle: ${this._node.name}\n` +
      `start: ${this._node.init.toFixed(8)} sec\n` +
      `wait: ${toms(this._node.before - this._node.init, 11)} ms\n` +
      `callback: ${toms(this._node.after - this._node.before, 7)} ms`;
  }

  this._elem.text(content);
};

module.exports = new StatsLayout();
