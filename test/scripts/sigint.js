'use strict';

// Should fail with either:
// process.argv.push('--dprof-no-sigint');
// process.env.DPROF_NO_SIGINT = '';
require('../../dprof.js');

setInterval(function () {}, 1000);
setTimeout(function () {
  process.kill(process.pid, 'SIGINT');
}, 200);
