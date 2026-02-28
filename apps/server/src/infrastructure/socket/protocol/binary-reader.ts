export class BinaryReader {
	private buffer: Buffer;
	private offset: number = 0;

	constructor(buffer: Buffer) {
		this.buffer = buffer;
	}

	readUInt8(): number {
		this.checkBounds(1);
		const value = this.buffer.readUInt8(this.offset);
		this.offset += 1;
		return value;
	}

	readInt32(): number {
		this.checkBounds(4);
		const value = this.buffer.readInt32LE(this.offset);
		this.offset += 4;
		return value;
	}

	readString(): string {
		this.checkBounds(2);
		const length = this.buffer.readUInt16LE(this.offset);
		this.offset += 2;

		this.checkBounds(length);
		const str = this.buffer.toString("utf-8", this.offset, this.offset + length);
		this.offset += length;

		return str;
	}

	readRemainingBuffer(): Buffer {
		const remaining = this.buffer.subarray(this.offset);
		this.offset = this.buffer.length;
		return remaining;
	}

	isEnd(): boolean {
		return this.offset >= this.buffer.length;
	}

	getOriginalBuffer(): Buffer {
		return this.buffer;
	}

	private checkBounds(length: number) {
		if (this.offset + length > this.buffer.length) {
			throw new RangeError(`Offset out of bounds: Need ${length}, has ${this.buffer.length - this.offset}`);
		}
	}
}
