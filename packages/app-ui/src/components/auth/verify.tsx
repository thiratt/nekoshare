import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";

import { Card, CardContent } from "@workspace/ui/components/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@workspace/ui/components/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp";
import { Button } from "@workspace/ui/components/button";
import { CardTransition } from "../transition-view";
import { Mail, Clock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const FormSchema = z.object({
	pin: z
		.string()
		.min(6, {
			message: "กรุณากรอกรหัสยืนยัน 6 หลัก",
		})
		.max(6, {
			message: "รหัสยืนยันต้องเป็น 6 หลักเท่านั้น",
		}),
});

interface VerifyCardProps {
	onSubmit: (data: z.infer<typeof FormSchema>) => void;
	onResend?: () => void;
	email?: string;
	isLoading?: boolean;
	error?: string;
}

export function AuthVerifyForm({
	onSubmit,
	onResend,
	email = "example@email.com",
	isLoading = false,
	error,
}: VerifyCardProps) {
	const [cooldownTime, setCooldownTime] = useState(0);
	const [isResending, setIsResending] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			pin: "",
		},
	});

	// Cooldown timer effect
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (cooldownTime > 0) {
			interval = setInterval(() => {
				setCooldownTime((time) => time - 1);
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [cooldownTime]);

	// Format time as MM:SS
	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Handle resend code
	const handleResend = async () => {
		if (cooldownTime > 0) return;

		setIsResending(true);
		try {
			onResend?.();
			setCooldownTime(300); // 5 minutes
			setShowSuccess(true);
			setTimeout(() => setShowSuccess(false), 3000);
		} finally {
			setIsResending(false);
		}
	};

	// Handle form submission
	const handleSubmit = (data: z.infer<typeof FormSchema>) => {
		onSubmit(data);
	};

	const canResend = cooldownTime === 0 && !isResending;

	return (
		<div className="w-full max-w-sm md:max-w-xl">
			<CardTransition tag="auth-card">
				<CardContent>
					<div className="flex flex-col gap-4">
						{/* Header with icon */}
						<header className="text-center space-y-4">
							<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
								<Mail className="w-8 h-8 text-primary" />
							</div>
							<h1 className="text-2xl font-bold text-gray-900">ยืนยันบัญชีของคุณ</h1>
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">ป้อนรหัส 6 หลักที่เราส่งไปยังอีเมล</p>
								<p className="text-sm font-medium text-primary">{email}</p>
							</div>
						</header>

						{/* Success message */}
						{showSuccess && (
							<div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
								<CheckCircle2 className="w-4 h-4" />
								<span>ส่งรหัสยืนยันใหม่เรียบร้อยแล้ว</span>
							</div>
						)}

						{/* Error message */}
						{error && (
							<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
								<AlertCircle className="w-4 h-4" />
								<span>{error}</span>
							</div>
						)}

						<Form {...form}>
							<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
								<FormField
									control={form.control}
									name="pin"
									render={({ field }) => (
										<FormItem className="flex flex-col items-center space-y-4">
											<FormLabel className="text-sm font-medium">รหัสยืนยัน</FormLabel>
											<FormControl>
												<InputOTP
													maxLength={6}
													{...field}
													className="gap-3"
													onKeyDown={(e) => {
														if (
															!/[0-9]/.test(e.key) &&
															e.key !== "Backspace" &&
															e.key !== "Delete" &&
															e.key !== "Tab" &&
															e.key !== "ArrowLeft" &&
															e.key !== "ArrowRight"
														) {
															e.preventDefault();
														}
													}}
													onChange={(value) => {
														field.onChange(value);
														if (value.length === 6 && !isLoading) {
															form.handleSubmit(handleSubmit)();
														}
													}}
												>
													<InputOTPGroup className="gap-3">
														{Array.from({ length: 6 }).map((_, i) => (
															<InputOTPSlot
																key={i}
																index={i}
																className={cn(
																	"w-12 h-12 text-lg font-semibold border rounded-lg"
																)}
															/>
														))}
													</InputOTPGroup>
												</InputOTP>
											</FormControl>
											<FormMessage className="text-center" />
										</FormItem>
									)}
								/>

								<Button
									type="submit"
									className="w-full h-12 text-base font-medium"
									disabled={isLoading || form.watch("pin").length !== 6}
								>
									{isLoading ? (
										<div className="flex items-center gap-2">
											<RefreshCw className="w-4 h-4 animate-spin" />
											<span>กำลังยืนยัน...</span>
										</div>
									) : (
										"ยืนยัน"
									)}
								</Button>
							</form>
						</Form>

						{/* Resend section */}
						<div className="text-center space-y-2">
							<p className="text-sm text-muted-foreground">ไม่ได้รับรหัส?</p>

							{cooldownTime > 0 ? (
								<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
									<Clock className="w-4 h-4" />
									<span>ส่งรหัสใหม่ได้ในอีก {formatTime(cooldownTime)}</span>
								</div>
							) : (
								<Button variant="ghost" onClick={handleResend} disabled={!canResend}>
									{isResending ? (
										<div className="flex items-center gap-2">
											<RefreshCw className="w-4 h-4 animate-spin" />
											<span>กำลังส่ง...</span>
										</div>
									) : (
										"ส่งรหัสใหม่"
									)}
								</Button>
							)}
						</div>

						{/* Help text */}
						<div className="text-sm text-center text-muted-foreground p-3 rounded-lg">
							<p>รหัสยืนยันจะหมดอายุใน 5 นาที</p>
							<p>ตรวจสอบโฟลเดอร์ Spam หากไม่พบอีเมล</p>
						</div>
					</div>
				</CardContent>
			</CardTransition>
		</div>
	);
}
