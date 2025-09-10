import { Camera, AlertCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";

// interface SettingAccountContentProps {
// 	onAvatarClick: (event: React.MouseEvent<HTMLDivElement>) => void;
// 	onEmailChangeClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
// 	onDeleteAccountClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
// }

// export function SettingAccountContent({
// 	onAvatarClick,
// 	onEmailChangeClick,
// 	onDeleteAccountClick,
// }: SettingAccountContentProps) {

export function SettingAccountContent({ onDialogActive }: { onDialogActive: (value: boolean) => void }) {
	const [dialogs, setDialogs] = useState({
		avatar: false,
		changeEmail: false,
		deleteAccount: false,
		changePassword: false,
		twoFaAuthentication: false,
	});

	const updateDialog = useCallback(
		(key: keyof typeof dialogs, value: boolean) => {
			setDialogs((prev) => ({ ...prev, [key]: value }));
			onDialogActive(!value);
		},
		[onDialogActive]
	);

	const tabContentAnimate = useMemo(
		() =>
			cn(
				"data-[state='active']:animate-in data-[state='active']:fade-in data-[state='active']:zoom-in-[.97] data-[state='active']:slide-in-from-bottom-6 data-[state='active']:duration-300",
				"data-[state='inactive']:animate-out data-[state='inactive']:fade-out data-[state='inactive']:zoom-out-[.97] data-[state='inactive']:slide-out-to-bottom-6 data-[state='inactive']:duration-100"
			),
		[]
	);

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
				<ScrollArea className="h-[calc(100vh-16rem)]">
					<TabsContent className={cn("space-y-4", tabContentAnimate)} value="general">
						<Card>
							<CardHeader className="relative">
								<CardTitle>รูปโปรไฟล์</CardTitle>
								<div className="absolute top-0 right-8">
									<div
										className="relative group cursor-pointer size-20 rounded-full overflow-hidden transition-all duration-200 hover:brightness-90"
										onClick={() => updateDialog("avatar", true)}
									>
										<Avatar className="w-full h-full">
											<AvatarImage src="/syncora-avatar.png" alt="Profile picture of {name}" />
											<AvatarFallback>CN</AvatarFallback>
										</Avatar>
										<div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
											<Camera size={32} className="text-white" aria-hidden="true" />
											<span className="sr-only">Change profile picture</span>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									This is your profile avatar. Click the avatar to upload a custom image from your
									device.
								</p>
							</CardContent>
							<CardFooter className="text-sm text-muted-foreground">
								Adding an avatar is optional, but it helps personalize your profile and makes it easier
								for others to recognize you.
							</CardFooter>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Display Name</CardTitle>
								<CardDescription>
									Please enter your full name, or a display name you are comfortable with.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Input className="w-[40%]" />
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">Please use 32 characters at maximum.</p>
								<Button>Save</Button>
							</CardFooter>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Email</CardTitle>
								<CardDescription>
									Enter the email addresses you want to use to log in with Vercel. Your primary email
									will be used for account-related notifications.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Input className="w-[40%]" placeholder="66011212181@msu.ac.th" readOnly />
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">
									Emails must be verified to be able to login with them or be used as primary email.
								</p>
								<Button onClick={() => updateDialog("changeEmail", true)}>Change</Button>
							</CardFooter>
						</Card>
						<Card className="bg-destructive/5 dark:bg-destructive/20">
							<CardHeader className="text-destructive">
								<CardTitle>Delete Account</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									Deleting your personal account will permanently remove all your data and content
									from the Syncora platform. This action cannot be undone. Please proceed only if
									you&apos;re absolutely sure.
								</p>
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">This action is permanent.</p>
								<Button variant="destructive" onClick={() => updateDialog("deleteAccount", true)}>
									Delete
								</Button>
							</CardFooter>
						</Card>
					</TabsContent>

					<TabsContent className={cn("space-y-4", tabContentAnimate)} value="security">
						<Card>
							<CardHeader>
								<CardTitle>Password</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									For your security, it&apos;s a good idea to use a strong, unique password and update
									it regularly.
								</p>
							</CardContent>
							<CardFooter className="justify-between">
								<p className="text-sm text-muted-foreground">
									We recommend changing your password regularly for improved security.
								</p>
								<Button onClick={() => updateDialog("changePassword", true)}>Change</Button>
							</CardFooter>
						</Card>
						<Card>
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
						</Card>
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
								<Camera size={48} className="text-white" aria-hidden="true" />
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
						<Button type="submit" disabled={false}>
							Save Changes
						</Button>
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
						<Button type="submit" disabled={false}>
							Next
						</Button>
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
							<Label className="gap-1" htmlFor="username">
								Enter your username <span className="font-semibold">thxmz</span> to continue:
							</Label>
							<Input id="username" />
						</div>
						<div className="grid w-full items-center gap-3">
							<Label className="gap-1" htmlFor="username">
								To verify, type <span className="font-semibold">delete my account</span> below:
							</Label>
							<Input id="username" />
						</div>
					</div>
					<DialogFooter className="flex justify-end gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit" disabled={true} variant="destructive">
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
						<Button type="submit" disabled={false}>
							Next
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
