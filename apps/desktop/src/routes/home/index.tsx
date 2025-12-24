import { createFileRoute } from "@tanstack/react-router";
import { remove } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { HomeUI } from "@workspace/app-ui/components/ui/home/index";

import { useFiles } from "@/hooks/useFiles";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { files, directoryPath, loading, refresh } = useFiles();

  return (
    <HomeUI
      onItemClick={(id) => {
        console.log("Clicked item with id:", id);
      }}
      onItemReveal={async (id) => {
        const file = files.find((_, index) => index + 1 === id);
        if (file && directoryPath) {
          await revealItemInDir(file.path);
        }
      }}
      onItemRemove={async (id) => {
        const file = files.find((_, index) => index + 1 === id);
        if (file) {
          try {
            await remove(file.path, { recursive: file.isDirectory });
            await refresh();
          } catch (error) {
            console.error("Failed to delete file:", error);
          }
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
