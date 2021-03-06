# dprof

> Dynamic/structured profiling & visualization for sync and async operations

```shell
node -r dprof my-script.js
# ...
gzcat dprof.json.gz | dprof
```

## Installation

```shell
npm install dprof
npm install -g dprof
```

## Example

1. Run the script with `-r`/`--require dprof` and wait for it to finish.
  - When done a `dprof.json.gz` is
  created in your `cwd`.
2. To start the visualizer run `gzcat dprof.json.gz | dprof`.
3. Now open [http://localhost:3343](http://localhost:3343) in your browser.

```javascript
// my-script.js

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
```

## Visualizer

```shell
gzcat dprof.json.gz | dprof
```

The visualizer is WIP, you are welcome to contribute with major changes to the existing one.

![Visualizer](https://github.com/AndreasMadsen/dprof/blob/master/visualizer.png)

* Blue: time spent waiting for async response.
* Red: time spent executing the callback code (blocking).
* Black: when the async request was made.

## Github Gists sharing

You can easily share a `dprof` dump with someone who doesn't have `dprof`
installed. Just pipe it to `dprof upload` and it will upload it to an anonymous
gists.

```shell
gzcat dprof.json.gz | dprof upload
https://dprof.js.org/gists/#6ad16f91d3e599649912315e48ebd1cb
```

## SIGINT (Ctrl-C) Behavior

To help debug process that may not have a defined exit, or may have a
problematic handle keeping them open, dprof registers a `SIGINT` handler
by default.
This allows dprof to capture when a process is interrupted by the user,
and it will write the JSON data and terminate.

If this overriding terminate behavior is undesired, or interferes with an
existing handler in a program, either a `--dprof-no-sigint` flag can be
provided to the program, or a `DPROF_NO_SIGINT=1` environment variable.

```
node -r dprof my-script.js --dprof-no-sigint
```

## Format

The `dprof.json.gz` file is a GZIP compressed JSON file. It is possible
to get an uncompressed file, just set the environment variable `NODE_DPROF_DEBUG`.

There is an initial object containing metadata and a "root" node:

```javascript
Root {
  version: String,   // the version of dprof there generated this JSON file
  total: Number,     // execution time in nanoseconds
  root: Node,        // The root node, has uid 0
  nodes: [           // List of all non-root nodes
    Node, ...
  ]
}
```

Each nested `Node` has the following format:

```javascript
Node {
  name: String,      // Handle name of the async operation
  uid: Number,       // Unique identifier for each node (from asyncHook)
  parent: Number,    // Uid for the parent node

  stack: [           // Contains the stack leading up to the async operation
    {
      description: String,
      filename: String,
      column: Number,
      line: Number
    }, ...
  ],

  init: Number,      // Timestamp for when the async operation is requested.
  before: [Number],  // Timestamp for when the callback is about to be called.
                     // This is an array because a callback may be called
                     // more than once.
  after: [Number],   // Timestamp for when the callback is finished.
                     // All timestamps are relative to the process startup
                     // time and the unit is nanoseconds.

  unref: [Number],   // Timestamp for when the handle was unrefed
  ref: [Number],     // Timestamp for when the handle was refed
  initRef: Boolean,  // `false` if the handle was initially unrefed

  children: [        // Shows async operations created in the callback
    Number(uid), ...
  ]
}
```
