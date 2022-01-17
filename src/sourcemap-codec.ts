export type SourceMapSegment =
	| [number]
	| [number, number, number, number]
	| [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];

type CurIndex = [number];

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

	let generatedCodeColumn = 0; // first field
	let sourceFileIndex = 0;     // second field
	let sourceCodeLine = 0;      // third field
	let sourceCodeColumn = 0;    // fourth field
	let nameIndex = 0;           // fifth field
	let state: CurIndex = [0];

	for (let i = 0; i < mappings.length;) {
		const c = mappings.charCodeAt(i);

		if (c === 44) { // ","
			i++;

		} else if (c === 59) { // ";"
			generatedCodeColumn = 0;
			decoded.push(line);
			line = [];
			i++;

		} else {
			state[0] = i;
			generatedCodeColumn += decodeInteger(mappings, state);

			if (hasMoreSegments(mappings, state)) {
				sourceFileIndex += decodeInteger(mappings, state);
				sourceCodeLine += decodeInteger(mappings, state);
				sourceCodeColumn += decodeInteger(mappings, state);

				if (hasMoreSegments(mappings, state)) {
					nameIndex += decodeInteger(mappings, state);
					line.push([generatedCodeColumn, sourceFileIndex, sourceCodeLine, sourceCodeColumn, nameIndex]);
				} else {
					line.push([generatedCodeColumn, sourceFileIndex, sourceCodeLine, sourceCodeColumn]);
				}
			} else {
				line.push([generatedCodeColumn]);
			}

			i = state[0];
		}
	}

	decoded.push(line);

	return decoded;
}

function decodeInteger(mappings: string, state: CurIndex): number {
	let i = state[0];
	let value = 0;
	let shift = 0;
	let integer = 0;
	
	do {
		const c = mappings.charCodeAt(i++);
		integer = charToInteger[c];
		value |= (integer & 31) << shift;
		shift += 5;
	} while (integer & 32);

	const shouldNegate = value & 1;
	value >>>= 1;

	if (shouldNegate) {
		value = value === 0 ? -0x80000000 : -value;
	}

	state[0] = i;
	return value;
}

function hasMoreSegments(mappings: string, state: CurIndex): boolean {
	const i = state[0];
	if (i >= mappings.length) return false;

	const c = mappings.charCodeAt(i);
	if (c === 44 || c === 59) return false;
	return true;
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
