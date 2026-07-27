import {
  Fingerprint,
  Laptop,
  Loader,
  Lock,
  ScanFace,
  Server,
  Shield,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

const securityFeatures = [
  {
    icon: Lock,
    title: "Per-transfer keys",
    description:
      "Each transfer uses its own encryption key instead of relying on one account-wide key for every file.",
  },
  {
    icon: Fingerprint,
    title: "Verified recipients",
    description:
      "The destination device and receiver are confirmed before file data is sent.",
  },
  {
    icon: Server,
    title: "Encrypted relay transfers",
    description:
      "Files remain encrypted when a direct connection is unavailable and a relay is needed.",
  },
  {
    icon: Shield,
    title: "Open security model",
    description:
      "The protocol, assumptions, and known limitations will be documented for review as the project matures.",
  },
];

export function Security({ compact = false }: { compact?: boolean }) {
  return (
    <section
      id="security"
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
            : "mx-auto max-w-7xl border-x border-border/70 bg-muted/15"
        }
      >
        <div className="grid border-b border-border/70 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-border/70 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <Badge variant="outline">
              <Shield />
              Security
            </Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Private by design
            </h2>
          </div>
          <div className="flex items-end p-6 sm:p-10 lg:p-12">
            <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Neko Share encrypts file data, verifies the destination, and
              requires explicit receiver approval—whether a transfer goes
              directly or through a relay.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-border/70 p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="overflow-hidden rounded-lg border border-border bg-background shadow-xl shadow-black/5">
              <div className="flex items-center justify-between border-b border-border bg-muted/25 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader className="size-3.5 animate-spin" />
                  <span className="text-xs font-medium">
                    Transfer in progress
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                  <TransferDevice
                    icon={Laptop}
                    title="Your device"
                    description="Encrypted before sending"
                  />
                  <div className="flex min-w-20 items-center">
                    <span className="h-px flex-1 border-t border-dashed border-border" />
                    <div className="flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                      <Lock className="size-3.5" />
                    </div>
                    <span className="h-px flex-1 border-t border-dashed border-border" />
                  </div>
                  <TransferDevice
                    icon={ScanFace}
                    title="Recipient device"
                    description="Decrypted on arrival"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {[
                  ["Encrypted", "File data"],
                  ["Verified", "Recipient"],
                  ["Direct", "When possible"],
                ].map(([value, label]) => (
                  <div key={value} className="p-4 text-center">
                    <p className="text-sm font-semibold">{value}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-1">
            {securityFeatures.map((feature) => (
              <article
                key={feature.title}
                className="flex gap-4 border-b border-border/70 p-6 transition-colors hover:bg-background sm:odd:border-r lg:odd:border-r-0 lg:last:border-b-0"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                  <feature.icon className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 px-6 py-4 sm:px-10 lg:px-12">
          <p className="text-xs leading-5 text-muted-foreground">
            The security model is still being implemented and reviewed.
          </p>
        </div>
      </div>
    </section>
  );
}

function TransferDevice({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Laptop;
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-muted/25 sm:size-14">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 truncate text-xs font-medium sm:text-sm">{title}</p>
      <p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
        {description}
      </p>
    </div>
  );
}
