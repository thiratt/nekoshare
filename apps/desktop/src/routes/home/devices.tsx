import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { invoke } from "@tauri-apps/api/core";

import { DevicesUI } from "@workspace/app-ui/components/ui/devices";
import type { DeviceInfo } from "@workspace/app-ui/types/device";

export const Route = createFileRoute("/home/devices")({
  component: RouteComponent,
});

function RouteComponent() {
  const [localDeviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    invoke("get_device_info").then((info) => {
      setDeviceInfo(info as DeviceInfo);
    });
  }, []);

  return <DevicesUI deviceInfo={localDeviceInfo} />;
}
