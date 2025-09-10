import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardAction,
  CardFooter,
} from "@workspace/ui/components/card";
import { TrendingUp } from "lucide-react";

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: { sign: "up" | "down"; text: string };
  hint?: string;
};

export function StatCard({ icon, label, value, delta, hint }: StatCardProps) {
  return (
    <Card className="@container/card gap-0">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon} {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {delta && (
          <CardAction>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="size-4" />
              {delta.text}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {hint && (
        <CardFooter>
          <div className="text-sm text-muted-foreground">{hint}</div>
        </CardFooter>
      )}
    </Card>
  );
}
