export class BinaryWriter {
	private buffers: Buffer[] = [];
	private totalLength = 0;

	writeUInt8(value: number) {
		const buffer = Buffer.allocUnsafe(1);
		buffer.writeUInt8(value, 0);
		this.buffers.push(buffer);
		this.totalLength += 1;
	}

	writeInt32(value: number) {
		const buffer = Buffer.allocUnsafe(4);
		buffer.writeInt32LE(value, 0);
		this.buffers.push(buffer);
		this.totalLength += 4;
	}

	writeString(value: string) {
		const strBuffer = Buffer.from(value, "utf-8");

		if (strBuffer.length > 65535) {
			throw new Error(`String too long for UInt16 protocol: ${strBuffer.length} bytes`);
		}

		const lenBuffer = Buffer.allocUnsafe(2);
		lenBuffer.writeUInt16LE(strBuffer.length, 0);

		this.buffers.push(lenBuffer);
		this.buffers.push(strBuffer);
		this.totalLength += 2 + strBuffer.length;
	}

	writeBuffer(buffer: Buffer) {
		this.buffers.push(buffer);
		this.totalLength += buffer.length;
	}

	getBuffer(): Buffer {
		return Buffer.concat(this.buffers, this.totalLength);
	}
}

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
