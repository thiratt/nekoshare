import { useEffect, useState } from "react";

import { LuMonitorX } from "react-icons/lu";

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Progress } from "@workspace/ui/components/progress";

interface SessionTerminatedDialogProps {
	open: boolean;
	terminatorName: string;
	onComplete: () => void;
}

export function SessionTerminatedDialog({ open, terminatorName, onComplete }: SessionTerminatedDialogProps) {
	const [progress, setProgress] = useState(100);

	useEffect(() => {
		if (open) {
			const interval = setInterval(() => {
				setProgress((prev) => {
					if (prev <= 0) {
						clearInterval(interval);
						onComplete();
						return 0;
					}
					return prev - 1.66;
				});
			}, 30);

			return () => clearInterval(interval);
		}
	}, [open, onComplete]);

	return (
		<AlertDialog open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="mx-auto bg-destructive/10 p-3 rounded-full mb-2">
						<LuMonitorX className="size-8 text-destructive" />
					</div>
					<AlertDialogTitle className="text-center">เซสชันถูกระงับ</AlertDialogTitle>
					<AlertDialogDescription className="text-center space-x-2">
						เซสชันการใช้งานของคุณสิ้นสุดลง
						{terminatorName && <span> โดย {terminatorName}</span>} ระบบกำลังนำคุณออกจากระบบใน 3 วินาที...
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="mt-4">
					<Progress value={progress} className="h-2" />
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
