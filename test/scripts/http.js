'use strict';
Error.stackTraceLimit = Infinity;
require('../../dprof.js');

const http = require('http');

const server = http.createServer(function (req, res) {
  res.end('hallo world');
});

server.listen(0, 'localhost', function () {
  const addr = server.address();
  const req = http.get(`http://${addr.address}:${addr.port}`, function (res) {
    res.resume();
    res.once('end', server.close.bind(server));
  });
});
