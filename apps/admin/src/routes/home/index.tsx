// /home/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Users, Link2, Share2, ShieldCheck, Laptop2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tab-animate";
import { useEffect, useMemo, useState } from "react";
import { UsageStatChart } from "@/components/usage-chart";
import { StatCard } from "@/components/stat-card";

// ---------------- Mock hook ----------------
type Metrics = {
  totalMembers: number;
  verifiedMembers: number;
  signupsToday: number;
  sharesToday: {
    total: number;
    friend: number;
    device: number;
    public: number;
  };
  activePublicLinks: number;
  devicesOnline24h: number;
  notifications: { ok: number; fail: number };
  deltas: { membersMoM: string; sharesDoD: string };
};

function useDashboardMetrics() {
  const [data, setData] = useState<Metrics | null>(null);

  useEffect(() => {
    // TODO: replace with real API call
    const timer = setTimeout(() => {
      setData({
        totalMembers: 4213,
        verifiedMembers: 3892,
        signupsToday: 36,
        sharesToday: { total: 512, friend: 180, device: 246, public: 86 },
        activePublicLinks: 42,
        devicesOnline24h: 1198,
        notifications: { ok: 3189, fail: 7 },
        deltas: { membersMoM: "+5.3%", sharesDoD: "+12%" },
      });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading: !data };
}

export const Route = createFileRoute("/home/")({ component: RouteComponent });

function RouteComponent() {
  const { data, isLoading } = useDashboardMetrics();

  const verifiedPct = useMemo(() => {
    if (!data) return "—";
    return `${Math.round((data.verifiedMembers / data.totalMembers) * 100)}%`;
  }, [data]);

  const rows = useMemo(
    () => [
      { email: "mint@example.com", verified: false, time: "13:42" },
      { email: "boss@example.com", verified: true, time: "12:58" },
      { email: "aom@example.com", verified: true, time: "11:10" },
      { email: "art@example.com", verified: false, time: "10:27" },
      { email: "noon@example.com", verified: true, time: "09:51" },
    ],
    [],
  );

  const events = useMemo(
    () => [
      {
        type: "failed",
        text: "รหัสผ่านผิด 5 ครั้ง",
        at: "14:02",
        ip: "49.230.x.x",
      },
      {
        type: "new-device",
        text: "ล็อกอินอุปกรณ์ใหม่ (Android)",
        at: "13:17",
        ip: "171.97.x.x",
      },
      {
        type: "remote-signout",
        text: "บังคับออกจากระบบ (Desktop)",
        at: "12:44",
        ip: "110.168.x.x",
      },
    ],
    [],
  );

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h1 className="font-semibold text-2xl">Dashboard</h1>
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">วันนี้</TabsTrigger>
            <TabsTrigger value="monthly">เดือนนี้</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="grid grid-cols-2 gap-2
                      *:data-[slot=card]:bg-gradient-to-t
                      *:data-[slot=card]:from-primary/5
                      *:data-[slot=card]:to-card
                      dark:*:data-[slot=card]:bg-card
                      *:data-[slot=card]:shadow-xs"
        >
          <StatCard
            icon={<Users className="size-4" />}
            label="สมาชิกทั้งหมด / ยืนยันแล้ว"
            value={
              isLoading
                ? "…"
                : `${data!.totalMembers} / ${data!.verifiedMembers}`
            }
            delta={
              isLoading
                ? undefined
                : { sign: "up", text: data!.deltas.membersMoM }
            }
            hint={isLoading ? "" : `${verifiedPct} ยืนยันแล้ว`}
          />
          <StatCard
            icon={<Share2 className="size-4" />}
            label="แชร์วันนี้ (รวม)"
            value={isLoading ? "…" : data!.sharesToday.total}
            delta={
              isLoading
                ? undefined
                : { sign: "up", text: data!.deltas.sharesDoD }
            }
            hint={
              isLoading
                ? ""
                : `เพื่อน ${data!.sharesToday.friend} • อุปกรณ์ ${data!.sharesToday.device} • ลิงก์ ${data!.sharesToday.public}`
            }
          />
          <StatCard
            icon={<Link2 className="size-4" />}
            label="ลิงก์สาธารณะ Active"
            value={isLoading ? "…" : data!.activePublicLinks}
            hint="ลิงก์หมดอายุอัตโนมัติ"
          />
          <StatCard
            icon={<Laptop2 className="size-4" />}
            label="อุปกรณ์ออนไลน์ (ตอนนี้)"
            value={isLoading ? "…" : data!.devicesOnline24h}
            hint="unique devices"
          />
        </div>
        <UsageStatChart />
      </div>

      {/* Row 3: Feeds */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardTitle>สมัครใหม่วันนี้</CardTitle>
            <CardDescription>5 ล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 text-sm font-medium text-muted-foreground mb-2">
              <div>Email</div>
              <div>ยืนยัน</div>
              <div>เวลา</div>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-3 text-sm items-center">
                  <div className="truncate">{r.email}</div>
                  <div
                    className={
                      r.verified ? "text-emerald-600" : "text-amber-600"
                    }
                  >
                    {r.verified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                  </div>
                  <div className="tabular-nums">{r.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ความปลอดภัยล่าสุด</CardTitle>
            <CardDescription>เหตุการณ์ 24 ชม. ล่าสุด</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  <span>{e.text}</span>
                </div>
                <div className="text-muted-foreground tabular-nums">{e.at}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
