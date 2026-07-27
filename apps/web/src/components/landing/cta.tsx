import { BookOpen, Server } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export function CTA({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={
        compact
          ? "bg-background"
          : "bg-background px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      }
    >
      <div
        className={
          compact
            ? "mx-auto max-w-7xl border-x border-border/70"
            : "mx-auto max-w-7xl overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
        }
      >
        <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
          <div
            id="roadmap"
            className="scroll-mt-14 border-b border-border/70 bg-foreground p-6 text-background sm:p-10 lg:border-b-0 lg:border-r lg:p-12 dark:bg-muted/40 dark:text-foreground"
          >
            <h2 className="mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Building the transfer engine first.
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-background/65 dark:text-muted-foreground">
              Neko Share is still in development. Current work focuses on
              encryption, transfer recovery, and bringing the desktop, Android,
              and web clients closer together.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90"
                disabled
              >
                Coming soon
              </Button>
            </div>
          </div>

          <div className="grid">
            <article
              id="docs"
              className="scroll-mt-14 border-b border-border/70 p-6 sm:p-8"
            >
              <BookOpen className="text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Docs
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">
                Decisions before promises.
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Architecture notes separate what runs today from what still
                belongs to the target design.
              </p>
            </article>

            <article className="p-6 sm:p-8">
              <Server className="size-5 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Self-hosting
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">
                Keep deployment under your control.
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                The current Docker and edge configuration provide a practical
                starting point for running the stack yourself.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
