import { decode as decodeVlq, encode as encodeVlq } from 'vlq';

export type SourceMapSegment = [number] | [number, number, number, number] | [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];

function decodeSegments ( encodedSegments: string[] ): number[][] {
	let i = encodedSegments.length;
	const segments = new Array<number[]>( i );

	while ( i-- ) segments[i] = decodeVlq( encodedSegments[i] );
	return segments;
}

export function decode ( mappings: string ): SourceMapMappings {
	let sourceFileIndex = 0;   // second field
	let sourceCodeLine = 0;    // third field
	let sourceCodeColumn = 0;  // fourth field
	let nameIndex = 0;         // fifth field

	const lines = mappings.split( ';' );
	const numLines = lines.length;
	const decoded = new Array<SourceMapLine>( numLines );

	let i: number;
	let j: number;
	let line: string;
	let generatedCodeColumn: number;
	let decodedLine: SourceMapLine;
	let segments: number[][];
	let segment: number[];
	let result: SourceMapSegment;

	for ( i = 0; i < numLines; i += 1 ) {
		line = lines[i];

		generatedCodeColumn = 0; // first field - reset each time
		decodedLine = [];

		segments = decodeSegments( line.split( ',' ) );

		for ( j = 0; j < segments.length; j += 1 ) {
			segment = segments[j];

			if ( !segment.length ) {
				break;
			}

			generatedCodeColumn += segment[0];

			result = [ generatedCodeColumn ] as SourceMapSegment;
			decodedLine.push( result );

			if ( segment.length === 1 ) {
				// only one field!
				continue;
			}

			sourceFileIndex  += segment[1];
			sourceCodeLine   += segment[2];
			sourceCodeColumn += segment[3];

			result.push( sourceFileIndex, sourceCodeLine, sourceCodeColumn );

			if ( segment.length === 5 ) {
				nameIndex += segment[4];
				result.push( nameIndex );
			}
		}

		decoded[i] = decodedLine;
	}

	return decoded;
}

export function encode ( decoded: SourceMapMappings ): string {
	const offsets = {
		generatedCodeColumn: 0,
		sourceFileIndex: 0,   // second field
		sourceCodeLine: 0,    // third field
		sourceCodeColumn: 0,  // fourth field
		nameIndex: 0          // fifth field
	};

	return decoded.map( line => {
		offsets.generatedCodeColumn = 0; // first field - reset each time
		return line.map( encodeSegment ).join( ',' );
	}).join( ';' );

	function encodeSegment ( segment: SourceMapSegment ): string {
		if ( !segment.length ) {
			return '';
		}

		const result = new Array<number>( segment.length );

		result[0] = segment[0] - offsets.generatedCodeColumn;
		offsets.generatedCodeColumn = segment[0];

		if ( segment.length === 1 ) {
			// only one field!
			return encodeVlq( result );
		}

		result[1] = segment[1] - offsets.sourceFileIndex;
		result[2] = segment[2] - offsets.sourceCodeLine;
		result[3] = segment[3] - offsets.sourceCodeColumn;

		offsets.sourceFileIndex  = segment[1];
		offsets.sourceCodeLine   = segment[2];
		offsets.sourceCodeColumn = segment[3];

		if ( segment.length === 5 ) {
			result[4] = segment[4] - offsets.nameIndex;
			offsets.nameIndex = segment[4];
		}

		return encodeVlq( result );
	}
}
