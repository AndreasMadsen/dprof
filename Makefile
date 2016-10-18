
all: docs/example/dprof.json docs/visualizer/visualizer.build.js

clean:
	rm -f docs/example/dprof.json
	rm -f docs/visualizer/visualizer.build.js

docs/example/dprof.json: docs/example/example.js dprof.js
	cd docs/example && NODE_DPROF_DEBUG=1 node -r ../../dprof.js example.js
	sed -i '' "s#"$(shell pwd)"##g" docs/example/dprof.json

docs/visualizer/visualizer.build.js: visualizer/dump.js visualizer/flatten.js \
		visualizer/info.js visualizer/overview.js visualizer/timeline.js \
		visualizer/visualizer.js
	./node_modules/.bin/browserify visualizer/visualizer.js \
		--outfile docs/visualizer/visualizer.build.js \
		--transform [ babelify --presets [ es2015 ] ]
