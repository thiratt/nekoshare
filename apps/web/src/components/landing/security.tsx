import { Fingerprint, Lock, ScanFace, Server, Shield } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { motion } from "@workspace/app-ui/components/provide-animate";

const securityFeatures = [
  {
    icon: Lock,
    title: "Encrypted transfer",
    description:
      "Transfers are designed to keep file movement private while it is in transit.",
  },
  {
    icon: Fingerprint,
    title: "Verified devices",
    description:
      "Device identity helps make file handoff feel more trustworthy.",
  },
  {
    icon: Server,
    title: "Direct by design",
    description:
      "Built around file sharing that stays closer to the devices involved.",
  },
  {
    icon: Shield,
    title: "Safer defaults",
    description:
      "A simpler flow with fewer moving parts and less friction around sharing.",
  },
];

function SignalDots({
  delayOffset = 0,
  vertical = false,
}: {
  delayOffset?: number;
  vertical?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1", vertical && "flex-col")}>
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`${delayOffset}-${i}`}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: delayOffset + i * 0.15,
          }}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
        />
      ))}
    </div>
  );
}

export function Security() {
  return (
    <section className="relative overflow-hidden border-y border-border/30 bg-muted/25 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-112 w-md -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          id="security"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="scroll-mt-20 mx-auto max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <Badge className="text-md">
              <Shield />
              Security
            </Badge>
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Built for safer file sharing
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            NekoShare is designed to keep file sharing direct, encrypted, and
            easier to trust without turning the page into a list of security
            buzzwords.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative mx-auto aspect-square max-w-lg overflow-hidden rounded-3xl border border-border/40 bg-background/80 backdrop-blur-sm">
              <div className="flex h-full flex-col rounded-[20px] bg-background/70">
                <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10">
                      <Shield className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Transfer in progress
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">
                      Protected
                    </span>
                  </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center">
                  <div className="absolute h-64 w-64">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0"
                    >
                      <div className="absolute left-1/2 -top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/80" />
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/60" />
                    </motion.div>
                  </div>
                  <div className="absolute h-48 w-48">
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0"
                    >
                      <div className="absolute left-0 top-2/5 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/50" />
                      <div className="absolute right-0 top-2/5 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/30" />
                    </motion.div>
                  </div>

                  <div className="absolute h-64 w-64 rounded-full border border-dashed border-border/60" />
                  <div className="absolute h-48 w-48 rounded-full border border-border/60" />
                  <div className="absolute h-32 w-32 rounded-full border border-border/40" />

                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-foreground/5 shadow-lg shadow-black/5"
                  >
                    <Lock />
                  </motion.div>
                </div>

                <div className="grid grid-cols-3 gap-px border-t border-border bg-border/20">
                  <div className="bg-background/60 px-4 py-4 text-center">
                    <p className="text-lg font-bold text-foreground">Local</p>
                    <p className="text-xs text-muted-foreground">Prepared</p>
                  </div>
                  <div className="bg-background/60 px-4 py-4 text-center">
                    <p className="text-lg font-bold text-foreground">
                      Verified
                    </p>
                    <p className="text-xs text-muted-foreground">Device path</p>
                  </div>
                  <div className="bg-background/60 px-4 py-4 text-center">
                    <p className="text-lg font-bold text-foreground">Direct</p>
                    <p className="text-xs text-muted-foreground">Handoff</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col">
            <div className="space-y-4">
              {securityFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/80 p-5 transition-all hover:bg-background"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors group-hover:bg-foreground/85">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 overflow-hidden rounded-3xl border border-border/40 bg-background/80"
        >
          <div className="flex flex-col gap-6 p-6 md:hidden">
            <div className="mx-auto flex w-full max-w-sm items-center gap-4 rounded-3xl border border-border/40 bg-background/70 px-4 py-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/10">
                <Fingerprint />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Your Device</p>
                <p className="text-sm text-muted-foreground">
                  File encrypted locally
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <SignalDots vertical />
              <div className="rounded-lg border border-accent/60 bg-background/70 px-3 py-1.5">
                <Lock className="size-4" />
              </div>
              <SignalDots vertical delayOffset={0.75} />
            </div>

            <div className="mx-auto flex w-full max-w-sm items-center gap-4 rounded-3xl border border-border/40 bg-background/70 px-4 py-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/10">
                <ScanFace />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">
                  Recipient Device
                </p>
                <p className="text-sm text-muted-foreground">
                  File decrypted securely
                </p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-6 p-6 md:grid md:grid-cols-3 md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/10">
                <Fingerprint />
              </div>
              <div>
                <p className="font-semibold text-foreground">Your Device</p>
                <p className="text-sm text-muted-foreground">
                  File encrypted locally
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="h-px w-12 bg-linear-to-r from-transparent to-muted-foreground/60" />
                <SignalDots />
                <div className="rounded-lg border border-accent/60 bg-background/70 px-3 py-1.5">
                  <Lock className="size-4" />
                </div>
                <SignalDots delayOffset={0.75} />
                <div className="h-px w-12 bg-linear-to-r from-muted-foreground/60 to-transparent" />
              </div>
            </div>

            <div className="flex items-center gap-4 md:justify-end">
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  Recipient Device
                </p>
                <p className="text-sm text-muted-foreground">
                  File decrypted securely
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/10">
                <ScanFace />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
