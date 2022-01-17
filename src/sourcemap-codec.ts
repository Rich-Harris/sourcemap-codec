export type SourceMapSegment =
	| [number]
	| [number, number, number, number]
	| [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const intToChar = new Uint8Array(65); // 65 possible chars.
const charToInteger = new Uint8Array(123); // z is 122 in ASCII

// Fill the buffer with 255, so we can detect invalid chars.
for (let i = 0; i < 128; i++) charToInteger[i] = 255;
// And fill with valid values.
for (let i = 0; i < chars.length; i++) {
	const c = chars.charCodeAt(i);
	charToInteger[c] = i;
	intToChar[i] = c;
}

// Provide a fallback for older environments.
const td = typeof TextDecoder !== 'undefined' ? new TextDecoder('ascii') : {
	decode(buf: Uint8Array) {
		let out = '';
		for (let i = 0; i < buf.length; i++) {
			out += String.fromCharCode(buf[i])
		}
		return out;
	}
};


export function decode(mappings: string): SourceMapMappings {
	const decoded: SourceMapMappings = [];
	let line: SourceMapLine = [];
	const segment: SourceMapSegment = [
		0, // generated code column
		0, // source file index
		0, // source code line
		0, // source code column
		0, // name index
	];

	let j = 0;
	for (let i = 0, shift = 0, value = 0; i < mappings.length; i++) {
		const c = mappings.charCodeAt(i);

		if (c === 44) { // ","
			segmentify(line, segment, j);
			j = 0;

		} else if (c === 59) { // ";"
			segmentify(line, segment, j);
			j = 0;
			decoded.push(line);
			line = [];
			segment[0] = 0;

		} else {
			let integer = charToInteger[c];
			if (integer === 255) {
				throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
			}

			const hasContinuationBit = integer & 32;

			integer &= 31;
			value += integer << shift;

			if (hasContinuationBit) {
				shift += 5;
			} else {
				const shouldNegate = value & 1;
				value >>>= 1;

				if (shouldNegate) {
					value = value === 0 ? -0x80000000 : -value;
				}

				segment[j] += value;
				j++;
				value = shift = 0; // reset
			}
		}
	}

	segmentify(line, segment, j);
	decoded.push(line);

	return decoded;
}

function segmentify(line: SourceMapSegment[], segment: SourceMapSegment, j: number) {
	// This looks ugly, but we're creating specialized arrays with a specific
	// length. This is much faster than creating a new array (which v8 expands to
	// a capacity of 17 after pushing the first item), or slicing out a subarray
	// (which is slow). Length 4 is assumed to be the most frequent, followed by
	// length 5 (since not everything will have an associated name), followed by
	// length 1 (it's probably rare for a source substring to not have an
	// associated segment data).
	if (j === 4) line.push([segment[0], segment[1], segment[2], segment[3]]);
	else if (j === 5) line.push([segment[0], segment[1], segment[2], segment[3], segment[4]]);
	else if (j === 1) line.push([segment[0]]);
}

export function encode(decoded: SourceMapMappings): string {
	let sourceFileIndex = 0;  // second field
	let sourceCodeLine = 0;   // third field
	let sourceCodeColumn = 0; // fourth field
	let nameIndex = 0;        // fifth field

	let buf = new Uint8Array(1000);
	let pos = 0;

	for (let i = 0; i < decoded.length; i++) {
		const line = decoded[i];
		if (i > 0) {
			buf = reserve(buf, pos, 1);
			buf[pos++] = 59; // ";"
		}
		if (line.length === 0) continue;

		let generatedCodeColumn = 0; // first field

		const lineMappings: string[] = [];

		for (let j = 0; j < line.length; j++) {
			const segment = line[j];
			// We can push up to 5 ints, each int can take at most 7 chars, and we
			// may push a comma.
			buf = reserve(buf, pos, 36);
			if (j > 0) buf[pos++] = 44; // ","

			pos = encodeInteger(buf, pos, segment[0] - generatedCodeColumn);
			generatedCodeColumn = segment[0];

			if (segment.length > 1) {
				pos = encodeInteger(buf, pos, segment[1] - sourceFileIndex);
				pos = encodeInteger(buf, pos, segment[2] - sourceCodeLine);
				pos = encodeInteger(buf, pos, segment[3] - sourceCodeColumn);

				sourceFileIndex = segment[1];
				sourceCodeLine = segment[2];
				sourceCodeColumn = segment[3];
			}

			if (segment.length === 5) {
				pos = encodeInteger(buf, pos, segment[4] - nameIndex);
				nameIndex = segment[4];
			}
		}
	}

	return td.decode(buf.subarray(0, pos));
}

function reserve(buf: Uint8Array, pos: number, count: number): Uint8Array {
	if (buf.length <= pos + count) {
		const swap = new Uint8Array(buf.length * 2);
		swap.set(buf);
		buf = swap;
	}
	return buf;
}

function encodeInteger(buf: Uint8Array, pos: number, num: number): number {
	num = num < 0 ? (-num << 1) | 1 : num << 1;
	do {
		let clamped = num & 31;
		num >>>= 5;
		if (num > 0) clamped |= 32;
		buf[pos++] = intToChar[clamped];
	} while (num > 0);

	return pos;
}
