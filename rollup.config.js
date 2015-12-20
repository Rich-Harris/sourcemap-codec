import babel from 'rollup-plugin-babel';
import npm from 'rollup-plugin-npm';

export default {
	entry: 'src/sourcemap-codec.js',
	plugins: [
		babel({ exclude: 'node_modules/**' }),
		npm({ jsnext: true })
	],
	moduleName: 'sourcemapCodec',
	sourceMap: true
};
