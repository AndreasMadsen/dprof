#!/usr/bin/env node

var http = require('http');
var fs = require('fs');
var path = require('path');

var endpoint = require('endpoint');
var async = require('async');

var version = require('../package.json').version;
var server = http.createServer();

var files = {
  index: path.resolve(__dirname, '..', 'visualizer', 'index.html'),
  visualizer: path.resolve(__dirname, '..', 'visualizer', 'visualizer.js'),
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
    new Buffer('window.datadump = '), content[0], new Buffer(';')
  ]);

  server.on('request', function (req, res) {
    if (req.url === '/dump.js') {
      res.setHeader('content-type', 'application/javascript');
      res.end(datadump);
    } else if (req.url === '/visualizer.js') {
      res.setHeader('content-type', 'application/javascript');
      fs.createReadStream(files.visualizer).pipe(res);
    } else if (req.url === '/d3.js') {
      res.setHeader('content-type', 'application/javascript');
      fs.createReadStream(files.d3).pipe(res);
    } else if (req.url === '/favicon.ico') {
      res.statusCode = 404;
      res.end();
    } else {
      res.setHeader('content-type', 'text/html');
      fs.createReadStream(files.index).pipe(res);
    }
  });
});
