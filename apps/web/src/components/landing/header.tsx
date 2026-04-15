import { useEffect, useState } from "react";

import { Link } from "@tanstack/react-router";
import { FaGithub } from "react-icons/fa6";
import { LuChevronDown, LuMoon, LuSun } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Security", href: "#security" },
  { name: "Pricing", href: "#pricing" },
  { name: "Docs", href: "#docs" },
];

export function Header({
  theme,
  setTheme,
}: {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const hasSolidHeader = isScrolled || isOpen;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        hasSolidHeader
          ? "border-b border-border/40 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-linear-to-b from-background/40 to-background/0 backdrop-blur-0",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8">
                {theme === "light" ? (
                  <img
                    src="/NekoShare-Light.svg"
                    alt="Neko Share Light Logo"
                    width="32"
                    height="32"
                    decoding="async"
                  />
                ) : (
                  <img
                    src="/NekoShare-Dark.svg"
                    alt="Neko Share Dark Logo"
                    width="32"
                    height="32"
                    decoding="async"
                  />
                )}
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground">
                Neko Share
              </span>
            </Link>
            <nav className="hidden items-center md:flex">
              {navigation.map((item) => (
                <Button variant="ghost" size="sm" asChild key={item.name}>
                  <a href={item.href}>{item.name}</a>
                </Button>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-1">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    EN <LuChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Languages</DropdownMenuLabel>
                    <DropdownMenuItem>English</DropdownMenuItem>
                    <DropdownMenuItem>Thai</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Neko Share GitHub repository"
                  title="Open Neko Share GitHub repository"
                >
                  <FaGithub />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  theme === "light"
                    ? "Switch to dark theme"
                    : "Switch to light theme"
                }
                title={
                  theme === "light"
                    ? "Switch to dark theme"
                    : "Switch to light theme"
                }
                onClick={() => {
                  const newTheme = theme === "light" ? "dark" : "light";
                  setTheme(newTheme);
                }}
              >
                {theme === "light" ? <LuSun /> : <LuMoon />}
              </Button>
            </div>
            <Button className="rounded-full" disabled>
              Coming soon
            </Button>
          </div>
          <Button
            className="md:hidden"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <span className="relative block h-5 w-5">
              <span
                className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-foreground"
                style={{
                  transform: isOpen
                    ? "translateY(-50%) rotate(-45deg)"
                    : "translateY(calc(-50% - 6px))",
                  transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <span
                className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-foreground transition-[opacity,transform] duration-180 ease-out"
                style={{
                  opacity: isOpen ? 0 : 1,
                  transform: `translateY(-50%) scaleX(${isOpen ? 0.6 : 1})`,
                }}
              />
              <span
                className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-foreground"
                style={{
                  transform: isOpen
                    ? "translateY(-50%) rotate(45deg)"
                    : "translateY(calc(-50% + 6px))",
                  transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden bg-background/95 backdrop-blur-xl transition-[grid-template-rows,opacity,border-color] duration-200 ease-out md:hidden",
          isOpen
            ? "grid-rows-[1fr] border-t border-border/40 opacity-100"
            : "grid-rows-[0fr] border-t border-transparent opacity-0 pointer-events-none",
        )}
      >
        <div className="min-h-0">
          <nav className="flex flex-col gap-2 px-4 py-5">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {item.name}
              </a>
            ))}

            <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-4">
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Neko Share GitHub repository"
                  title="Open Neko Share GitHub repository"
                >
                  <FaGithub />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  theme === "light"
                    ? "Switch to dark theme"
                    : "Switch to light theme"
                }
                title={
                  theme === "light"
                    ? "Switch to dark theme"
                    : "Switch to light theme"
                }
                onClick={() => {
                  const newTheme = theme === "light" ? "dark" : "light";
                  setTheme(newTheme);
                }}
              >
                {theme === "light" ? <LuSun /> : <LuMoon />}
              </Button>
              <Button className="ml-auto rounded-full" disabled>
                Coming soon
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
