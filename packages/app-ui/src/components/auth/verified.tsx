import { CardContent } from "@workspace/ui/components/card";
import { CardTransition } from "../transition-view";
import { CheckCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface VerifySuccessProps {
	email?: string;
	onContinue?: () => void;
}

export function AuthVerifySuccess({ email = "user@example.com", onContinue }: VerifySuccessProps) {
	return (
		<div className="w-full max-w-sm md:max-w-lg">
			<CardTransition tag="auth-card">
				<CardContent className="space-y-6">
					{/* Header with Icon */}
					<div className="text-center space-y-4">
						<div className="mx-auto w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-green-500/20">
							<CheckCircle className="h-8 w-8 text-green-500" />
						</div>

						<div className="space-y-3">
							<h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
							<p className="text-sm">
								Your email <span className="font-semibold">{email}</span> has been successfully
								verified.
							</p>
							<p className="text-sm">You're all set to get started.</p>
						</div>
					</div>

					{/* Continue Button */}
					<Button className="w-full transition-all duration-200" onClick={onContinue} variant="default">
						Continue
					</Button>
				</CardContent>
			</CardTransition>
		</div>
	);
}
