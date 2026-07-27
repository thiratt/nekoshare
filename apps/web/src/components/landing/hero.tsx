import {
  ArrowRight,
  Check,
  File,
  Laptop,
  LockKeyhole,
  Smartphone,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

export function Hero({ compact = false }: { compact?: boolean }) {
  return (
    <section className="relative overflow-hidden pt-14 border-b">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] opacity-35 bg-size-[64px_64px] mask-[linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-128 bg-[radial-gradient(circle_at_top,var(--muted),transparent_65%)] opacity-60" />

      <div className="mx-auto max-w-7xl border-border/70">
        <div className="border-x border-b px-5 pb-14 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-28 lg:pt-32">
          <Badge
            variant="outline"
            className="mb-7 gap-2 rounded-full bg-background/80 px-3 py-1 backdrop-blur"
          >
            <span className="size-1.5 rounded-full bg-orange-500" />
            In development
          </Badge>

          <h1 className="mx-auto max-w-5xl text-balance text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.5rem]">
            Your files, where{" "}
            <span className="text-muted-foreground"> you need them.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            Send files between your devices or to people you trust. Neko Share
            connects them directly when possible and keeps transfer progress
            visible along the way.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#features">
                Explore the project
                <ArrowRight />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">
                See how it works
                <ArrowRight />
              </a>
            </Button>
          </div>
        </div>

        <div
          className={
            compact
              ? "relative border-x px-4 pb-10 pt-10 sm:px-8 sm:pb-16 lg:px-16"
              : "relative border-x px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-16"
          }
        >
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/5">
            <div className="flex h-11 items-center gap-2 border-b border-border bg-muted/30 px-4">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full border border-border bg-destructive" />
                <span className="size-2.5 rounded-full border border-border bg-yellow-500" />
                <span className="size-2.5 rounded-full border border-border bg-green-500" />
              </div>
            </div>

            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b border-border p-5 lg:border-b-0 lg:border-r lg:p-7">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <LockKeyhole className="size-3.5" />
                  Encrypted transfer
                </div>
                <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
                    <File className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      vacations.zip
                    </p>
                    <p className="text-xs text-muted-foreground">2.4 GB</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    Ready
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {[
                    "Direct when possible",
                    "Verify the destination",
                    "Keep transfer status visible",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="size-3 text-foreground" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-h-72 flex-col justify-center p-5 sm:p-8">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                  <Device icon={Laptop} label="This device" detail="Windows" />
                  <div className="flex min-w-20 items-center">
                    <span className="h-px flex-1 bg-border" />
                    <div className="flex size-8 items-center justify-center rounded-full border border-border bg-background">
                      <ArrowRight className="size-3.5" />
                    </div>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Device icon={Smartphone} label="Pixel 9" detail="Android" />
                </div>
                <div className="mt-10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Transfer in progress</span>
                    <span className="text-muted-foreground">84%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[84%] rounded-full bg-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Device({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof Laptop;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-muted/20 shadow-sm sm:size-16">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 truncate text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
