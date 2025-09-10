import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { Dialog, DialogTrigger } from "@workspace/ui/components/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "@workspace/ui/components/alert-dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { HardDrive, Users, Shield, CalendarClock, Hash, Download, Eye, Trash2, Share2, Cog } from "lucide-react";

import { useEncryptedContent } from "@workspace/app-ui/hooks/useEncryptedContent";
import { ContentUploadDialog } from "./ContentUploadDialog";
import { ContentTargetsDialog } from "./ContentTargetsDialog";
import { formatBytes, when } from "@workspace/app-ui/libs/content-utils";

export function ContentUI(): React.JSX.Element {
	const { content, targets, uploading, uploadText, uploadFile, setTargets, togglePublish, remove } =
		useEncryptedContent();

	const [uploadOpen, setUploadOpen] = React.useState(false);
	const [targetOpen, setTargetOpen] = React.useState(false);
	const [deleteOpen, setDeleteOpen] = React.useState(false);

	if (!content) {
		// Empty state
		return (
			<Card className="h-[calc(100vh-8rem)]">
				<CardHeader>
					<CardTitle>Encrypted content</CardTitle>
					<CardDescription>
						Upload a file or text, encrypt it, and share with your devices or buddies.
					</CardDescription>
				</CardHeader>
				<CardContent className="h-full">
					<div className="h-full flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed rounded-lg">
						<Shield className="w-8 h-8 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">No content yet.</p>
						<Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
							<DialogTrigger asChild>
								<Button>Upload content</Button>
							</DialogTrigger>
							<ContentUploadDialog
								targets={targets}
								busy={uploading}
								onSubmitText={uploadText}
								onSubmitFile={uploadFile}
								onClose={() => setUploadOpen(false)}
							/>
						</Dialog>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Content present
	return (
		<Card className="h-[calc(100vh-8rem)]">
			<CardHeader className="flex items-start justify-between">
				<div className="space-y-1">
					<CardTitle className="flex items-center gap-2">
						{content.name}
						{content.published ? <Badge>Published</Badge> : <Badge variant="outline">Private</Badge>}
					</CardTitle>
					<CardDescription>Encrypted package • {content.type === "file" ? "Binary" : "Text"}</CardDescription>
				</div>

				<div className="flex items-center gap-2">
					{/* Publish toggle */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={content.published ? "secondary" : "outline"}
								size="sm"
								onClick={() => togglePublish(!content.published)}
								className="gap-2"
							>
								<Share2 className="w-4 h-4" />
								{content.published ? "Unpublish" : "Publish"}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{content.published ? "Hide from recipients" : "Make visible to recipients"}
						</TooltipContent>
					</Tooltip>

					{/* Targets dialog */}
					<Dialog open={targetOpen} onOpenChange={setTargetOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Users className="w-4 h-4" /> Targets
							</Button>
						</DialogTrigger>
						<ContentTargetsDialog
							all={targets}
							selected={content.targets}
							onChange={(n) => setTargets(n)}
							onClose={() => setTargetOpen(false)}
						/>
					</Dialog>

					{/* Delete confirm */}
					<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete content?</AlertDialogTitle>
								<AlertDialogDescription>
									This will remove the encrypted package and revoke access for all recipients.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										remove();
									}}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
						<Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteOpen(true)}>
							<Trash2 className="w-4 h-4" /> Delete
						</Button>
					</AlertDialog>
				</div>
			</CardHeader>

			<CardContent className="h-full">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					{/* Meta panel */}
					<div className="rounded-md border bg-card">
						<div className="p-4 space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<HardDrive className="w-4 h-4 text-muted-foreground" />
								<span className="text-muted-foreground">Size</span>
								<span className="ml-auto">{formatBytes(content.size)}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<CalendarClock className="w-4 h-4 text-muted-foreground" />
								<span className="text-muted-foreground">Uploaded</span>
								<span className="ml-auto">{when(content.uploadedAt)}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Shield className="w-4 h-4 text-muted-foreground" />
								<span className="text-muted-foreground">Algorithm</span>
								<span className="ml-auto">{content.algorithm}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Hash className="w-4 h-4 text-muted-foreground" />
								<span className="text-muted-foreground">Checksum</span>
								<span className="ml-auto truncate max-w-[180px] font-mono text-xs">
									{content.checksum}
								</span>
							</div>
							<Separator />
							<div className="flex items-center gap-2 text-sm">
								<Eye className="w-4 h-4 text-muted-foreground" />
								<span className="text-muted-foreground">Views</span>
								<span className="ml-auto tabular-nums">{content.views}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Download className="w-4 h-4 text-muted-foreground" />
								<span className="text-muted-foreground">Downloads</span>
								<span className="ml-auto tabular-nums">{content.downloads}</span>
							</div>
						</div>
					</div>

					{/* Targets panel */}
					<div className="rounded-md border bg-card">
						<div className="p-4">
							<div className="flex items-center justify-between mb-2">
								<h3 className="text-sm font-medium">Recipients</h3>
								<Button variant="outline" size="sm" onClick={() => setTargetOpen(true)}>
									Manage
								</Button>
							</div>
							{content.targets.length === 0 ? (
								<p className="text-sm text-muted-foreground">No targets assigned.</p>
							) : (
								<ScrollArea className="h-40">
									<ul className="space-y-1 text-sm">
										{content.targets.map((t) => (
											<li key={t.id} className="flex items-center gap-2">
												<Badge variant="outline">{t.kind}</Badge>
												<span className="truncate">{t.name}</span>
											</li>
										))}
									</ul>
								</ScrollArea>
							)}
						</div>
					</div>

					{/* Quick actions / notes */}
					<div className="rounded-md border bg-card">
						<div className="p-4 space-y-3">
							<h3 className="text-sm font-medium flex items-center gap-2">
								<Cog className="w-4 h-4" /> Quick actions
							</h3>
							<Button variant="outline" className="w-full">
								Copy content ID
							</Button>
							<Button variant="outline" className="w-full">
								Reshare link
							</Button>
							<p className="text-xs text-muted-foreground">
								Content is stored encrypted end-to-end. Only selected recipients can decrypt.
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
