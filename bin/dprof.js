#!/usr/bin/env node
'use strict';

if (process.argv[2] === 'upload') {
  require('./upload.js');
} else {
  require('./server.js');
}
