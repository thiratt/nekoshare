export class BinaryWriter {
	private chunks: Uint8Array[] = [];
	private totalLength = 0;

	writeUInt8(value: number) {
		const arr = new Uint8Array(1);
		arr[0] = value;
		this.chunks.push(arr);
		this.totalLength += 1;
	}

	writeInt32(value: number) {
		const arr = new Uint8Array(4);
		new DataView(arr.buffer).setInt32(0, value, true);
		this.chunks.push(arr);
		this.totalLength += 4;
	}

	writeString(value: string) {
		const encoder = new TextEncoder();
		const strBytes = encoder.encode(value);

		const lenArr = new Uint8Array(2);
		new DataView(lenArr.buffer).setUint16(0, strBytes.length, true);

		this.chunks.push(lenArr);
		this.chunks.push(strBytes);
		this.totalLength += 2 + strBytes.length;
	}

	writeBuffer(buffer: Uint8Array | ArrayBuffer) {
		const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
		this.chunks.push(arr);
		this.totalLength += arr.length;
	}

	getBuffer(): Uint8Array {
		const result = new Uint8Array(this.totalLength);
		let offset = 0;
		for (const chunk of this.chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
	}
}

export class BinaryReader {
	private view: DataView;
	private offset = 0;
	private uint8Array: Uint8Array;

	constructor(buffer: ArrayBuffer | Uint8Array) {
		const ab = buffer instanceof Uint8Array ? buffer.buffer : buffer;
		this.view = new DataView(ab);
		this.uint8Array = new Uint8Array(ab);
	}

	readUInt8(): number {
		const val = this.view.getUint8(this.offset);
		this.offset += 1;
		return val;
	}

	readInt32(): number {
		const val = this.view.getInt32(this.offset, true);
		this.offset += 4;
		return val;
	}

	readString(): string {
		const len = this.view.getUint16(this.offset, true);
		this.offset += 2;
		const strBytes = this.uint8Array.slice(this.offset, this.offset + len);
		this.offset += len;
		return new TextDecoder().decode(strBytes);
	}

	readRemaining(): Uint8Array {
		const remaining = this.uint8Array.slice(this.offset);
		this.offset = this.uint8Array.length;
		return remaining;
	}
}
