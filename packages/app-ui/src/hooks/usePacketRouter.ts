import { useEffect, useRef } from "react";

import {
	BinaryReader,
	PacketParsers,
	type PacketPayloads,
	PacketType,
	useNekoSocket,
} from "@workspace/app-ui/hooks/useNekoSocket";

type Resolve<T> = T extends (...args: unknown[]) => unknown ? T : { [K in keyof T]: T[K] };
type TypedHandlerMap = {
	[K in PacketType]?: (data: Resolve<PacketPayloads[K]>) => void;
};

export function usePacketRouter(handlers: TypedHandlerMap) {
	const { on } = useNekoSocket();
	const handlersRef = useRef(handlers);

	useEffect(() => {
		handlersRef.current = handlers;
	}, [handlers]);

	useEffect(() => {
		const unsubs: (() => void)[] = [];

		const subscribe = <T extends PacketType>(type: T) => {
			const userHandler = handlersRef.current[type] as ((data: PacketPayloads[T]) => void) | undefined;
			const parser = PacketParsers[type as keyof typeof PacketParsers] as ((r: BinaryReader) => PacketPayloads[T]) | undefined;

			if (userHandler) {
				const unsub = on(type, (reader) => {
					if (parser) {
						const data = parser(reader);
						userHandler(data);
					} else {
						userHandler(undefined as unknown as PacketPayloads[T]);
					}
				});
				unsubs.push(unsub);
			}
		};

		Object.keys(handlersRef.current).forEach((key) => {
			const type = Number(key) as PacketType;

			if (!isNaN(type)) {
				subscribe(type);
			}
		});

		return () => unsubs.forEach((u) => u());
	}, [on]);
}
