import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";

export function SettingPrivacyContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Privacy Settings</CardTitle>
					<CardDescription>Control your privacy and data sharing preferences</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Data Collection</Label>
							<p className="text-sm text-muted-foreground">Allow anonymous usage analytics</p>
						</div>
						<Switch />
					</div>
					<Separator />
					<Button variant="outline">Download My Data</Button>
					<Button variant="destructive">Delete Account</Button>
				</CardContent>
			</Card>
		</div>
	);
}
