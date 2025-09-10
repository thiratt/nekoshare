import * as React from "react";
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Badge } from "@workspace/ui/components/badge";
import type { Target } from "@workspace/app-ui/types";

export function ContentTargetsDialog({
	all,
	selected,
	onChange,
	onClose,
}: {
	all: Target[];
	selected: Target[];
	onChange: (next: Target[]) => void;
	onClose: () => void;
}) {
	const picked = React.useMemo(() => new Set(selected.map((t) => t.id)), [selected]);
	const toggle = (id: string) => {
		const n = new Set(picked);
		n.has(id) ? n.delete(id) : n.add(id);
		onChange(all.filter((t) => n.has(t.id)));
	};
	return (
		<DialogContent className="sm:max-w-[520px]">
			<DialogHeader>
				<DialogTitle>Manage targets</DialogTitle>
				<DialogDescription>Choose devices and buddies that can access this content.</DialogDescription>
			</DialogHeader>
			<ScrollArea className="h-64 rounded border p-2">
				<div className="space-y-2">
					{all.map((t) => (
						<label key={t.id} className="flex items-center gap-2 text-sm">
							<Checkbox checked={picked.has(t.id)} onCheckedChange={() => toggle(t.id)} />
							<span className="truncate">{t.name}</span>
							<Badge variant="outline" className="ml-auto">
								{t.kind}
							</Badge>
						</label>
					))}
				</div>
			</ScrollArea>
			<DialogFooter>
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
