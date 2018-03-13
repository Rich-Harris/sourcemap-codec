import { decode as decodeVlq, encode as encodeVlq } from 'vlq';

export type SourceMapSegment = [number] | [number, number, number, number] | [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];

const charToInteger: { [charCode: number]: number } = {};
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

for (let i = 0; i < chars.length; i++) {
	charToInteger[chars.charCodeAt(i)] = i;
}

export function decode ( mappings: string ): SourceMapMappings {
	let generatedCodeColumn = 0; // first field
	let sourceFileIndex = 0;     // second field
	let sourceCodeLine = 0;      // third field
	let sourceCodeColumn = 0;    // fourth field
	let nameIndex = 0;           // fifth field

	const decoded: SourceMapMappings = [];
	let line: SourceMapLine = [];
	let segment: number[] = [];

	for (let i = 0, j = 0, shift = 0, value = 0; i < mappings.length; i++) {
		const c = mappings.charCodeAt(i);

		if (c === 44) { // ","
			if (segment.length) line.push(<SourceMapSegment>segment);
			segment = [];
			j = 0;

		} else if (c === 59) { // ";"
			if (segment.length) line.push(<SourceMapSegment>segment);
			segment = [];
			j = 0;
			decoded.push(line);
			line = [];
			generatedCodeColumn = 0;

		} else {
			let integer = charToInteger[c];
			if (integer === undefined) {
				throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
			}

			const hasContinuationBit = integer & 32;

			integer &= 31;
			value += integer << shift;

			if (hasContinuationBit) {
				shift += 5;

			} else {
				const shouldNegate = value & 1;
				value >>= 1;

				const num = shouldNegate ? -value : value;

				if (j == 0) {
					generatedCodeColumn += num;
					segment.push(generatedCodeColumn);

				} else if (j === 1) {
					sourceFileIndex += num;
					segment.push(sourceFileIndex);

				} else if (j === 2) {
					sourceCodeLine += num;
					segment.push(sourceCodeLine);

				} else if (j === 3) {
					sourceCodeColumn += num;
					segment.push(sourceCodeColumn);

				} else if (j === 4) {
					nameIndex += num;
					segment.push(nameIndex);
				}

				j++;
				value = shift = 0; // reset
			}
		}
	}

	if (segment.length) line.push(<SourceMapSegment>segment);
	decoded.push(line);

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
