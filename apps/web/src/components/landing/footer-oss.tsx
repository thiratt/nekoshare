import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CircleDot, FileCode2, Scale } from "lucide-react";
import { FaGithub } from "react-icons/fa6";

import { ThemeLogo } from "@/components/theme-visuals";

const repositoryUrl = "https://github.com/thiratt/nekoshare";

const projectLinks = [
  {
    name: "Repository",
    description: "Read the code",
    href: repositoryUrl,
    icon: FaGithub,
  },
  {
    name: "Issues",
    description: "Report or discuss",
    href: `${repositoryUrl}/issues`,
    icon: CircleDot,
  },
  {
    name: "Architecture",
    description: "See the direction",
    href: `${repositoryUrl}/blob/main/docs/ARCHITECTURE.md`,
    icon: FileCode2,
  },
  {
    name: "MIT License",
    description: "Use and contribute",
    href: `${repositoryUrl}/blob/main/LICENSE`,
    icon: Scale,
  },
];

export function OssFooter() {
  return (
    <footer className="border-t border-border/70 bg-muted/15">
      <div className="mx-auto max-w-7xl border-x border-border/70 bg-background">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-border/70 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <ThemeLogo alt="Neko Share logo" width="24" height="24" />
              <span className="font-semibold">Neko Share</span>
            </Link>

            <h2 className="mt-5 max-w-xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Built in the open. Still being built.
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
              Neko Share is a work in progress focused on a dependable,
              direct-first transfer engine. Follow the code, open an issue, or
              help shape what comes next.
            </p>

            <a
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              <FaGithub />
              View the repository
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <nav
            aria-label="Open-source project links"
            className="grid sm:grid-cols-2"
          >
            {projectLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="group min-h-36 border-b border-border/70 p-6 transition-colors hover:bg-muted/30 sm:odd:border-r sm:nth-last-[-n+2]:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <item.icon className="size-5 text-muted-foreground" />
                  <ArrowUpRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-4 font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/70 px-6 py-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Neko Share contributors</span>
          <span>Direct-first · Built in public · Work in progress</span>
        </div>
      </div>
    </footer>
  );
}
