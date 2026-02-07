export function parseDropZoneId(dropZoneId: string): {
  type: "device" | "friend" | "unknown";
  id: string;
} {
  if (dropZoneId.startsWith("device-")) {
    return { type: "device", id: dropZoneId.slice(7) };
  }
  if (dropZoneId.startsWith("friend-")) {
    return { type: "friend", id: dropZoneId.slice(7) };
  }
  return { type: "unknown", id: dropZoneId };
}
