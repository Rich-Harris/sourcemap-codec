import buble from 'rollup-plugin-buble';
import resolve from 'rollup-plugin-node-resolve';

const pkg = require( './package.json' );

export default {
	entry: 'src/sourcemap-codec.js',
	plugins: [
		buble({ exclude: 'node_modules/**' }),
		resolve({ jsnext: true })
	],
	moduleName: 'sourcemapCodec',
	sourceMap: true,
	targets: [
		{ dest: pkg.main, format: 'umd' },
		{ dest: pkg.module, format: 'es' }
	]
};
