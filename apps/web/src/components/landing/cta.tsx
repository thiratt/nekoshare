import { ArrowRight } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { motion } from "@workspace/app-ui/components/provide-animate";

export function CTA() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-[2.5rem] border border-border/50 bg-muted/20"
        >
          <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[1.2fr,0.95fr] lg:gap-12">
            <div className="flex flex-col justify-between">
              <div id="pricing" className="scroll-mt-20">
                <Badge>Next</Badge>
                <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Free to use now. Pricing can wait until it is real.
                </h2>
                <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
                  NekoShare is still taking shape. You can keep the setup under
                  your control today, while hosted plans and public pricing stay
                  out of the way until they are ready.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="group h-12 rounded-full px-6 text-base"
                  asChild
                >
                  <a href="https://github.com" target="_blank" rel="noreferrer">
                    View on GitHub
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full px-6 text-base"
                  asChild
                >
                  <a href="#features">Explore the product</a>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div
                id="docs"
                className="scroll-mt-20 rounded-[1.75rem] border border-border/50 bg-background/80 p-6"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  Docs
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  The repo is the source of truth for now.
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Dedicated documentation is still coming together. Until then,
                  the code and project notes say the most.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-border/50 bg-background/80 p-6">
                <p className="text-sm font-medium text-muted-foreground">
                  Self-hosting
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  Run it yourself, keep it simple.
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Use it for free today and keep control over how it is deployed
                  while the hosted story catches up later.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
