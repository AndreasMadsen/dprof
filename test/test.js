'use strict';

var test = require('tap').test;
var spawn = require('child_process').spawn;
var path = require('path');
var endpoint = require('endpoint');
var async = require('async');
var fs = require('fs');

var dprofPath = path.resolve(__dirname, 'dprof.json');

try {
  fs.unlinkSync(dprofPath);
} catch (e) {}

test('simple', function (t) {
  console.log(path.resolve(__dirname, 'scripts', 'example.js'));
  var proc = spawn(process.execPath, [
    path.resolve(__dirname, 'scripts', 'example.js')
  ], {
    cwd: __dirname
  });

  async.parallel([
    function (done) {
      proc.stderr.pipe(endpoint(function (err, buf) {
        t.ifError(err);
        t.equal(buf.toString(), '');
        done(null);
      }));
    },
    function (done) {
      proc.stdout.pipe(endpoint(function (err, buf) {
        t.ifError(err);
        t.equal(buf.toString(), '');
        done(null);
      }));
    }
  ], function (err) {
    t.ifError(err);
    fs.readFile(dprofPath, function (err, content) {
      t.ifError(err);
      console.log(content.toString());
      t.end();
    });
  });
});
