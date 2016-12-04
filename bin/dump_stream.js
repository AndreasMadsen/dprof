'use strict';

const fs = require('fs');
const zlib = require('zlib');
const stream = require('stream');

module.exports = function dumpStream() {
  const ret = stream.PassThrough();

  if (process.stdin.isTTY) {
    fs.createReadStream('dprof.json.gz')
      .pipe(zlib.createGunzip())
      .pipe(ret);
  } else {
    process.stdin.pipe(ret);
  }

  return ret;
};
