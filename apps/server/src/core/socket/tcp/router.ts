import { Connection } from "./connection";
import { BinaryReader } from "./binary-utils";
import { Logger } from "@/core/logger";

type CommandHandler = (client: Connection, reader: BinaryReader, requestId: number) => Promise<void> | void;

export class PacketRouter {
	private handlers = new Map<number, CommandHandler>();

	register(type: number, handler: CommandHandler) {
		this.handlers.set(type, handler);
	}

	dispatch(type: number, client: Connection, reader: BinaryReader, requestId: number) {
		const handler = this.handlers.get(type);
		if (handler) {
			try {
				const result = handler(client, reader, requestId);

				if (result instanceof Promise) {
					result.catch((err) => {
						Logger.error(
							"TCP",
							`Async Error handling command ${type}: ${err instanceof Error ? err.message : err}`
						);
					});
				}
			} catch (err) {
				Logger.error("TCP", `Sync Error handling command ${type}: ${err instanceof Error ? err.message : err}`);
			}
		} else {
			Logger.error("TCP", `No handler registered for packet type: ${type}`);
		}
	}
}

export const mainRouter = new PacketRouter();
