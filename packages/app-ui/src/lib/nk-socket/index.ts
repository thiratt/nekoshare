import { config } from "../config";

import { NekoSocket } from "@workspace/nk-websocket";

export * from "@workspace/nk-websocket";

export const socketClient = new NekoSocket(config.webSocketBaseUrl);
