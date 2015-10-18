var gobble = require( 'gobble' );

module.exports = gobble( 'src' ).transform( 'rollup-babel', {
	entry: 'sourcemap-codec.js',
	format: 'umd',
	moduleName: 'sourcemapCodec',
	sourceMap: true
});
