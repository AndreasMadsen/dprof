'use strict';

const zlib = require('zlib');
const https = require('https');
const endpoint = require('endpoint');
const dumpStream = require('./dump_stream.js');

getGzipFile(function (err, dump) {
  if (err) throw err;

  uploadGits(dump, function (err, id) {
    if (err) throw err;

    console.log('view at: https://dprof.js.org/gists/#' + id);
  });
});

function getGzipFile(callback) {
  dumpStream().pipe(zlib.createGzip()).pipe(endpoint(callback));
}

function uploadGits(dump, callback) {
  const req = https.request({
      host: 'api.github.com',
      port: 443,
      path: '/gists',
      method: 'POST',
      headers: {
          'User-Agent': 'dprof',
          'Content-Type': 'application/json; charset=utf-8'
      }
  }, function (res) {
    res.pipe(endpoint(function (err, json) {
      if (err) return callback(err);

      if (res.statusCode >= 400) {
        return callback(new Error(JSON.parse(json).message));
      }

      callback(null, JSON.parse(json).id);
    }));
  });

  req.end(
    JSON.stringify({
      description: 'dprof dump – https://github.com/AndreasMadsen/dprof',
      public: false,
      files: {
        'dprof.json.gz.base64': {
          content: dump.toString('base64')
        }
      }
    })
  );
}
