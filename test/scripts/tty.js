'use strict';
require('../../dprof.js');

const fs = require('fs');

fs.createReadStream(__filename).pipe(process.stdout);
