export type SourceMapSegment =
	| [number]
	| [number, number, number, number]
	| [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];

const charToInteger: { [charCode: number]: number } = {};
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

for (let i = 0; i < chars.length; i++) {
	charToInteger[chars.charCodeAt(i)] = i;
}

export function decode(mappings: string): SourceMapMappings {
	let generatedCodeColumn = 0; // first field
	let sourceFileIndex = 0;     // second field
	let sourceCodeLine = 0;      // third field
	let sourceCodeColumn = 0;    // fourth field
	let nameIndex = 0;           // fifth field

	const decoded: SourceMapMappings = [];
	let line: SourceMapLine = [];
	let segment: number[] = [];

	for (let i = 0, j = 0, shift = 0, value = 0, len = mappings.length; i < len; i++) {
		const c = mappings.charCodeAt(i);

		if (c === 44) { // ","
			if (segment.length) line.push(new Int32Array(segment) as any);
			segment = [];
			j = 0;

		} else if (c === 59) { // ";"
			if (segment.length) line.push(new Int32Array(segment) as any);
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

	if (segment.length) line.push(new Int32Array(segment) as any);
	decoded.push(line);

	return decoded;
}

export function encode(decoded: SourceMapMappings): string {
	let sourceFileIndex = 0;  // second field
	let sourceCodeLine = 0;   // third field
	let sourceCodeColumn = 0; // fourth field
	let nameIndex = 0;        // fifth field
	let mappings = '';

	for (let i = 0; i < decoded.length; i++) {
		const line = decoded[i];
		if (i > 0) mappings += ';';
		if (line.length === 0) continue;

		let generatedCodeColumn = 0; // first field

		const lineMappings: string[] = [];

		for (const segment of line) {
			let segmentMappings = encodeInteger(segment[0] - generatedCodeColumn);
			generatedCodeColumn = segment[0];

			if (segment.length > 1) {
				segmentMappings +=
					encodeInteger(segment[1] - sourceFileIndex) +
					encodeInteger(segment[2] - sourceCodeLine) +
					encodeInteger(segment[3] - sourceCodeColumn);

				sourceFileIndex = segment[1];
				sourceCodeLine = segment[2];
				sourceCodeColumn = segment[3];
			}

			if (segment.length === 5) {
				segmentMappings += encodeInteger(segment[4] - nameIndex);
				nameIndex = segment[4];
			}

			lineMappings.push(segmentMappings);
		}

		mappings += lineMappings.join(',');
	}

	return mappings;
}

function encodeInteger(num: number): string {
	var result = '';
	num = num < 0 ? (-num << 1) | 1 : num << 1;
	do {
		var clamped = num & 31;
		num >>= 5;
		if (num > 0) {
			clamped |= 32;
		}
		result += chars[clamped];
	} while (num > 0);

	return result;
}
