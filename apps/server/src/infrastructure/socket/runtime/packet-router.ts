import { Logger } from "@/infrastructure/logger";
import type { BinaryReader } from "@/infrastructure/socket/protocol/binary-reader";
import type { CommandHandler, IConnection, TransportType } from "./types";

export class PacketRouter<T extends IConnection = IConnection> {
	private handlers = new Map<number, CommandHandler<T>>();
	private transportType: TransportType;

	constructor(transportType: TransportType) {
		this.transportType = transportType;
	}

	register(type: number, handler: CommandHandler<T>) {
		this.handlers.set(type, handler);
	}

	dispatch(type: number, client: T, reader: BinaryReader, requestId: number) {
		const handler = this.handlers.get(type);
		if (handler) {
			try {
				const result = handler(client, reader, requestId);

				if (result instanceof Promise) {
					result.catch((err) => {
						Logger.error(
							this.transportType,
							`Async Error handling command ${type}: ${err instanceof Error ? err.message : err}`,
						);
					});
				}
			} catch (err) {
				Logger.error(
					this.transportType,
					`Sync Error handling command ${type}: ${err instanceof Error ? err.message : err}`,
				);
			}
		} else {
			Logger.error(this.transportType, `No handler registered for packet type: ${type}`);
		}
	}
}
