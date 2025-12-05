import { useFiles } from "@/hooks/useFiles";
import { createFileRoute } from "@tanstack/react-router";

import { HomeUI } from "@workspace/app-ui/components/ui/home";
import { useEffect } from "react";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { files } = useFiles();

  useEffect(() => {
    console.log("Fetched files:", files);
  }, [files]);
  
  return (
    <HomeUI
      onItemClick={(id) => {
        console.log("Clicked item with id:", id);
      }}
      onItemDownload={(id) => {
        console.log("Download item with id:", id);
      }}
      onBulkDelete={(ids) => {
        console.log("Bulk delete items with ids:", ids);
      }}
      data={[]}
    />
  );
}
