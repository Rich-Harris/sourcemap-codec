import buble from 'rollup-plugin-buble';
import npm from 'rollup-plugin-npm';

export default {
	entry: 'src/sourcemap-codec.js',
	plugins: [
		buble({ exclude: 'node_modules/**' }),
		npm({ jsnext: true })
	],
	moduleName: 'sourcemapCodec',
	sourceMap: true
};
