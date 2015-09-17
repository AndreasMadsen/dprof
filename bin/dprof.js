#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const browserify = require('browserify');
const startpoint = require('startpoint');
const endpoint = require('endpoint');
const async = require('async');

const version = require('../package.json').version;
const server = http.createServer();

const basedir = path.resolve(__dirname, '..', 'visualizer');
const files = {
  index: path.resolve(basedir, 'index.html'),
  dump: path.resolve(basedir, 'dump.js'),
  visualizer: path.resolve(basedir, 'visualizer.js'),
  d3: path.resolve(require.resolve('d3'), '../d3.js')
};

async.parallel([
  function (done) {
    process.stdin.pipe(endpoint(done));
    process.stdin.unref();

    const noStdin = setTimeout(done, 100);
    process.stdin.once('data', function () {
      clearTimeout(noStdin);
    });
  },
  function (done) {
    server.listen(0xd0f, '127.0.0.1', done);
  }
], function (err, content) {
  if (err) throw err;
  const dprof = content[0];

  if (!dprof) {
    console.error('no file piped to stdin');
    process.exit(1);
  }

  const dumpVersion = JSON.parse(dprof).version;
  if (dumpVersion !== version) {
    console.error('dump file was made with dprof version ' + dumpVersion);
    console.error('dprof visualizer is version ' + version);
    console.error('versions much match');

    process.exit(1);
  }

  console.log('server ready on http://localhost:3343');

  const datadump = Buffer.concat([
    new Buffer('module.exports = '), content[0], new Buffer(';')
  ]);

  const b = browserify({
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
