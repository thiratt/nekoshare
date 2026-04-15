import { FaAndroid, FaApple, FaLinux, FaWindows } from "react-icons/fa";
import { LuGlobe } from "react-icons/lu";
import { SiIos } from "react-icons/si";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { motion } from "@workspace/app-ui/components/provide-animate";

const platforms = [
  {
    name: "macOS",
    icon: <FaApple className="size-8" />,
    available: false,
  },
  {
    name: "Windows",
    icon: <FaWindows className="size-8" />,
    available: true,
  },
  {
    name: "Linux",
    icon: <FaLinux className="size-8" />,
    available: false,
  },
  {
    name: "iOS",
    icon: <SiIos className="size-8" />,
    available: false,
  },
  {
    name: "Android",
    icon: <FaAndroid className="size-8" />,
    available: true,
  },
  {
    name: "Website",
    icon: <LuGlobe className="size-8" />,
    available: false,
  },
];

export function Platforms() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge>Platforms</Badge>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One app. Every device.
            </h2>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              Neko Share runs natively on all major platforms, ensuring the best
              possible performance and user experience. Download once, sync
              everywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {platforms.map((platform, index) => (
                <motion.div
                  key={platform.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="cursor-default flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/60 text-muted-foreground transition-colors hover:bg-card/80 hover:text-muted-foreground/70"
                >
                  {platform.icon}
                  <span className="mt-1 text-xs">{platform.name}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-8">
              <Button size="lg" className="rounded-full" disabled>
                Coming soon
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md">
              <div className="relative z-10 mx-auto w-48 rounded-4xl border-4 border-border/60 bg-card/80 p-2 shadow-xl shadow-black/5">
                <div className="absolute left-1/2 top-4 h-4 w-16 -translate-x-1/2 rounded-full bg-border/60" />
                <div className="aspect-9/19 rounded-3xl bg-background/90 px-3 py-8">
                  <div className="flex h-full flex-col">
                    <div className="mb-3 flex items-center justify-center gap-1">
                      <div className="w-3 h-3">
                        <img
                          src="/NekoShare-Light.svg"
                          alt="Neko Share Light Logo"
                        />
                      </div>
                      <span className="text-xs text-foreground">
                        Neko Share
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2 w-3/4 rounded bg-border/40" />
                      <div className="h-2 w-1/2 rounded bg-border/40" />
                      <div className="mt-4 rounded-lg bg-background/50 p-2">
                        <div className="h-1.5 w-full rounded bg-accent/40" />
                        <div className="mt-1 h-1.5 w-2/3 rounded bg-border/40" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -right-8 z-0 hidden w-64 lg:block">
                <div className="rounded-t-lg border border-border/50 bg-card/70 p-2">
                  <div className="aspect-video rounded bg-background/90">
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto h-6 w-6 rounded-lg bg-accent/20" />
                        <div className="mt-2 h-1.5 w-12 rounded bg-border/40 mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-2 rounded-b-lg bg-border/60" />
              </div>

              <div className="absolute -left-12 -top-8 z-0 hidden w-32 rotate-6 lg:block">
                <div className="rounded-xl border-2 border-border/50 bg-card/70 p-1.5">
                  <div className="aspect-3/4 rounded-lg bg-background/90 p-2">
                    <div className="h-1.5 w-3/4 rounded bg-border/40" />
                    <div className="mt-1 h-1.5 w-1/2 rounded bg-border/40" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
