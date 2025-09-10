import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center">
      <h2 className="text-xl mb-4">เลือกหน้าสำหรับดูตัวอย่างครับ อาจารย์</h2>
      <div className="space-x-4">
        <Button asChild>
          <Link
            to="/share/$index"
            params={{ index: "2de96195-f717-4913-910b-3aff5bc65aab" }}
          >
            ผู้ใช้งานทั่วไป
          </Link>
        </Button>
        <Button asChild>
          <Link to="/auth/login">สมาชิก</Link>
        </Button>
        <Button asChild>
          <Link to="/admin/auth/login">ผู้ดูแลระบบ</Link>
        </Button>
      </div>
    </div>
  );
}
