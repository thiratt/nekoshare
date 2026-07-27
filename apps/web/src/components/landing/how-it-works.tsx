import { ArrowRight, FolderOpen, Send, Smartphone, Users } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

const steps = [
  {
    number: "01",
    title: "Choose a file",
    description:
      "Start with the file or folder you want to move. Selecting a file does not upload it anywhere.",
    icon: FolderOpen,
  },
  {
    number: "02",
    title: "Pick a destination",
    description:
      "Choose one of your devices or a friend who should receive the transfer.",
    icon: Users,
  },
  {
    number: "03",
    title: "Get approval",
    description:
      "A transfer to another person waits for them to accept before file data starts moving.",
    icon: Smartphone,
  },
  {
    number: "04",
    title: "Track the transfer",
    description:
      "Follow progress and see whether the transfer completes or needs your attention.",
    icon: Send,
  },
];

export function HowItWorks({ compact = false }: { compact?: boolean }) {
  return (
    <section
      id="how-it-works"
      className={
        compact
          ? "scroll-mt-14 border-y border-border/70 bg-muted/15"
          : "scroll-mt-14 border-y border-border/70 bg-background"
      }
    >
      <div
        className={
          compact
            ? "mx-auto max-w-7xl border-x border-border/70"
            : "mx-auto max-w-7xl border-x border-border/70 bg-background"
        }
      >
        <div className="px-6 py-16 text-center sm:px-10 sm:py-20">
          <Badge variant="outline">How it works</Badge>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            From selection to arrival in four steps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            The sender chooses what and where. The receiver stays in control
            when approval is needed.
          </p>
        </div>

        <div className="grid border-t border-border/70 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article
              key={step.number}
              className="relative min-h-60 border-b border-border/70 p-6 md:odd:border-r xl:border-b-0 xl:not-last:border-r"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-muted-foreground">
                  {step.number}
                </span>
                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background">
                  <step.icon className="size-4" />
                </div>
              </div>
              <h3 className="mt-8 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
              {index < steps.length - 1 ? (
                <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden size-7 rounded-full border border-border bg-background p-1 xl:block" />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
