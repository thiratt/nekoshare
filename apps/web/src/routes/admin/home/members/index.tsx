import { MemberTable } from "@/components/member";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export const Route = createFileRoute("/admin/home/members/")({
  component: RouteComponent,
});

const sampleData = [
  {
    id: "u_001",
    profile: { avatarUrl: "", displayName: "Ken Adams" },
    username: "kenadams",
    email: "ken99@example.com",
    createdAt: "2024-12-01T09:12:00Z",
  },
  {
    id: "u_002",
    profile: { avatarUrl: "", displayName: "Abe Lincoln" },
    username: "abel",
    email: "Abe45@example.com",
    createdAt: "2025-02-12T14:03:00Z",
  },
  {
    id: "u_003",
    profile: { avatarUrl: "", displayName: "Monserrat Duke" },
    username: "monduke",
    email: "Monserrat44@example.com",
    createdAt: "2025-05-20T08:30:00Z",
  },
  {
    id: "u_004",
    profile: { avatarUrl: "", displayName: "Silas Wright" },
    username: "silas",
    email: "Silas22@example.com",
    createdAt: "2025-07-01T12:00:00Z",
  },
  {
    id: "u_005",
    profile: { avatarUrl: "", displayName: "Carmella Lang" },
    username: "carmella",
    email: "carmella@example.com",
    createdAt: "2025-07-22T17:45:00Z",
  },
];

function RouteComponent() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการสมาชิก</CardTitle>
        <CardDescription>สามารถจัดการสมาชิกได้อย่างง่ายดาย</CardDescription>
      </CardHeader>
      <CardContent>
        <MemberTable
          data={sampleData}
          onDelete={() => {}}
          onDetail={(v) => {
            router.navigate({ to: `/home/members/${v.id}` });
          }}
        />
      </CardContent>
    </Card>
  );
}
