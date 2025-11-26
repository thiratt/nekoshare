import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";

export function SettingNotificationsContent() {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Notification Preferences</CardTitle>
					<CardDescription>Choose how you want to be notified</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Enable Notifications</Label>
							<p className="text-sm text-muted-foreground">Receive notifications from the app</p>
						</div>
						<Switch />
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Email Notifications</Label>
							<p className="text-sm text-muted-foreground">Receive updates via email</p>
						</div>
						<Switch />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Push Notifications</Label>
							<p className="text-sm text-muted-foreground">Receive push notifications</p>
						</div>
						<Switch />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
