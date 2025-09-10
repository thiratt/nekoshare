import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  return router.navigate({ to: "/home/members" });
  // return (
  //   <div className="space-y-4">
  //     <div className="flex items-center justify-between">
  //       <h1 className="font-semibold text-2xl">จัดการสมาชิก</h1>
  //     </div>
  //     <Card>
  //       <CardHeader>
  //         <CardTitle>รายการสมาชิก</CardTitle>
  //         <CardDescription>สามารถจัดการสมาชิกได้อย่างง่ายดาย</CardDescription>
  //       </CardHeader>
  //       <CardContent>
  //         <MemberTable
  //           data={sampleData}
  //           onDelete={() => {}}
  //           onDetail={(v) => {
  //             router.navigate({ to: `/home/members/${v.id}` });
  //           }}
  //         />
  //       </CardContent>
  //     </Card>
  //   </div>
  // );
}
