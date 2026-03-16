import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

interface FeaturePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
  children,
}: FeaturePlaceholderProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center">
      <Card className="w-full border-border/70 shadow-lg">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </div>
  );
}
