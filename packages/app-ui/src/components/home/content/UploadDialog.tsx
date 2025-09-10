import * as React from "react";
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@workspace/ui/components/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { FileIcon, Users, Upload, Lock, CheckCircle, AlertCircle } from "lucide-react";
import type { Participant } from "@workspace/app-ui/types";
import { cn } from "@workspace/ui/lib/utils";

export function UploadDialog({
	all,
	// busy,
	onSubmitFile,
	onSubmitText,
	onClose,
}: {
	all: Participant[];
	// busy: boolean;
	onSubmitFile: (p: { file: File }) => Promise<void>;
	onSubmitText: (p: { name: string; text: string }) => Promise<void>;
	onClose: () => void;
}) {
	const [tab, setTab] = React.useState<"file" | "text">("file");
	const [picked, setPicked] = React.useState<Set<string>>(() => new Set(all.map((a) => a.id)));
	const [file, setFile] = React.useState<File | null>(null);
	const [name, setName] = React.useState("");
	const [text, setText] = React.useState("");
	const [dragOver, setDragOver] = React.useState(false);
	// const [uploadProgress, setUploadProgress] = React.useState(0);

	// const canSubmitFile = tab === "file" && !!file && !busy;
	// const canSubmitText = tab === "text" && text.trim().length > 0 && name.trim().length > 0 && !busy;

	// Calculate file size display
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	// Handle file drop
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			setFile(droppedFile);
			setTab("file");
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
	};

	// Toggle all participants
	const toggleAll = () => {
		setPicked(picked.size === all.length ? new Set() : new Set(all.map((p) => p.id)));
	};

	const submit = async () => {
		try {
			if (tab === "file" && file) {
				// Simulate progress for demo
				// setUploadProgress(30);
				await onSubmitFile({ file });
				// setUploadProgress(100);
			}
			if (tab === "text" && text.trim() && name.trim()) {
				// setUploadProgress(50);
				await onSubmitText({ name: name.trim(), text: text.trim() });
				// setUploadProgress(100);
			}
			onClose();
			// setTimeout(onClose, 5000); // Brief delay to show completion
		} catch (error) {
			// setUploadProgress(0);
			// Handle error appropriately
		} finally {
			setFile(null);
			setName("");
			setText("");
			setTab("file");
		}
	};

	return (
		<DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
			<DialogHeader className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
						<Upload className="w-5 h-5 text-primary" />
					</div>
					<div>
						<DialogTitle className="text-xl">อัปโหลดข้อมูล</DialogTitle>
						<DialogDescription className="flex items-center gap-1 mt-1">
							<Lock className="w-3 h-3" />
							เข้ารหัสด้วย AES-256-GCM และการแชร์อย่างปลอดภัย
						</DialogDescription>
					</div>
				</div>

				{/* {busy && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span>Uploading...</span>
							<span>{uploadProgress}%</span>
						</div>
						<Progress value={uploadProgress} className="h-2" />
					</div>
				)} */}
			</DialogHeader>

			{/* Main content area that fills remaining space */}
			<div className="flex-1">
				<div className="grid gap-6 lg:grid-cols-5 h-full">
					{/* Participants Section */}
					<div className="lg:col-span-2 space-y-4 flex flex-col">
						<div className="flex items-center justify-between">
							<Label className="flex items-center gap-2 text-sm font-medium">
								<Users className="w-4 h-4" />
								ผู้มีส่วนร่วม ({picked.size})
							</Label>
							<Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-6">
								{picked.size === all.length ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
							</Button>
						</div>

						<ScrollArea className="h-[calc(100vh-60vh)] rounded-lg border bg-muted/20">
							<div className="p-3 space-y-2">
								{all.map((p) => {
									const checked = picked.has(p.id);
									return (
										<label
											key={p.id}
											className="flex items-center gap-3 p-2 rounded-md hover:bg-background/50 cursor-pointer transition-colors"
										>
											<Checkbox
												checked={checked}
												onCheckedChange={() =>
													setPicked((s) => {
														const n = new Set(s);
														checked ? n.delete(p.id) : n.add(p.id);
														return n;
													})
												}
											/>
											<div className="flex-1 min-w-0">
												<div className="truncate text-sm font-medium">{p.name}</div>
												<Badge variant="secondary" className="text-xs mt-1">
													{p.kind}
												</Badge>
											</div>
											{checked && <CheckCircle className="w-4 h-4 text-green-500" />}
										</label>
									);
								})}
							</div>
						</ScrollArea>

						<Alert
							className={cn(
								picked.size === 0
									? "animate-in zoom-in slide-in-from-bottom fade-in"
									: "animate-out zoom-out slide-out-to-bottom opacity-0"
							)}
						>
							<AlertCircle className="w-4 h-4" />
							<AlertDescription>เลือกผู้มีส่วนร่วมอย่างน้อย 1 คนเพื่อดำเนินการต่อ</AlertDescription>
						</Alert>
					</div>

					{/* Content Section */}
					<div className="lg:col-span-3 space-y-4 flex flex-col">
						<Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="file" className="flex items-center gap-2">
									<FileIcon className="w-4 h-4" />
									อัปโหลดไฟล์
								</TabsTrigger>
								<TabsTrigger value="text" className="flex items-center gap-2">
									<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14,2 14,8 20,8" />
										<line x1="16" y1="13" x2="8" y2="13" />
										<line x1="16" y1="17" x2="8" y2="17" />
										<polyline points="10,9 9,9 8,9" />
									</svg>
									ข้อความ
								</TabsTrigger>
							</TabsList>

							<TabsContent value="file" className="mt-6 flex-1">
								<div
									className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all h-full flex items-center justify-center ${
										dragOver
											? "border-primary bg-primary/5"
											: file
												? "border-green-300 bg-green-50 dark:bg-green-950"
												: "border-gray-300 hover:border-gray-400"
									}`}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
								>
									<Input
										type="file"
										onChange={(e) => setFile(e.target.files?.[0] ?? null)}
										className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
									/>

									{file ? (
										<div className="space-y-3">
											<div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mx-auto">
												<CheckCircle className="w-6 h-6 text-green-600" />
											</div>
											<div>
												<p className="font-medium text-green-700 dark:text-green-300">
													{file.name}
												</p>
												<p className="text-sm text-green-600 dark:text-green-400 mt-1">
													{formatFileSize(file.size)}
												</p>
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setFile(null)}
												className="mt-2"
											>
												เลือกไฟล์อื่น
											</Button>
										</div>
									) : (
										<div className="space-y-3">
											<div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto">
												<Upload className="w-6 h-6 text-gray-500" />
											</div>
											<div>
												<p className="text-lg font-medium">ลากไฟล์ลงตรงนี้</p>
												<p className="text-sm text-muted-foreground">
													หรือคลิกที่นี่เพื่อเปิดไฟล์
												</p>
											</div>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="text" className="mt-6 flex-1 flex flex-col">
								<div className="space-y-3 mb-4">
									<Label htmlFor="name" className="text-sm font-medium">
										ชื่อหัวข้อ
									</Label>
									<Input
										id="name"
										placeholder="รหัสประตูบ้าน"
										value={name}
										onChange={(e) => setName(e.target.value)}
										className="w-full"
									/>
								</div>

								<div className="space-y-3 flex-1 flex flex-col">
									<Label htmlFor="content" className="text-sm font-medium">
										ข้อความ
									</Label>
									<Textarea
										id="content"
										placeholder="วางหรือพิมพ์ข้อความลงตรงนี้"
										value={text}
										onChange={(e) => setText(e.target.value)}
										className="w-full flex-1 resize-none"
									/>
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>{text.length} ตัวอักษร</span>
										{text.trim().length === 0 && (
											<span className="text-orange-500">ข้อความไม่สามารถเว้นว่างได้</span>
										)}
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</div>

			<DialogFooter className="gap-3 pt-6">
				<Button variant="outline" onClick={onClose}>
					ยกเลิก
				</Button>
				<Button
					onClick={submit}
					// disabled={!(canSubmitFile || canSubmitText) || picked.size === 0 || busy}
					className="min-w-24"
				>
					{!true ? (
						<>
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
							Uploading...
						</>
					) : (
						<>
							<Upload className="w-4 h-4 mr-2" />
							อัปโหลดข้อมูล
						</>
					)}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
