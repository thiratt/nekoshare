import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ClipboardItem } from "@workspace/app-ui/hooks/use-text-clipboard";
import { getTextContentType, formatDate } from "@workspace/app-ui/libs/utils";
import { ClipboardCopy } from "lucide-react";

export function ViewTextDialog({
	open,
	item,
	onOpenChange,
	onCopy,
}: {
	open: boolean;
	item: ClipboardItem | null;
	onOpenChange: (o: boolean) => void;
	onCopy: (text: string) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="min-w-5xl">
				<DialogHeader>
					<DialogTitle>Clipboard item</DialogTitle>
					<DialogDescription>Full content preview and quick actions.</DialogDescription>
				</DialogHeader>
				{item && (
					<div className="space-y-4">
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<span>{formatDate(item.createdAt)}</span>
							<div className="flex items-center gap-2">
								<Badge variant="outline">{getTextContentType(item.content)}</Badge>
								<span>{item.content.length} characters</span>
							</div>
						</div>
						<ScrollArea className="h-[60vh] rounded border p-3 bg-muted/30">
							<pre className="select-text whitespace-pre-wrap text-sm leading-6">{item.content}</pre>
						</ScrollArea>
						<div className="flex items-center justify-end gap-2">
							<Button variant="outline" onClick={() => onCopy(item.content)}>
								<ClipboardCopy className="w-4 h-4 mr-2" /> Copy
							</Button>
							<Button variant="secondary" onClick={() => onOpenChange(false)}>
								Close
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
