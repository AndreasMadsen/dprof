'use strict';
require('../../dprof.js');

var fs = require('fs');

fs.createReadStream(__filename).pipe(process.stdout);
