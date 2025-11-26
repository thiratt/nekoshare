import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";

export function SettingAccessibilityContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Accessibility</CardTitle>
					<CardDescription>Customize the app for better accessibility</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Reduced Motion</Label>
							<p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
						</div>
						<Switch />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>High Contrast</Label>
							<p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
						</div>
						<Switch />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
