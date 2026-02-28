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
