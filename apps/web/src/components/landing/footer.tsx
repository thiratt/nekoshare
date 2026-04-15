import { Link } from "@tanstack/react-router";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Docs", href: "#docs" },
  { name: "Pricing", href: "#pricing" },
];

export function Footer({ theme }: { theme: "light" | "dark" | "system" }) {
  return (
    <footer className="border-t border-border/40 bg-muted/15">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8">
                {theme === "light" ? (
                  <img
                    src="/NekoShare-Light.svg"
                    alt="Neko Share Light Logo"
                    width="32"
                    height="32"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <img
                    src="/NekoShare-Dark.svg"
                    alt="Neko Share Dark Logo"
                    width="32"
                    height="32"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground">
                Neko Share
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Direct file sharing for your devices and the people you trust.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 md:items-end">
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.name}
                </a>
              ))}
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                GitHub
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Neko Share. In active
              development.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
