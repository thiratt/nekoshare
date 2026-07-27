import { Link } from "@tanstack/react-router";
import { ArrowRight, Blocks, Map, Route, ShieldCheck } from "lucide-react";

import { ThemeLogo } from "@/components/theme-visuals";

const projectLinks = [
  {
    name: "Capabilities",
    description: "What is taking shape",
    href: "#features",
    icon: Blocks,
  },
  {
    name: "Transfer flow",
    description: "How files should move",
    href: "#how-it-works",
    icon: Route,
  },
  {
    name: "Security",
    description: "Trust and privacy",
    href: "#security",
    icon: ShieldCheck,
  },
  {
    name: "Roadmap",
    description: "What comes next",
    href: "#roadmap",
    icon: Map,
  },
];

export function Footer() {
  return (
    <footer
      id="development"
      className="scroll-mt-14 border-t border-border/70 bg-muted/15"
    >
      <div className="mx-auto max-w-7xl border-x border-border/70 bg-background">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-border/70 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <ThemeLogo alt="Neko Share logo" width="24" height="24" />
              <span className="font-semibold">Neko Share</span>
            </Link>

            <h2 className="mt-5 max-w-xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Files should move, not settle somewhere else.
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
              Neko Share moves files between your devices and people you trust
              without becoming another cloud drive.
            </p>

            <a
              href="#roadmap"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              See the current direction
              <ArrowRight className="size-3.5" />
            </a>
          </div>

          <nav aria-label="Project sections" className="grid sm:grid-cols-2">
            {projectLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="group min-h-36 border-b border-border/70 p-6 transition-colors hover:bg-muted/30 sm:odd:border-r sm:nth-last-[-n+2]:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <item.icon className="size-5 text-muted-foreground" />
                  <ArrowRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-4 font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/70 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Neko Share</span>
          <span>Self-hosted · In development</span>
        </div>
      </div>
    </footer>
  );
}
