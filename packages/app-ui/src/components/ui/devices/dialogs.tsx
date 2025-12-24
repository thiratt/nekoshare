import { useCallback, useEffect, useState } from "react";

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
import { Button, buttonVariants } from "@workspace/ui/components/button";
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

import type { UiDevice } from "@workspace/app-ui/types/device";

interface ManageDeviceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	device: UiDevice | null;
	onSave: (id: string, name: string) => Promise<void>;
}

interface DeleteDeviceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}

export function ManageDeviceDialog({ open, onOpenChange, device, onSave }: ManageDeviceDialogProps) {
	const [name, setName] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (device) {
			setName(device.name);
		}
	}, [device]);

	const handleSave = useCallback(async () => {
		if (!device || !name.trim()) return;

		setIsSaving(true);
		try {
			await onSave(device.id, name.trim());
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to save device:", error);
		} finally {
			setIsSaving(false);
		}
	}, [device, name, onSave, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>แก้ไขอุปกรณ์</DialogTitle>
					<DialogDescription>เปลี่ยนชื่อหรือตั้งค่าอุปกรณ์ของคุณ</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-3">
						<Label htmlFor="device-name">ชื่ออุปกรณ์</Label>
						<Input
							id="device-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="ใส่ชื่ออุปกรณ์"
							autoFocus
						/>
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={isSaving}>
							ยกเลิก
						</Button>
					</DialogClose>
					<Button type="submit" onClick={handleSave} disabled={!name.trim() || isSaving}>
						{isSaving ? "กำลังบันทึก..." : "บันทึก"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteDeviceDialog({ open, onOpenChange, onConfirm }: DeleteDeviceDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirm = useCallback(async () => {
		setIsDeleting(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to delete device:", error);
		} finally {
			setIsDeleting(false);
		}
	}, [onConfirm, onOpenChange]);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ลบอุปกรณ์นี้</AlertDialogTitle>
					<AlertDialogDescription>
						แน่ใจนะว่าจะลบอุปกรณ์นี้? หลังจากลบอุปกรณ์นี้แล้ว อุปกรณ์นี้จะถูกออกจากระบบอัตโนมัติ
						และไม่สามารถยกเลิกได้
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: "destructive" })}
						onClick={handleConfirm}
						disabled={isDeleting}
					>
						{isDeleting ? "กำลังลบ..." : "ใช่ ลบเลย"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
