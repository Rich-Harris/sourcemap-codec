var gobble = require( 'gobble' );

module.exports = gobble( 'src' ).transform( 'rollup-babel', {
	entry: 'sourcemap-codec.js',
	format: 'umd',
	external: [ 'buffer-crc32' ],
	moduleName: 'sourcemapCodec'
});
