import { FaAndroid, FaApple, FaLinux, FaWindows } from "react-icons/fa";
import { LuGlobe } from "react-icons/lu";
import { SiIos } from "react-icons/si";

import { Button } from "@workspace/ui/components/button";

const platforms = [
  { name: "macOS", icon: FaApple, status: "Planned" },
  { name: "Windows", icon: FaWindows, status: "In progress" },
  { name: "Linux", icon: FaLinux, status: "Planned" },
  { name: "iOS", icon: SiIos, status: "Planned" },
  { name: "Android", icon: FaAndroid, status: "In progress" },
  { name: "Web", icon: LuGlobe, status: "Planned" },
];

export function Platforms({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={
        compact
          ? "bg-background"
          : "bg-muted/15 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      }
    >
      <div
        className={
          compact
            ? "mx-auto grid max-w-7xl border-x border-border/70 lg:grid-cols-[0.82fr_1.18fr]"
            : "mx-auto grid max-w-7xl overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm lg:grid-cols-[0.82fr_1.18fr]"
        }
      >
        <div className="flex flex-col justify-between border-b border-border/70 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
          <div>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Cross-platform, one client at a time.
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
              Desktop currently has the strongest runtime. Android and web are
              earlier in the journey, while macOS, Linux, and iOS remain future
              work.
            </p>
          </div>
          <Button className="w-fit" disabled>
            Coming soon
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 [&>*:not(:nth-child(3n))]:border-r">
          {platforms.map((platform) => (
            <article
              key={platform.name}
              className="group flex min-h-44 flex-col justify-between border-b border-border/70 p-5 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between">
                <platform.icon className="size-6 text-muted-foreground transition-colors group-hover:text-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {platform.status}
                </span>
              </div>
              <p className="text-sm font-medium">{platform.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
