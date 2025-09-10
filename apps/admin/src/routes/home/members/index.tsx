import { MemberTable } from "@/components/member";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ScanFace, TrendingUp, UserCheck, UserPlus, Users } from "lucide-react";

export const Route = createFileRoute("/home/members/")({
  component: RouteComponent,
});

// const sampleData = [
//   {
//     id: "u_001",
//     profile: { avatarUrl: "", displayName: "Ken Adams" },
//     username: "kenadams",
//     email: "ken99@example.com",
//     createdAt: "2024-12-01T09:12:00Z",
//   },
//   {
//     id: "u_002",
//     profile: { avatarUrl: "", displayName: "Abe Lincoln" },
//     username: "abel",
//     email: "Abe45@example.com",
//     createdAt: "2025-02-12T14:03:00Z",
//   },
//   {
//     id: "u_003",
//     profile: { avatarUrl: "", displayName: "Monserrat Duke" },
//     username: "monduke",
//     email: "Monserrat44@example.com",
//     createdAt: "2025-05-20T08:30:00Z",
//   },
//   {
//     id: "u_004",
//     profile: { avatarUrl: "", displayName: "Silas Wright" },
//     username: "silas",
//     email: "Silas22@example.com",
//     createdAt: "2025-07-01T12:00:00Z",
//   },
//   {
//     id: "u_005",
//     profile: { avatarUrl: "", displayName: "Carmella Lang" },
//     username: "carmella",
//     email: "carmella@example.com",
//     createdAt: "2025-07-22T17:45:00Z",
//   },
// ];

function RouteComponent() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-4 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        <Card className="@container/card gap-0">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" /> Total Users
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              1,000
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              +5% than last month
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card gap-0">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <UserPlus className="size-4" /> New Users
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              120
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +12%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              +12% than last month
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card gap-0">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <ScanFace className="size-4" /> Pending Verifications
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              75
            </CardTitle>
            <CardAction>
              <Badge variant="outline">7%</Badge>
            </CardAction>
          </CardHeader>
          <CardFooter>
            <div className="text-sm text-muted-foreground">7% of users</div>
          </CardFooter>
        </Card>
        <Card className="@container/card gap-0">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <UserCheck className="size-4" /> Active Users
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              800
            </CardTitle>
            <CardAction>
              <Badge variant="outline">80%</Badge>
            </CardAction>
          </CardHeader>
          <CardFooter>
            <div className="text-sm text-muted-foreground">80% of users</div>
          </CardFooter>
        </Card>
      </div>
      <MemberTable
        onDetail={(m) => router.navigate({ to: m.id })}
        className="flex-1"
      />
    </div>
  );
}
