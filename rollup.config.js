import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

const pkg = require( './package.json' );

export default {
	input: 'src/sourcemap-codec.ts',
	plugins: [
		typescript({
			exclude: 'node_modules/**',
			typescript: require('typescript')
		}),
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
