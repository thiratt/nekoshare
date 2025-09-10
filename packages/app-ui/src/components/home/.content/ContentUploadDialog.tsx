import * as React from "react";
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Loader2, Upload } from "lucide-react";
import type { Target, ContentMeta } from "@workspace/app-ui/types";

export function ContentUploadDialog({
	targets,
	busy,
	onSubmitText,
	onSubmitFile,
	onClose,
}: {
	targets: Target[];
	busy: boolean;
	onSubmitText: (p: {
		name: string;
		text: string;
		algorithm: ContentMeta["algorithm"];
		targets: Target[];
		publish: boolean;
	}) => Promise<void>;
	onSubmitFile: (p: {
		file: File;
		algorithm: ContentMeta["algorithm"];
		targets: Target[];
		publish: boolean;
	}) => Promise<void>;
	onClose: () => void;
}) {
	const [tab, setTab] = React.useState<"file" | "text">("file");
	const [algo, setAlgo] = React.useState<ContentMeta["algorithm"]>("AES-256-GCM");
	const [publish, setPublish] = React.useState(true);
	const [picked, setPicked] = React.useState<Set<string>>(new Set());
	const [file, setFile] = React.useState<File | null>(null);
	const [name, setName] = React.useState("");
	const [text, setText] = React.useState("");

	const selectedTargets = React.useMemo(() => targets.filter((t) => picked.has(t.id)), [targets, picked]);
	const canSubmitFile = tab === "file" && !!file && selectedTargets.length > 0 && !busy;
	const canSubmitText = tab === "text" && text.trim().length > 0 && selectedTargets.length > 0 && !busy;

	const submit = async () => {
		if (tab === "file" && file) {
			await onSubmitFile({ file, algorithm: algo, targets: selectedTargets, publish });
			onClose();
		} else if (tab === "text" && text.trim()) {
			await onSubmitText({
				name: name.trim(),
				text: text.trim(),
				algorithm: algo,
				targets: selectedTargets,
				publish,
			});
			onClose();
		}
	};

	return (
		<DialogContent className="sm:max-w-[680px]">
			<DialogHeader>
				<DialogTitle>Upload encrypted content</DialogTitle>
				<DialogDescription>
					Choose a file or paste text, pick who can access, and we’ll encrypt before transfer.
				</DialogDescription>
			</DialogHeader>

			<Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
				<TabsList className="mb-3">
					<TabsTrigger value="file">File</TabsTrigger>
					<TabsTrigger value="text">Text</TabsTrigger>
				</TabsList>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-3">
						<Label>Encryption</Label>
						<RadioGroup
							value={algo}
							onValueChange={(v) => setAlgo(v as any)}
							className="grid grid-cols-1 gap-2"
						>
							<label className="flex items-center gap-2">
								<RadioGroupItem value="XChaCha20-Poly1305" /> XChaCha20-Poly1305{" "}
								<Badge variant="outline" className="ml-2">
									default
								</Badge>
							</label>
							<label className="flex items-center gap-2">
								<RadioGroupItem value="AES-256-GCM" /> AES-256-GCM
							</label>
						</RadioGroup>

						<div className="pt-4 space-y-2">
							<Label>Visibility</Label>
							<label className="flex items-center gap-2 text-sm">
								<Checkbox checked={publish} onCheckedChange={(v) => setPublish(Boolean(v))} />
								Publish to recipients immediately
							</label>
						</div>

						<div className="pt-4">
							<Label>Targets (devices & buddies)</Label>
							<ScrollArea className="h-40 rounded border p-2">
								<div className="space-y-2">
									{targets.map((t) => {
										const checked = picked.has(t.id);
										return (
											<label key={t.id} className="flex items-center gap-2 text-sm">
												<Checkbox
													checked={checked}
													onCheckedChange={() =>
														setPicked((s) => {
															const n = new Set(s);
															checked ? n.delete(t.id) : n.add(t.id);
															return n;
														})
													}
												/>
												<span className="truncate">{t.name}</span>
												<Badge variant="outline" className="ml-auto">
													{t.kind}
												</Badge>
											</label>
										);
									})}
								</div>
							</ScrollArea>
						</div>
					</div>

					<div className="space-y-3">
						<TabsContent value="file">
							<Label htmlFor="file">Select file</Label>
							<Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
							{file && (
								<p className="text-xs text-muted-foreground">
									{file.name} • {(file.size / 1024).toFixed(1)} KB
								</p>
							)}
							<div className="pt-4">
								<Button onClick={submit} disabled={!canSubmitFile} className="gap-2">
									{busy ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<Upload className="w-4 h-4" />
									)}
									Upload
								</Button>
							</div>
						</TabsContent>

						<TabsContent value="text">
							<Label htmlFor="name">Content name</Label>
							<Input
								id="name"
								placeholder="untitled.txt"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
							<Label htmlFor="text" className="mt-2">
								Paste text
							</Label>
							<Textarea
								id="text"
								rows={8}
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="Paste your text here…"
							/>
							<div className="pt-4">
								<Button onClick={submit} disabled={!canSubmitText} className="gap-2">
									{busy ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<Upload className="w-4 h-4" />
									)}
									Upload
								</Button>
							</div>
						</TabsContent>
					</div>
				</div>
			</Tabs>

			<DialogFooter>
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
