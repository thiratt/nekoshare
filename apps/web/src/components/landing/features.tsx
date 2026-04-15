import { FileText, Globe, Shield, Users, Wifi, Zap } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

import { motion } from "@workspace/app-ui/components/provide-animate";

const features = [
  {
    icon: Zap,
    title: "Fast by default",
    description:
      "A quicker, cleaner way to move files without the usual friction.",
  },
  {
    icon: Shield,
    title: "End-to-end encrypted",
    description:
      "File sharing designed to keep your transfers private from start to finish.",
  },
  {
    icon: Globe,
    title: "Across your devices",
    description: "Move files where you need them, from one device to another.",
  },
  {
    icon: Users,
    title: "Made for friends too",
    description:
      "Not just for your own devices. Share with people you trust as well.",
  },
  {
    icon: Wifi,
    title: "Direct and simple",
    description:
      "Less setup, less waiting, and a flow that feels easy to trust.",
  },
  {
    icon: FileText,
    title: "Ready for real files",
    description:
      "From quick documents to large media, built for everyday sharing.",
  },
];

export function Features() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          id="features"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="scroll-mt-20 mx-auto max-w-2xl text-center"
        >
          <Badge>Features</Badge>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need for seamless file transfers
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Built from the ground up for speed, security, and simplicity. No
            complicated setup, no subscriptions required.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-border/40 bg-card/45 p-6 transition-colors hover:border-border/60 hover:bg-card/60"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
