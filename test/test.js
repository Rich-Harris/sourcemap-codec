var decode = require( '../' ).decode;
var encode = require( '../' ).encode;
var assert = require( 'assert' );

require( 'console-group' ).install();

describe( 'sourcemap-codec', function () {
	// TODO more tests
	var tests = [
		{
			encoded: 'AAAA',
			decoded: [ [ [ 0, 0, 0, 0 ] ] ]
		},
		{
			encoded: ';;;',
			decoded: [ [], [], [], [] ]
		},
		{
			encoded: 'A,AAAA;;AACDE;',
			decoded: [
				[ [ 0 ], [ 0, 0, 0, 0 ] ],
				[],
				[ [ 0, 0, 1, -1, 2 ] ],
				[]
			]
		},
		{
			encoded: ';;;;EAEEA,EAAE,EAAC,CAAE;ECQY,UACC',
			decoded: [
				[],
				[],
				[],
				[],
				[ [ 2, 0, 2, 2, 0 ], [ 4, 0, 2, 4 ], [ 6, 0, 2, 5 ], [ 7, 0, 2, 7 ] ],
				[ [ 2, 1, 10, 19 ], [ 12, 1, 11, 20 ] ]
			]
		}
	];

	var filtered = tests.filter( function ( test ) {
		return test.solo;
	});

	tests = filtered.length ? filtered : tests;

	describe( 'decode()', function () {
		tests.forEach( function ( test, i ) {
			it( 'decodes sample ' + i, function () {
				assert.deepEqual( decode( test.encoded ), test.decoded );
			});
		});
	});

	describe( 'encode()', function () {
		tests.forEach( function ( test, i ) {
			it( 'encodes sample ' + i, function () {
				assert.deepEqual( encode( test.decoded ), test.encoded );
			});
		});
	});
});
