import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import {
  generateStableId,
  HomeUI,
} from "@workspace/app-ui/components/ui/home/index";
import type { HomeProps } from "@workspace/app-ui/types/home";

import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

const tauriInvoke = invoke as HomeProps["invoke"];

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
        invoke={tauriInvoke}
      />
    );
  }

  return (
    <HomeUI
      onItemClick={(id) => {
        console.log("Clicked item with id:", id);
      }}
      onItemReveal={async (id) => {
        const file = files.find((f) => generateStableId(f.path) === id);
        if (file && directoryPath) {
          await revealItemInDir(file.path);
        }
      }}
      onItemRemove={async (id) => {
        const file = files.find((f) => generateStableId(f.path) === id);
        if (file) {
          try {
            await invoke("delete_file", { path: file.path });
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
      invoke={tauriInvoke}
    />
  );
}
