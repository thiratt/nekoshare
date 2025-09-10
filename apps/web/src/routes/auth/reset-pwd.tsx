import { createFileRoute, Link } from "@tanstack/react-router";

import { ResetPasswordCard } from "@workspace/app-ui/components/auth/reset-pwd";
import type { TResetPasswordSchema } from "@workspace/app-ui/types/schema";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/auth/reset-pwd")({
  component: AuthResetPasswordComponent,
});

function AuthResetPasswordComponent() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = useCallback(async (data: TResetPasswordSchema) => {
    try {
      setStatus("success");
      setErrorMessage(null);
    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to send reset link. Please try again later.");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return (
    <div className="w-full max-w-md">
      {status === "idle" && (
        <ResetPasswordCard linkComponent={Link} onSubmit={onSubmit} />
      )}

      {status === "success" && (
        <Card>
          <CardContent className="flex flex-col items-center text-center gap-4">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to your email. Please check your
              inbox and follow the instructions to reset your password.
            </p>
            <Button onClick={handleRetry}>
              Didn't get the email? Try again.
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "error" && (
        <Card className="animate-in zoom-in-90 fade-in">
          <CardHeader className="text-center">
            <AlertCircleIcon
              className="mx-auto h-12 w-12 text-red-500"
              aria-hidden="true"
            />
            <CardTitle className="mt-4 text-lg font-semibold">
              Something Went Wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
