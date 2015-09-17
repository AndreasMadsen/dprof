'use strict';

const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs');

const DPROF_BIN = path.resolve(__dirname, '..', 'bin', 'dprof.js');

const name = process.argv[2];
const dumpPath = path.resolve(__dirname, 'expected', name + '.json');
const dump = JSON.parse(fs.readFileSync(dumpPath)).dump;


const proc = spawn(process.execPath, [DPROF_BIN]);
      proc.stdin.end(JSON.stringify(dump));
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
