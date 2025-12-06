import { createFileRoute } from "@tanstack/react-router";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { useFiles } from "@/hooks/useFiles";
import { HomeUI } from "@workspace/app-ui/components/ui/home";
import { join } from "@tauri-apps/api/path";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { files, directoryPath, loading } = useFiles();

  return (
    <HomeUI
      onItemClick={(id) => {
        console.log("Clicked item with id:", id);
      }}
      onItemReveal={async (id) => {
        const file = files.find((_, index) => index + 1 === id);
        if (file && directoryPath) {
          const filePath = await join(directoryPath, file.name);
          await revealItemInDir(filePath);
        }
      }}
      onBulkDelete={(ids) => {
        console.log("Bulk delete items with ids:", ids);
      }}
      data={files}
      loading={loading}
    />
  );
}
