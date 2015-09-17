'use strict';
require('../../dprof.js');

const net = require('net');

const server = net.createServer(function (socket) {
  socket.end('hallo world');
});

server.listen(0, 'localhost', function () {
  const addr = server.address();
  const socket = net.connect(addr.port, addr.host, function () {
    socket.once('readable', function () {
      socket.read();
      socket.once('readable', server.close.bind(server));
    });
  });
});
