import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

export const Route = createFileRoute("/auth/new-pwd")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-6">
          <header className="text-center">
            <h1 className="text-2xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-muted-foreground">
              กรอกรหัสผ่านใหม่ด้านล่างเพื่อตั้งรหัสผ่านใหม่
            </p>
          </header>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <a href="/auth/login">ยกเลิก</a>
            </Button>
            <Button type="submit">เปลี่ยนรหัสผ่าน</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
