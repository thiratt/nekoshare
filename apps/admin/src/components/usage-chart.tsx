import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
} from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tab-animate";

// --- Monthly data ---
const monthData = [
  { label: "ม.ค.", users: 186 },
  { label: "ก.พ.", users: 305 },
  { label: "มี.ค.", users: 237 },
  { label: "เม.ย.", users: 73 },
  { label: "พ.ค.", users: 209 },
  { label: "มิ.ย.", users: 214 },
];

// --- Daily data (e.g., past 7 days) ---
const dailyData = [
  { label: "จันทร์", users: 34 },
  { label: "อังคาร", users: 45 },
  { label: "พุธ", users: 23 },
  { label: "พฤหัส", users: 56 },
  { label: "ศุกร์", users: 78 },
  { label: "เสาร์", users: 65 },
  { label: "อาทิตย์", users: 41 },
];

const chartConfig = {
  users: {
    label: "จำนวนผู้ใช้งาน",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function UsageStatChart() {
  return (
    <Tabs defaultValue="daily">
      <Card>
        <CardHeader>
          <CardTitle>สถิติการใช้งาน</CardTitle>
          <CardDescription>การใช้งานรายวันและรายเดือน</CardDescription>
          <CardAction>
            <TabsList>
              <TabsTrigger value="daily">รายวัน</TabsTrigger>
              <TabsTrigger value="monthly">รายเดือน</TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>

        {/* Daily View */}
        <TabsContent value="daily">
          <CardContent>
            <ResponsiveContainer height={200}>
              <ChartContainer config={chartConfig}>
                <BarChart
                  accessibilityLayer
                  data={dailyData}
                  margin={{ top: 20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="users" fill="var(--color-users)" radius={8}>
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground animate-in slide-in-from-bottom-2 fade-in-translate-full"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </CardContent>
        </TabsContent>

        {/* Monthly View */}
        <TabsContent value="monthly">
          <CardContent>
            <ResponsiveContainer height={200}>
              <ChartContainer config={chartConfig}>
                <BarChart
                  accessibilityLayer
                  data={monthData}
                  margin={{ top: 20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="users" fill="var(--color-users)" radius={8}>
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground animate-in slide-in-from-bottom-2 fade-in-translate-full"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </CardContent>
        </TabsContent>
      </Card>
    </Tabs>
  );
}
