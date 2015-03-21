'use strict';

var fs = require('fs');
require('../dprof.js');

setTimeout(function () {

  fs.open(__filename, 'r', function (err1, fd) {
    if (err1) throw err1;

    var count = 0;
    var a = new Buffer(10);
    fs.read(fd, a, 0, 10, 0, function (err2) {
      if (err2) throw err2;

      count += 1;
      if (count === 2) close();
    });

    var b = new Buffer(10);
    fs.read(fd, b, 0, 10, 10, function (err2) {
      if (err2) throw err2;

      count += 1;
      if (count === 2) close();
    });

    function close() {
      fs.close(fd, function (err2) {
        if (err2) throw err2;
      });
    }
  });

  fs.readdir(__dirname, function (err) {
    if (err) throw err;
  });
}, 1);
