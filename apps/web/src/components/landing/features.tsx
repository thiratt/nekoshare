import {
  History,
  ListChecks,
  MonitorSmartphone,
  Network,
  RefreshCw,
  UserCheck,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

const features = [
  {
    icon: MonitorSmartphone,
    title: "Device presence",
    description:
      "Know which registered devices are available before choosing where a file should go.",
  },
  {
    icon: UserCheck,
    title: "Receiver approval",
    description:
      "Transfers to another person keep acceptance or rejection in the receiver's hands.",
  },
  {
    icon: ListChecks,
    title: "Readable state",
    description:
      "Offers, active transfers, pauses, failures, and completion use states people can understand.",
  },
  {
    icon: History,
    title: "Transfer history",
    description:
      "Recent activity gives each send or receive a place to inspect after the moment has passed.",
  },
  {
    icon: Network,
    title: "Built for large files",
    description:
      "Files are streamed in smaller parts instead of being loaded into memory all at once.",
  },
  {
    icon: RefreshCw,
    title: "Resume interrupted transfers",
    description:
      "Planned recovery support will let interrupted transfers continue without starting over.",
  },
];

export function Features({ compact = false }: { compact?: boolean }) {
  return (
    <section
      id="features"
      className={
        compact
          ? "scroll-mt-14 bg-background"
          : "scroll-mt-14 border-t bg-muted/15 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      }
    >
      <div
        className={
          compact
            ? "mx-auto max-w-7xl border-x border-border/70"
            : "mx-auto max-w-7xl overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
        }
      >
        <div className="grid border-b border-border/70 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="border-b border-border/70 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <Badge variant="outline">Features</Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              The product around the transfer
            </h2>
          </div>
          <div className="flex items-end p-6 sm:p-10 lg:p-12">
            <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              A useful transfer tool needs more than a fast data path. It needs
              destinations you recognize, consent you can see, and history that
              still makes sense afterward.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative min-h-64 border-b border-border/70 p-6 transition-colors hover:bg-muted/25 sm:p-8 lg:not-nth-[3n]:border-r lg:nth-last-[-n+3]:border-b-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-md border border-border bg-background shadow-sm">
                  <feature.icon className="size-5" />
                </div>
              </div>
              <div className="mt-8">
                <h3 className="mt-2 text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
