'use strict';

var fs = require('fs');
require('./dynamicprof.js');

setTimeout(function () {

  fs.open(__filename, 'r', function (err1, fd) {
    if (err1) throw err1;

    var count = 0;
    var a = new Buffer(10);
    fs.read(fd, a, 0, 10, 0, function (err2) {
      if (err2) throw err2;
      fs.writeSync(1, a.inspect() + '\n');

      count += 1;
      if (count === 2) close();
    });

    var b = new Buffer(10);
    fs.read(fd, b, 0, 10, 10, function (err2) {
      if (err2) throw err2;
      fs.writeSync(1, b.inspect() + '\n');

      count += 1;
      if (count === 2) close();
    });

    function close() {
      fs.close(fd, function (err2) {
        if (err2) throw err2;
      });
    }
  });

  fs.readdir(__dirname, function (err, list) {
    if (err) throw err;
    fs.writeSync(1, JSON.stringify(list, null, ' ') + '\n');
  });
}, 1);
