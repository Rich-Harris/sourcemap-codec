var gobble = require( 'gobble' );

module.exports = gobble([
	// UMD build
	gobble( 'src' ).transform( 'rollup-babel', {
		entry: 'sourcemap-codec.js',
		dest: 'sourcemap-codec.umd.js',
		format: 'umd',
		moduleName: 'sourcemapCodec',
		sourceMap: true
	}),

	// ES6 build
	gobble( 'src' ).transform( 'rollup-babel', {
		entry: 'sourcemap-codec.js',
		dest: 'sourcemap-codec.es6.js',
		format: 'es6',
		sourceMap: true
	})
]);
