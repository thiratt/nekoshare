import { FolderOpen, Send, Smartphone, Users } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

import { motion } from "@workspace/app-ui/components/provide-animate";

const steps = [
  {
    number: "01",
    title: "Open NekoShare",
    description:
      "Start on the device you want to send from and get ready to share.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Choose what to send",
    description: "Pick the file or folder you want to move.",
    icon: FolderOpen,
  },
  {
    number: "03",
    title: "Pick a device or friend",
    description:
      "Send to one of your own devices or share directly with a friend.",
    icon: Users,
  },
  {
    number: "04",
    title: "Confirm and send",
    description:
      "Finish the handoff in a flow that feels simple, direct, and secure.",
    icon: Send,
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border/30 bg-muted/20 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge>How it works</Badge>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            File sharing without the usual friction
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Pick a file, choose a device or friend, and send it in a flow that
            stays simple from start to finish.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="rounded-[1.75rem] border border-border/60 bg-background/80 p-4 backdrop-blur-sm md:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
                    {step.number}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
