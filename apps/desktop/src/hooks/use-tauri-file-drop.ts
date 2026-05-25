import { useEffect, useRef } from "react";

import { useDropEventHandlers } from "@workspace/app-ui/components/ui/drop-overlay/index";

import { useNativeDropZones } from "./use-native-drop-zones";

interface UseTauriFileDropOptions {
  enabled?: boolean;
}

export function useTauriFileDrop(options: UseTauriFileDropOptions = {}) {
  const { enabled = true } = options;

  const handlers = useDropEventHandlers();

  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useNativeDropZones({
    enabled,
    onEvent: (event) => {
      const { onDragStart, onDragEnd, onPositionChange, onDrop } =
        handlersRef.current;

      switch (event.type) {
        case "enter":
          onDragStart(event.paths);
          onPositionChange(event.position);
          break;
        case "over":
          onPositionChange(event.position);
          break;
        case "drop":
          onDrop(event.paths, event.position);
          break;
        case "leave":
          onDragEnd();
          break;
      }
    },
  });
}

export default useTauriFileDrop;
