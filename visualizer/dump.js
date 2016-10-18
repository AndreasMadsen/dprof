// This is dynamically replaced with actual content in the local version
//
// module.exports = Object(datadump);
//

'use strict';
const pako = require('pako');

const format = global.sessionStorage.getItem('dprof-format');
const data = global.sessionStorage.getItem('dprof-data');

// ups, someone visited the visualizer without "uploading" the data.
if (format === 'json') {
  module.exports = JSON.parse(data);
} else if (format === 'gzip-json') {
  const gzipbuf = Buffer.from(data, 'base64');
  const jsonbuf = new Buffer(pako.inflate(gzipbuf));
  const jsontxt = jsonbuf.toString();
  module.exports = JSON.parse(jsontxt);
} else {
  module.exports = {};
}
