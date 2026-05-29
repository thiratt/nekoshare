import { useCallback, useEffect, useState } from "react";

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

import type { UiDevice } from "@workspace/app-ui/types/device";

type ManageDeviceDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	device: UiDevice | null;
	onSave: (id: string, name: string) => Promise<void>;
};

export function ManageDeviceDialog({ device, onOpenChange, onSave, open }: ManageDeviceDialogProps) {
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
	}, [device, name, onOpenChange, onSave]);

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
							onChange={(event) => setName(event.target.value)}
							placeholder="ใส่ชื่ออุปกรณ์"
							autoFocus
						/>
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isSaving}>
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
