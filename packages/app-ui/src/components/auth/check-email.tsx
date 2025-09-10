import { useState, useEffect } from "react";
import { CardContent } from "@workspace/ui/components/card";
import { CardTransition } from "../transition-view";
import { Mail, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface VerifyCardProps {
	email?: string;
	onResendEmail?: () => Promise<void>;
}

export function AuthCheckEmail({ email = "user@example.com", onResendEmail }: VerifyCardProps) {
	const [isResending, setIsResending] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	// Cooldown timer effect
	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (resendCooldown > 0) {
			timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
		}
		return () => clearTimeout(timer);
	}, [resendCooldown]);

	const handleResendEmail = async () => {
		if (resendCooldown > 0 || isResending) return;

		setIsResending(true);

		try {
			await onResendEmail?.();
			setResendCooldown(60);
		} catch (error) {
		} finally {
			setIsResending(false);
		}
	};

	const getResendButtonText = () => {
		if (isResending) return "Sending...";
		if (resendCooldown > 0) return `Resend in ${resendCooldown}s`;
		return "Resend email";
	};

	return (
		<div className="w-full max-w-sm md:max-w-lg">
			<CardTransition tag="auth-card">
				<CardContent className="space-y-6">
					{/* Header with Icon */}
					<div className="text-center space-y-4">
						<div className="mx-auto w-16 h-16 bg-primary/5 border border-primary/10 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-primary/10">
							<Mail className="h-8 w-8 text-primary" />
						</div>

						<div className="space-y-3">
							<h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
							<p className="text-sm">
								We've sent a verification link to <span className="font-semibold">{email}</span>
							</p>
							<p className="text-sm">
								Click the link in the email to complete your signup. If it's not in your inbox, check
								your <span className="font-semibold">spam</span> folder.
							</p>
							<p className="text-sm">Still can't find it?</p>
						</div>
					</div>

					{/* Resend Button */}
					<Button
						className="w-full transition-all duration-200"
						onClick={handleResendEmail}
						disabled={resendCooldown > 0 || isResending}
						variant="default"
					>
						{resendCooldown > 0 && <Clock className="h-4 w-4 animate-pulse" />}
						{getResendButtonText()}
					</Button>
				</CardContent>
			</CardTransition>
		</div>
	);
}
