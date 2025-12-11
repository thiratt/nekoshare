import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { invoke } from "@tauri-apps/api/core";

import { DevicesUI } from "@workspace/app-ui/components/ui/devices/index";
import type { LocalDeviceInfo } from "@workspace/app-ui/types/device";

export const Route = createFileRoute("/home/devices")({
  component: RouteComponent,
});

function RouteComponent() {
  const [localDeviceInfo, setDeviceInfo] = useState<LocalDeviceInfo | null>(
    null,
  );

  useEffect(() => {
    invoke<LocalDeviceInfo>("get_device_info").then((info) => {
      setDeviceInfo(info);
    });
  }, []);

  return <DevicesUI localDeviceInfo={localDeviceInfo} />;
}
