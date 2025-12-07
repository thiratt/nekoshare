import { useState, useCallback } from "react";
import { LuLoader, LuUserPlus } from "react-icons/lu";

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
import { Button } from "@workspace/ui/components/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { isValidEmail } from "./constants";

interface RevokeConfirmDialogProps {
	open: boolean;
	count: number;
	onConfirm: () => void;
	onCancel: () => void;
}

interface AddFriendDialogProps {
	onSubmit: (data: { email: string; message?: string }) => Promise<void>;
}

export function RevokeConfirmDialog({ open, count, onConfirm, onCancel }: RevokeConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ถอนสิทธิ์การเข้าถึง {count} คน?</AlertDialogTitle>
					<AlertDialogDescription>
						การดำเนินการนี้จะยกเลิกสิทธิ์การเข้าถึงข้อมูลที่แชร์ของคุณ คุณสามารถเชิญใหม่ได้ในภายหลัง
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						ถอนสิทธิ์
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function AddFriendDialog({ onSubmit }: AddFriendDialogProps) {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [touched, setTouched] = useState(false);

	const emailError = touched && email.length > 0 && !isValidEmail(email);
	const canSubmit = isValidEmail(email) && !isSubmitting;

	const resetForm = useCallback(() => {
		setEmail("");
		setMessage("");
		setTouched(false);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;

		setIsSubmitting(true);
		try {
			await onSubmit({
				email: email.trim(),
				message: message.trim() || undefined,
			});
			resetForm();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<DialogContent className="sm:max-w-md">
			<form onSubmit={handleSubmit}>
				<DialogHeader>
					<DialogTitle>เพิ่มเพื่อน</DialogTitle>
					<DialogDescription>
						เพื่อนจะได้รับคำเชิญผ่านอีเมล สามารถเพิ่มข้อความเพื่อบอกอะไรเขาได้นะ
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="invite-email">อีเมลของเพื่อน</Label>
						<Input
							id="invite-email"
							type="email"
							placeholder="name@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							onBlur={() => setTouched(true)}
							aria-invalid={emailError}
							aria-describedby={emailError ? "email-error" : undefined}
							autoComplete="email"
							autoFocus
						/>
						{emailError && (
							<p id="email-error" className="text-xs text-destructive">
								กรุณากรอกอีเมลที่ถูกต้อง
							</p>
						)}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="invite-msg">
							ข้อความ <span className="text-muted-foreground font-normal">(ไม่จำเป็น)</span>
						</Label>
						<Input
							id="invite-msg"
							placeholder="มาเป็นเพื่อนกันมั้ย 👋"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							maxLength={200}
						/>
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline">
							ยกเลิก
						</Button>
					</DialogClose>
					<Button type="submit" disabled={!canSubmit} className="gap-2">
						{isSubmitting ? (
							<LuLoader className="w-4 h-4 animate-spin" />
						) : (
							<LuUserPlus className="w-4 h-4" />
						)}
						ส่งคำเชิญ
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
