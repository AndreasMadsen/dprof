'use strict';

var test = require('tap').test;
var spawn = require('child_process').spawn;
var path = require('path');
var endpoint = require('endpoint');
var async = require('async');
var fs = require('fs');

var dprofPath = path.resolve(__dirname, 'dprof.json');

function testScript(filename, expectedStdout) {
  test('simple', function (t) {
    // remove drof.json
    fs.unlink(dprofPath, function () {

      // run script
      var proc = spawn(process.execPath, [
        path.resolve(__dirname, 'scripts', filename + '.js')
      ], {
        cwd: __dirname
      });

      // check stderr and stdout
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
            t.equal(buf.toString(), expectedStdout);
            done(null);
          }));
        }
      ], function (err) {
        t.ifError(err);

        // check dprof.json
        fs.readFile(dprofPath, function (err, content) {
          t.ifError(err);
          t.end();
        });
      });
    });
  });
}

testScript('example', '');
testScript('console-log', 'hallo world\n');
