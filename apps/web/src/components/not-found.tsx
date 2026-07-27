import { Link } from "@tanstack/react-router";
import { Home, SearchX } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex h-12 items-center border-b bg-card px-4">
        <h1 className="font-semibold">Neko Share Web</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center pb-2 text-center">
            <div className="mb-4 rounded-full bg-muted p-3">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Page not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist or has moved.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button className="gap-2" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
                Back to home
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
