import { useCallback, useState, memo, type FC, type ChangeEvent } from "react";

import { LuCamera } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

import { cn } from "@workspace/ui/lib/utils";

type DialogKey = "avatar" | "changeEmail" | "deleteAccount" | "changePassword" | "twoFaAuthentication";

type DialogState = Record<DialogKey, boolean>;

const INITIAL_DIALOG_STATE: DialogState = {
	avatar: false,
	changeEmail: false,
	deleteAccount: false,
	changePassword: false,
	twoFaAuthentication: false,
};

const TAB_ANIMATION_CLASSES = cn(
	"data-[state='active']:animate-in data-[state='active']:fade-in data-[state='active']:zoom-in-[.97] data-[state='active']:slide-in-from-bottom-6 data-[state='active']:duration-300",
	"data-[state='inactive']:animate-out data-[state='inactive']:fade-out data-[state='inactive']:zoom-out-[.97] data-[state='inactive']:slide-out-to-bottom-6 data-[state='inactive']:duration-100"
);

interface SettingAccountContentProps {
	onDialogActive: (value: boolean) => void;
}

export const SettingAccountContent: FC<SettingAccountContentProps> = memo(function SettingAccountContent({
	onDialogActive,
}) {
	const [dialogs, setDialogs] = useState<DialogState>(INITIAL_DIALOG_STATE);

	const updateDialog = useCallback(
		(key: DialogKey, value: boolean) => {
			setDialogs((prev) => ({ ...prev, [key]: value }));
			onDialogActive(!value);
		},
		[onDialogActive]
	);

	const openAvatarDialog = useCallback(() => updateDialog("avatar", true), [updateDialog]);
	const openEmailDialog = useCallback(() => updateDialog("changeEmail", true), [updateDialog]);
	const openDeleteDialog = useCallback(() => updateDialog("deleteAccount", true), [updateDialog]);
	const openPasswordDialog = useCallback(() => updateDialog("changePassword", true), [updateDialog]);

	const handleAvatarUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// TODO: Implement avatar upload logic
			console.log("Avatar file selected:", file);
		}
	}, []);

	return (
		<div className="space-y-2 rounded-full">
			{/* <Alert variant="destructive">
				<AlertCircle />
				<AlertTitle>Account Locked</AlertTitle>
				<AlertDescription>
					Your account has been temporarily locked due to suspicious activity. Please check your email for
					instructions to unlock your account or contact support.
				</AlertDescription>
			</Alert> */}
			<Tabs defaultValue="general">
				<TabsList className="gap-1">
					<TabsTrigger value="general">ทั่วไป</TabsTrigger>
					<TabsTrigger value="security">ความปลอดภัย</TabsTrigger>
				</TabsList>
				<ScrollArea className="h-[calc(100vh-14rem)]">
					<TabsContent className={cn("space-y-4", TAB_ANIMATION_CLASSES)} value="general">
						<Card>
							<CardHeader className="relative">
								<CardTitle>รูปโปรไฟล์</CardTitle>
								<div className="absolute top-0 right-8">
									<button
										type="button"
										className="relative group cursor-pointer size-20 rounded-full overflow-hidden transition-all duration-200 hover:brightness-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
										onClick={openAvatarDialog}
										aria-label="Change profile picture"
									>
										<Avatar className="w-full h-full">
											<AvatarImage src="/syncora-avatar.png" alt="Profile picture of {name}" />
											<AvatarFallback>CN</AvatarFallback>
										</Avatar>
										<div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
											<LuCamera size={32} className="text-white" aria-hidden="true" />
											<span className="sr-only">Change profile picture</span>
										</div>
									</button>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									นี่คือรูปโปรไฟล์ของคุณ คลิกที่รูปเพื่ออัปโหลดภาพจากอุปกรณ์ของคุณ
								</p>
							</CardContent>
							<CardFooter className="text-sm text-muted-foreground">
								การใส่รูปไม่จำเป็น แต่จะช่วยให้โปรไฟล์ดูเป็นตัวคุณมากขึ้น และทำให้คนอื่นจำคุณได้ง่าย
							</CardFooter>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>ชื่อผู้ใช้งาน</CardTitle>
								<CardDescription>
									ชื่อผู้ใช้งานจะทำให้ผู้ใช้งานอื่น ๆ ค้นหาคุณได้ง่ายขึ้น
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Input className="w-[40%]" />
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">ชื่อผู้ใช้งานต้องไม่เกิน 16 ตัวอักษร.</p>
								<Button>บันทึก</Button>
							</CardFooter>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>อีเมล</CardTitle>
								<CardDescription>
									กรอกอีเมลที่คุณต้องการใช้ในการเข้าสู่ระบบกับ NekoShare
									อีเมลหลักจะใช้สำหรับรับการแจ้งเตือนเกี่ยวกับบัญชีของคุณ
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Input className="w-[40%]" placeholder="66011212181@msu.ac.th" readOnly />
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">
									อีเมลต้องได้รับการยืนยันก่อนจึงจะใช้เข้าสู่ระบบหรือเป็นอีเมลหลักได้
								</p>
								<Button onClick={openEmailDialog}>เปลี่ยน</Button>
							</CardFooter>
						</Card>
						<Card className="bg-destructive/5 dark:bg-destructive/20">
							<CardHeader className="text-destructive">
								<CardTitle>ลบบัญชี</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									การลบบัญชีของคุณจะลบข้อมูลและเนื้อหาทั้งหมดออกจากระบบ NekoShare อย่างถาวร
									และไม่สามารถกู้คืนได้ กรุณาทำเฉพาะเมื่อคุณแน่ใจจริง ๆ
								</p>
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
								<Button variant="destructive" onClick={openDeleteDialog}>
									ลบ
								</Button>
							</CardFooter>
						</Card>
					</TabsContent>

					<TabsContent className={cn("space-y-4", TAB_ANIMATION_CLASSES)} value="security">
						<Card>
							<CardHeader>
								<CardTitle>รหัสผ่าน</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									เพื่อความปลอดภัยของคุณ รหัสผ่านควรเป็นรหัสผ่านที่แข็งแกร่ง เช่น
									มีการผสมตัวอักษรพิมพ์เล็กและพิมพ์ใหญ่ และเปลี่ยนเป็นระยะ ๆ
								</p>
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">
									เราแนะนำให้คุณเปลี่ยนรหัสผ่านเป็นประจำ เพื่อความปลอดภัยที่ดียิ่งขึ้น
								</p>
								<Button onClick={openPasswordDialog}>เปลี่ยน</Button>
							</CardFooter>
						</Card>
						{/* <Card>
							<CardHeader>
								<CardTitle>Sign-in Methods</CardTitle>
								<CardDescription>
									Customize how you access your account. Link your Git profiles and set up passkeys
									for seamless, secure authentication.
								</CardDescription>
							</CardHeader>
							<CardContent>Coming soon!</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Two-Factor Authentication</CardTitle>
								<CardDescription>
									Enhance your account security by requiring a second step of verification when
									signing in. Choose one or more authentication methods below.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex justify-between items-center border-2 rounded-lg rounded-b-none p-4">
									<div>
										<h4 className="font-semibold">Email</h4>
										<p className="text-sm text-muted-foreground">
											Receive a verification code via your registered email address.
										</p>
									</div>
									<Switch aria-label="Toggle email 2FA" />
								</div>

								<div className="flex justify-between items-center border-x-2 p-4">
									<div>
										<h4 className="font-semibold">Authenticator App (TOTP)</h4>
										<p className="text-sm text-muted-foreground">
											Use a time-based one-time password (TOTP) app like Google Authenticator or
											Authy for secure code generation.
										</p>
									</div>
									<Switch aria-label="Toggle TOTP 2FA" />
								</div>

								<div className="flex justify-between items-center border-2 rounded-lg rounded-t-none p-4">
									<div>
										<h4 className="font-semibold">Device</h4>
										<p className="text-sm text-muted-foreground">
											Approve sign-ins using a trusted device already connected to your account.
										</p>
									</div>
									<Switch aria-label="Toggle device 2FA" />
								</div>
							</CardContent>
						</Card> */}
					</TabsContent>
				</ScrollArea>
			</Tabs>

			{/* Change Avatar Dialog */}
			<Dialog open={dialogs.avatar} onOpenChange={(open) => updateDialog("avatar", open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Avatar</DialogTitle>
						<DialogDescription>
							Upload a new image to update your profile picture. Ensure the image is clear and
							appropriately sized.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 py-2">
						<label
							htmlFor="avatar-upload"
							className="relative group cursor-pointer size-64 rounded-full overflow-hidden transition-all duration-200 hover:brightness-90 focus-within:ring-2 focus-within:ring-blue-500"
						>
							<Avatar className="w-full h-full">
								<AvatarImage src="/syncora-avatar.png" alt="Profile picture" />
								<AvatarFallback>CN</AvatarFallback>
							</Avatar>
							<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
								<LuCamera size={48} className="text-white" aria-hidden="true" />
								<span className="sr-only">Upload new profile picture</span>
							</div>
							<input
								id="avatar-upload"
								type="file"
								accept="image/*"
								className="hidden"
								aria-label="Upload new profile picture"
							/>
						</label>
						<p className="text-sm text-muted-foreground">Click an image to upload</p>
					</div>
					<DialogFooter className="flex justify-end gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Save Changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Change Email Address */}
			<Dialog open={dialogs.changeEmail} onOpenChange={(open) => updateDialog("changeEmail", open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Email Address</DialogTitle>
						<DialogDescription>
							Please enter your new email address below. You will receive a confirmation email to verify
							the change.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-2">
						<div className="grid w-full items-center gap-3">
							<Label htmlFor="newEmail">New Email Address</Label>
							<Input type="email" id="newEmail" />
						</div>
						<div className="grid w-full items-center gap-3">
							<Label htmlFor="confirmEmail">Confirm New Email Address</Label>
							<Input type="email" id="confirmEmail" />
						</div>
					</div>
					<DialogFooter className="flex justify-end gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Next</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Account Dialog */}
			<Dialog open={dialogs.deleteAccount} onOpenChange={(open) => updateDialog("deleteAccount", open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Account</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete your account? This action is permanent and cannot be undone.
							All your data will be lost, and you will be logged out.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<div className="grid w-full items-center gap-3">
							<Label className="gap-1" htmlFor="delete-username">
								Enter your username <span className="font-semibold">thxmz</span> to continue:
							</Label>
							<Input id="delete-username" autoComplete="off" />
						</div>
						<div className="grid w-full items-center gap-3">
							<Label className="gap-1" htmlFor="delete-confirmation">
								To verify, type <span className="font-semibold">delete my account</span> below:
							</Label>
							<Input id="delete-confirmation" autoComplete="off" />
						</div>
					</div>
					<DialogFooter className="flex justify-end gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit" disabled variant="destructive">
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Change Password Dialog */}
			<Dialog open={dialogs.changePassword} onOpenChange={(open) => updateDialog("changePassword", open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Password</DialogTitle>
						<DialogDescription>
							To ensure the security of your account, please enter your current password and select a new
							one. Your new password must be at least 8 characters long and should be a mix of letters,
							numbers, and symbols.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-2">
						<div className="grid w-full items-center gap-3">
							<Label htmlFor="oldPassword">Old Password</Label>
							<Input type="password" id="oldPassword" />
						</div>
						<div className="grid w-full items-center gap-3">
							<Label htmlFor="newPassword">New Password</Label>
							<Input type="password" id="newPassword" />
						</div>
						<div className="grid w-full items-center gap-3">
							<Label htmlFor="confirmNewPassword">Confirm Password</Label>
							<Input type="password" id="confirmNewPassword" />
						</div>
					</div>
					<DialogFooter className="flex justify-end gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Next</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
});
