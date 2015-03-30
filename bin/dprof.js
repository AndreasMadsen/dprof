#!/usr/bin/env node

var http = require('http');
var fs = require('fs');
var path = require('path');

var browserify = require('browserify');
var startpoint = require('startpoint');
var endpoint = require('endpoint');
var async = require('async');

var version = require('../package.json').version;
var server = http.createServer();

var basedir = path.resolve(__dirname, '..', 'visualizer');
var files = {
  index: path.resolve(basedir, 'index.html'),
  dump: path.resolve(basedir, 'dump.js'),
  visualizer: path.resolve(basedir, 'visualizer.js'),
  d3: path.resolve(require.resolve('d3'), '../d3.js')
};

async.parallel([
  function (done) {
    process.stdin.pipe(endpoint(done));
    process.stdin.unref();

    var noStdin = setTimeout(done, 100);
    process.stdin.once('data', function () {
      clearTimeout(noStdin);
    });
  },
  function (done) {
    server.listen(0xd0f, '127.0.0.1', done);
  }
], function (err, content) {
  if (err) throw err;
  var dprof = content[0];

  if (!dprof) {
    console.error('no file piped to stdin');
    process.exit(1);
  }

  var dumpVersion = JSON.parse(dprof).version;
  if (dumpVersion !== version) {
    console.error('dump file was made with dprof version ' + dumpVersion);
    console.error('dprof visualizer is version ' + version);
    console.error('versions much match');

    process.exit(1);
  }

  console.log('server ready on http://localhost:3343');

  var datadump = Buffer.concat([
    new Buffer('module.exports = '), content[0], new Buffer(';')
  ]);

  var b = browserify({
    'basedir': basedir,
    'debug': true,
    'noParse': [files.d3, files.dump]
  });
  b.require(startpoint(datadump), {
    'file': files.dump
  });
  b.add(files.visualizer);

  server.on('request', function (req, res) {
    if (req.url === '/visualizer.js') {
      res.setHeader('content-type', 'application/javascript');
      b.bundle().pipe(res);
    } else if (req.url === '/favicon.ico') {
      res.statusCode = 404;
      res.end();
    } else {
      res.setHeader('content-type', 'text/html');
      fs.createReadStream(files.index).pipe(res);
    }
  });
});
