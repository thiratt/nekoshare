import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { FileItem } from "@workspace/app-ui/hooks/use-file-clipboard";
import { formatBytes, formatDate } from "@workspace/app-ui/libs/utils";
import { Download, ExternalLink } from "lucide-react";

export function ViewFileDialog({
	open,
	item,
	onOpenChange,
}: {
	open: boolean;
	item: FileItem | null;
	onOpenChange: (o: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>File</DialogTitle>
					<DialogDescription>Preview and file actions.</DialogDescription>
				</DialogHeader>

				{item && (
					<div className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
							<div className="truncate">{item.name}</div>
							<div className="flex items-center gap-2">
								<Badge variant="outline" className="uppercase">
									{item.kind}
								</Badge>
								<span>{formatBytes(item.size)}</span>
								<span>• {formatDate(item.createdAt)}</span>
							</div>
						</div>

						{/* lightweight preview */}
						{item.kind === "image" ? (
							<div className="rounded border bg-muted/30 p-3">
								{/* Replace src with real item.url */}
								<img src={item.url || ""} alt={item.name} className="max-h-[60vh] w-auto rounded" />
							</div>
						) : item.kind === "text" ? (
							<ScrollArea className="max-h-[60vh] rounded border p-3 bg-muted/30">
								{/* In real app, fetch file text here */}
								<pre className="whitespace-pre-wrap text-sm leading-6">
									Text preview not loaded in mock.
								</pre>
							</ScrollArea>
						) : (
							<div className="rounded border bg-muted/30 p-6 text-sm text-muted-foreground">
								No inline preview available.
							</div>
						)}

						<div className="flex items-center justify-end gap-2">
							<Button variant="outline">
								<ExternalLink className="w-4 h-4 mr-2" />
								Open
							</Button>
							<Button>
								<Download className="w-4 h-4 mr-2" />
								Download
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
