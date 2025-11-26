import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";

export function SettingShortcutsContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Keyboard Shortcuts</CardTitle>
					<CardDescription>View and customize keyboard shortcuts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<span>Open Settings</span>
							<kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd + ,</kbd>
						</div>
						<div className="flex justify-between items-center">
							<span>Close Settings</span>
							<kbd className="px-2 py-1 text-xs bg-muted rounded">Esc</kbd>
						</div>
						<div className="flex justify-between items-center">
							<span>Search</span>
							<kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd + K</kbd>
						</div>
						<div className="flex justify-between items-center">
							<span>New Item</span>
							<kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd + N</kbd>
						</div>
					</div>
					<Button variant="outline">Customize Shortcuts</Button>
				</CardContent>
			</Card>
		</div>
	);
}
