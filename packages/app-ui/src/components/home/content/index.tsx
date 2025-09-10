import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { Progress } from "@workspace/ui/components/progress";
import {
	Users,
	Shield,
	CalendarClock,
	Hash,
	HardDrive,
	Share2,
	Trash2,
	Timer,
	Upload,
	Copy,
	CheckCircle2,
	AlertTriangle,
	Globe,
	Lock,
	QrCode,
} from "lucide-react";

import { useContentDetail } from "@workspace/app-ui/hooks/useEncryptedContent";
import { UploadDialog } from "./UploadDialog";
import { PublishDialog } from "./PublishDialog";
import { ManageParticipantsDialog } from "./ManageParticipantsDialog";
import { bytes, when, mmss } from "@workspace/app-ui/libs/utils";
import { AuthLoginWithQrCode2 } from "../../auth/qr-auth";

export function ContentUI(): React.JSX.Element {
	const {
		content,
		participants,
		publicUrl,
		expiresAt,
		isExpired,
		timeLeftMs,
		uploadText,
		uploadFile,
		setParticipants,
		publishWithTTL,
		remove,
	} = useContentDetail();

	const [uploadOpen, setUploadOpen] = React.useState(false);
	const [manageOpen, setManageOpen] = React.useState(false);
	const [publishOpen, setPublishOpen] = React.useState(false);
	const [deleteOpen, setDeleteOpen] = React.useState(false);
	const [qrCodeOpen, setQrcodeOpen] = React.useState(false);
	const [copySuccess, setCopySuccess] = React.useState(false);

	// Handle copy to clipboard with feedback
	const handleCopyLink = React.useCallback(async () => {
		if (!publicUrl) return;

		try {
			await navigator.clipboard.writeText(publicUrl);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (error) {
			console.error("Failed to copy link:", error);
		}
	}, [publicUrl]);

	// Calculate expiry progress
	const expiryProgress = React.useMemo(() => {
		if (!expiresAt || !timeLeftMs) return 0;
		const totalTime = new Date(expiresAt).getTime() - (Date.now() - timeLeftMs);
		return Math.max(0, Math.min(100, (timeLeftMs / totalTime) * 100));
	}, [expiresAt, timeLeftMs]);

	return (
		<div className="h-full">
			{content ? (
				<div className="space-y-4">
					{/* Header Card */}
					<Card>
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="space-y-1 min-w-0 flex-1">
									<div className="flex items-center gap-3">
										<CardTitle>{content.name}</CardTitle>
										<div className="flex items-center gap-2">
											{content.published ? (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Badge className="gap-1">
																<Globe className="w-3 h-3" />
																สาธารณะ
															</Badge>
														</TooltipTrigger>
														<TooltipContent>
															<p>Content is publicly accessible via link</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											) : (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Badge variant="outline" className="gap-1">
																<Lock className="w-3 h-3" />
																ส่วนตัว
															</Badge>
														</TooltipTrigger>
														<TooltipContent>
															<p>Content is only accessible to selected participants</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											)}
											{isExpired && (
												<Badge variant="destructive" className="gap-1">
													<AlertTriangle className="w-3 h-3" />
													Expired
												</Badge>
											)}
										</div>
									</div>
									<CardDescription>
										{content.type === "file" ? "Binary file" : "ข้อความ"}
										{/* • Encrypted with AES-256-GCM */} • {bytes(content.size)}
									</CardDescription>
								</div>
								<TooltipProvider>
									<div className="flex items-center gap-2 ml-4">
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													className="gap-2"
													onClick={() => setUploadOpen(true)}
												>
													<Upload className="w-4 h-4" />
													<span className="hidden sm:inline">อัปโหลด</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>Replace current content</TooltipContent>
										</Tooltip>

										{!content.published && (
											<Button size="sm" className="gap-2" onClick={() => setPublishOpen(true)}>
												<Share2 className="w-4 h-4" />
												<span className="hidden sm:inline">เผยแพร่</span>
											</Button>
										)}

										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													disabled={content.published}
													className="gap-2"
													onClick={() => setManageOpen(true)}
												>
													<Users className="w-4 h-4" />
													<span className="hidden sm:inline">จัดการ</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												{content.published
													? "Cannot manage participants after publishing"
													: "Manage who can access this content"}
											</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => setDeleteOpen(true)}
													className="gap-2"
												>
													<Trash2 className="w-4 h-4" />
													<span className="hidden sm:inline">ลบ</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>Permanently delete this content</TooltipContent>
										</Tooltip>
									</div>
								</TooltipProvider>
							</div>
						</CardHeader>
					</Card>

					{/* Content Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
						{/* Metadata */}
						<Card className="lg:col-span-4">
							<CardHeader>
								<CardTitle className="text-base">รายละเอียดข้อมูล</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3">
									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-2 text-muted-foreground">
											<HardDrive className="w-4 h-4" />
											ขนาด
										</div>
										<span className="font-medium">{bytes(content.size)}</span>
									</div>

									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-2 text-muted-foreground">
											<CalendarClock className="w-4 h-4" />
											อัปโหลดวันที่
										</div>
										<span className="font-medium">{when(content.uploadedAt)}</span>
									</div>

									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-2 text-muted-foreground">
											<Shield className="w-4 h-4" />
											รูปแบบการเข้ารหัส
										</div>
										<span className="font-medium">{content.algorithm}</span>
									</div>

									<div className="flex items-start justify-between text-sm">
										<div className="flex items-center gap-2 text-muted-foreground">
											<Hash className="w-4 h-4" />
											Checksum
										</div>
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate cursor-help">
														{content.checksum}
													</span>
												</TooltipTrigger>
												<TooltipContent className="font-mono text-xs">
													{content.checksum}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								</div>

								{/* <Separator /> */}

								{/* <div className="space-y-3">
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Eye className="w-4 h-4" />
									Views
								</div>
								<span className="font-medium tabular-nums">{content.views.toLocaleString()}</span>
							</div>

							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Download className="w-4 h-4" />
									Downloads
								</div>
								<span className="font-medium tabular-nums">{content.downloads.toLocaleString()}</span>
							</div>
						</div> */}
							</CardContent>
						</Card>

						{/* Participants */}
						<Card className="lg:col-span-4">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-base">สิทธิ์ในการเข้าถึง</CardTitle>
									{!content.published && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setManageOpen(true)}
											className="text-xs"
										>
											แก้ไข
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent>
								{content.participants === null ? (
									<div className="flex items-center gap-2 text-sm">
										<Globe className="w-4 h-4 text-green-600" />
										<span>การเผยแพร่แบบสาธารณะถูกเปิดใช้งาน</span>
									</div>
								) : content.participants.length === 0 ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Lock className="w-4 h-4" />
										<span>No participants selected</span>
									</div>
								) : (
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
											<Users className="w-4 h-4" />
											<span>
												{content.participants.length} ผู้มีส่วนร่วม
												{/* {content.participants.length !== 1 ? "s" : ""} */}
											</span>
										</div>
										<ScrollArea className="h-32">
											<div className="space-y-1">
												{content.participants.map((p) => (
													<div key={p.id} className="flex items-center gap-2 text-sm">
														<Badge variant="secondary" className="text-xs px-2 py-0">
															{p.kind}
														</Badge>
														<span className="truncate flex-1">{p.name}</span>
													</div>
												))}
											</div>
										</ScrollArea>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Publishing & Sharing */}
						<Card className="lg:col-span-4">
							<CardHeader>
								<CardTitle className="text-base">การแชร์สาธารณะ</CardTitle>
							</CardHeader>
							<CardContent>
								{content.published ? (
									<div className="space-y-4">
										{/* Expiry info with progress */}
										<div className="space-y-2">
											<div className="flex items-center justify-between text-sm">
												<div className="flex items-center gap-2 text-muted-foreground">
													<Timer className="w-4 h-4" />
													สถานะ
												</div>
												<span
													className={`font-medium ${isExpired ? "text-destructive" : "text-green-600"}`}
												>
													{isExpired ? "Expired" : `${mmss(timeLeftMs)} left`}
												</span>
											</div>
											{!isExpired && (
												<div className="space-y-1">
													<Progress value={expiryProgress} className="h-1" />
													<p className="text-xs text-muted-foreground">
														จะหมดอายุใน{" "}
														{when(
															expiresAt ? new Date(expiresAt).toISOString() : undefined
														)}
													</p>
												</div>
											)}
										</div>

										<Separator />

										{/* Public link */}
										<div className="space-y-2">
											<p className="text-sm font-medium">ลิงก์สาธารณะ</p>
											{publicUrl ? (
												<div className="space-y-2">
													<div className="flex items-center gap-2">
														<input
															readOnly
															value={publicUrl}
															className="flex-1 px-3 py-1 text-xs border rounded bg-muted font-mono"
														/>
														<Button
															size="sm"
															variant="outline"
															onClick={handleCopyLink}
															className="gap-2 shrink-0"
														>
															{copySuccess ? (
																<CheckCircle2 className="w-4 h-4 text-green-600" />
															) : (
																<Copy className="w-4 h-4" />
															)}
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => setQrcodeOpen(true)}
														>
															<QrCode />
														</Button>
													</div>
													<p className="text-xs text-muted-foreground">
														ทุกคนที่มีลิงก์นี้จะสามารถเข้าถึงข้อมูลนี้ได้
													</p>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">Generating link...</p>
											)}
										</div>
									</div>
								) : (
									<div className="space-y-3">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Lock className="w-4 h-4" />
											<span>ไม่ได้เผยแพร่</span>
										</div>
										<p className="text-sm text-muted-foreground">
											เนื้อหาสามารถเข้าถึงได้สำหรับผู้เข้าร่วมที่เลือกเท่านั้น
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* QR Code Dialog  */}
					<Dialog open={qrCodeOpen} onOpenChange={setQrcodeOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<QrCode className="w-5 h-5" />
									QR Code
								</DialogTitle>
								<DialogDescription>
									สแกน QR Code ด้านล่างเพื่อความสะดวกในการเข้าถึงข้อมูล
								</DialogDescription>
							</DialogHeader>
							<AuthLoginWithQrCode2 />
						</DialogContent>
					</Dialog>

					{/* Delete Dialog */}
					<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>ลบข้อมูลนี้?</AlertDialogTitle>
								<AlertDialogDescription>
									ระบบจะลบ "{content.name}" ออกจากระบบ การกระทำที่ไม่สามารถยกเลิกได้
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => remove()}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									ยืนยัน
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>

					{/* Publish */}
					<Dialog open={publishOpen} onOpenChange={setPublishOpen}>
						<PublishDialog
							onConfirm={async (ttl) => {
								await publishWithTTL(ttl);
								setPublishOpen(false);
							}}
							onClose={() => setPublishOpen(false)}
						/>
					</Dialog>

					{/* Manage participants */}
					<Dialog open={manageOpen} onOpenChange={setManageOpen}>
						{content.participants && (
							<ManageParticipantsDialog
								all={participants}
								value={content.participants}
								onChange={setParticipants}
								onClose={() => setManageOpen(false)}
							/>
						)}
					</Dialog>
				</div>
			) : (
				<Card className="h-full">
					<CardContent className="h-full flex flex-col items-center justify-center p-8">
						<div className="max-w-md w-full text-center space-y-6">
							<div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
								<Shield className="w-8 h-8 text-muted-foreground" />
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-semibold">ยังไม่มีข้อมูลการอัปโหลด</h2>
								<p className="text-muted-foreground w-full">สามารถอัปโหลดไฟล์หรือข้อความได้ที่นี่</p>
							</div>
							<Button size="lg" className="gap-2" onClick={() => setUploadOpen(true)}>
								<Upload className="w-4 h-4" />
								อัปโหลดข้อมูล
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Upload */}
			<Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
				<UploadDialog
					all={participants}
					onSubmitFile={uploadFile}
					onSubmitText={uploadText}
					onClose={() => setUploadOpen(false)}
				/>
			</Dialog>
		</div>
	);
}
