'use strict';

const spawn = require('child_process').spawn;
const interpreted = require('interpreted');
const endpoint = require('endpoint');
const async = require('async');
const path = require('path');
const fs = require('fs');

const testUtil = require('./util.js');

const SCRIPTS_DIR = path.resolve(__dirname, 'scripts');
const DPROF_DUMP = path.resolve(__dirname, 'dprof.json');

interpreted({
  source: SCRIPTS_DIR,
  expected: path.resolve(__dirname, 'expected'),

  update: false,

  test: function (name, content, callback) {
    const scriptPath = path.resolve(SCRIPTS_DIR, name + '.js');
    const proc = spawn(process.execPath, [
      '--stack_trace_limit=100', scriptPath
    ], {
      cwd: __dirname,
      env: Object.assign({ NODE_DPROF_DEBUG: '1' }, process.env)
    });

    async.parallel({
      stderr(done) {
        proc.stderr.pipe(endpoint(done));
      },
      stdout(done) {
        proc.stdout.pipe(endpoint(done));
      }
    }, function (err, results) {
      if (err) return callback(err);

      fs.readFile(DPROF_DUMP, function (err, dump) {
        if (err) return callback(err);

        callback(null, {
          stdout: results.stdout.toString('ascii'),
          stderr: results.stderr.toString('ascii'),
          dump: JSON.parse(dump.toString('ascii'))
        });
      });
    });
  },

  types: {
    'json': {
      test: function (t, actual, expected) {
        expected = JSON.parse(expected);

        t.strictEqual(actual.stdout, expected.stdout);
        t.strictEqual(actual.stderr, expected.stderr);
        t.strictDeepEqual(
          testUtil.simplifyDump(actual.dump),
          testUtil.simplifyDump(expected.dump)
        );
      },
      update: function (actual) {
        return JSON.stringify(actual, null, 1);
      }
    }
  }
});
