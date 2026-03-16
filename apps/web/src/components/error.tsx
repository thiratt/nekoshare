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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex h-12 items-center border-b bg-card px-4">
        <h1 className="font-semibold">NekoShare Web</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center pb-2 text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">เกิดข้อผิดพลาด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด"}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-2 pb-6">
            <Button
              className="gap-2"
              variant="outline"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              <Home className="h-4 w-4" />
              กลับหน้าแรก
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                if (reset) {
                  reset();
                  return;
                }

                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              ลองอีกครั้ง
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
