import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
export const Route = createFileRoute("/auth/reset-pwd")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>ลืมรหัสผ่าน</CardTitle>
          <CardDescription>
            กรอกอีเมลด้านล่างเพื่อรับลิงก์ในการกู้คืนรหัสผ่าน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" type="email" required />
              </div>
              <Button type="submit" className="w-full">
                ถัดไป
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
