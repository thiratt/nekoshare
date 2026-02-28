import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) {
  console.error(error);

  return (
    <div className="bg-background flex h-screen w-full flex-col">
      <div className="flex h-11 items-center border-b-2 bg-primary px-3 dark:bg-background">
        <h1 className="font-semibold text-background dark:text-foreground">Nekoshare Desktop</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center pb-2 text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <AlertTriangle className="text-destructive h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground wrap-break-word text-sm">
              {error.message || "An unexpected error occurred."}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-2 pb-6">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button
              onClick={() => (reset ? reset() : window.location.reload())}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
