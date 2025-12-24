import { type ChangeEvent, memo } from "react";

import { LuCamera } from "react-icons/lu";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
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

interface LogoutDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

interface AvatarDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	avatarUrl?: string;
	onUpload?: (file: File) => void;
}
interface EmailDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit?: (newEmail: string, confirmEmail: string) => void;
}
interface PasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit?: (oldPassword: string, newPassword: string) => void;
}
interface DeleteAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	username: string;
	onConfirm?: () => void;
}

export const LogoutDialog = memo(function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ออกจากระบบ</AlertDialogTitle>
					<AlertDialogDescription>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>ออกจากระบบ</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});

export const AvatarDialog = memo(function AvatarDialog({
	open,
	onOpenChange,
	avatarUrl = "/syncora-avatar.png",
	onUpload,
}: AvatarDialogProps) {
	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file && onUpload) {
			onUpload(file);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Avatar</DialogTitle>
					<DialogDescription>
						Upload a new image to update your profile picture. Ensure the image is clear and appropriately
						sized.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col items-center gap-4 py-2">
					<label
						htmlFor="avatar-upload"
						className="relative group cursor-pointer size-64 rounded-full overflow-hidden transition-all duration-200 hover:brightness-90 focus-within:ring-2 focus-within:ring-blue-500"
					>
						<Avatar className="w-full h-full">
							<AvatarImage src={avatarUrl} alt="Profile picture" />
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
							onChange={handleFileChange}
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
	);
});

export const EmailDialog = memo(function EmailDialog({ open, onOpenChange }: EmailDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Email Address</DialogTitle>
					<DialogDescription>
						Please enter your new email address below. You will receive a confirmation email to verify the
						change.
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
	);
});

export const PasswordDialog = memo(function PasswordDialog({ open, onOpenChange }: PasswordDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Password</DialogTitle>
					<DialogDescription>
						To ensure the security of your account, please enter your current password and select a new one.
						Your new password must be at least 8 characters long and should be a mix of letters, numbers,
						and symbols.
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
	);
});

export const DeleteAccountDialog = memo(function DeleteAccountDialog({
	open,
	onOpenChange,
	username,
	onConfirm,
}: DeleteAccountDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Account</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete your account? This action is permanent and cannot be undone. All
						your data will be lost, and you will be logged out.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="grid w-full items-center gap-3">
						<Label className="gap-1" htmlFor="delete-username">
							Enter your username <span className="font-semibold">{username}</span> to continue:
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
					<Button type="submit" disabled variant="destructive" onClick={onConfirm}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
});
