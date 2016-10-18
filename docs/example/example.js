'use strict';
const fs = require('fs');

fs.open(__filename, 'r', function (err, fd) {

  let count = 0;
  const a = new Buffer(10);
  fs.read(fd, a, 0, 10, 0, function (err2) {
    if (++count === 2) close();
  });

  const b = new Buffer(10);
  fs.read(fd, b, 0, 10, 10, function (err2) {
    if (++count === 2) close();
  });

  function close() {
    fs.close(fd, function (err) {

    });
  }
});
