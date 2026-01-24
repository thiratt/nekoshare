import { useEffect, useRef } from "react";

import {
	BinaryReader,
	PacketParsers,
	type PacketPayloads,
	PacketType,
	useNekoSocket,
} from "@workspace/app-ui/hooks/useNekoSocket";
import type { Result, ResultError } from "@workspace/app-ui/lib/errors";

type Resolve<T> = T extends (...args: never[]) => unknown ? T : { [K in keyof T]: T[K] };
type PacketHandler<T extends PacketType> = (data: Resolve<PacketPayloads[T]>) => void;

export type TypedHandlerMap = {
	[K in PacketType]?: PacketHandler<K>;
};

export function usePacketRouter(handlers: TypedHandlerMap): void {
	const { on } = useNekoSocket();
	const handlersRef = useRef(handlers);

	useEffect(() => {
		handlersRef.current = handlers;
	}, [handlers]);

	useEffect(() => {
		const unsubscribes: (() => void)[] = [];

		const subscribe = <T extends PacketType>(type: T): void => {
			const hasHandler = type in handlersRef.current && handlersRef.current[type] !== undefined;

			if (!hasHandler) {
				return;
			}

			const parser = PacketParsers[type as keyof typeof PacketParsers] as
				| ((reader: BinaryReader) => PacketPayloads[T])
				| undefined;

			const unsubscribe = on(type, (reader) => {
				const currentHandler = handlersRef.current[type] as PacketHandler<T> | undefined;

				if (!currentHandler) {
					return;
				}

				try {
					if (parser) {
						const data = parser(reader);
						currentHandler(data as Resolve<PacketPayloads[T]>);
					} else {
						currentHandler(undefined as Resolve<PacketPayloads[T]>);
					}
				} catch (error) {
					console.error(
						`[usePacketRouter] Error processing packet type ${PacketType[type]}:`,
						error instanceof Error ? error.message : error,
					);
				}
			});

			unsubscribes.push(unsubscribe);
		};

		const handlerTypes = Object.keys(handlersRef.current)
			.map(Number)
			.filter((key): key is PacketType => !isNaN(key) && key in PacketType);

		handlerTypes.forEach(subscribe);

		return () => {
			unsubscribes.forEach((unsubscribe) => unsubscribe());
		};
	}, [on]);
}

export function isPacketSuccess<T>(result: Result<T>): result is { status: "success"; data: T } {
	return result.status === "success";
}

export function isPacketError<T>(result: Result<T>): result is ResultError {
	return result.status === "error";
}
