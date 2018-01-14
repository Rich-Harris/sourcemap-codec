import buble from 'rollup-plugin-buble';
import resolve from 'rollup-plugin-node-resolve';

const pkg = require( './package.json' );

export default {
	input: 'src/sourcemap-codec.js',
	plugins: [
		buble({ exclude: 'node_modules/**' }),
		resolve({ jsnext: true })
	],
	output: [{
		file: pkg.main,
		format: 'umd',
		name: 'sourcemapCodec',
		sourcemap: true
	}, {
		file: pkg.module,
		format: 'es',
		sourcemap: true
	}]
};
