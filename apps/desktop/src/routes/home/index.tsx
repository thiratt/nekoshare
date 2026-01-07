import { createFileRoute } from "@tanstack/react-router";
import { remove } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { HomeUI } from "@workspace/app-ui/components/ui/home/index";

import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { files, directoryPath, status, refresh } = useWorkspace();

  const isLoading = status === "loading";

  if (status === "unavailable") {
    return (
      <HomeUI
        onItemClick={() => {}}
        onItemReveal={() => Promise.resolve()}
        onItemRemove={() => Promise.resolve()}
        onBulkDelete={() => {}}
        data={[]}
        loading={false}
      />
    );
  }

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
          } catch (err) {
            console.error("Failed to delete file:", err);
          }
        }
      }}
      onBulkDelete={(ids) => {
        console.log("Bulk delete items with ids:", ids);
      }}
      data={files}
      loading={isLoading}
    />
  );
}
