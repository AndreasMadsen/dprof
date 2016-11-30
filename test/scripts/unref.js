'use strict';
require('../../dprof.js');

const net = require('net');

const server = net.createServer(function (socket) {
  server.close();
  
  socket._handle.unref();
  setTimeout(function () {
    socket._handle.ref();
  }, 100);
  setTimeout(function () {
    socket._handle.unref();
  }, 200);
  setTimeout(function () {
    // keep alive
  }, 300);
});

server.listen(0, 'localhost', function () {
  const addr = server.address();
  const socket = net.connect(addr.port, addr.address, function () {
    socket._handle.unref();
  });
});
