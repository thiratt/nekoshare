import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CheckCircleIcon } from "lucide-react";

export const Route = createFileRoute("/auth/password-changed")({
  component: AuthPasswordChangedComponent,
});

function AuthPasswordChangedComponent() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CheckCircleIcon
          className="mx-auto h-12 w-12 text-green-500"
          aria-hidden="true"
        />
        <CardTitle className="mt-4 text-2xl font-semibold">
          Password Changed
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-6">
          Your password has been successfully updated. You can now log in with
          your new password.
        </p>
        <Button asChild className="w-full">
          <Link to="/home">Go to Home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
