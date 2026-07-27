import { useEffect, useState } from "react";

import { Link } from "@tanstack/react-router";
import { LuActivity, LuChevronDown } from "react-icons/lu";

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

import { ThemeLogo, ThemeToggleIcon } from "@/components/theme-visuals";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Security", href: "#security" },
  { name: "Roadmap", href: "#roadmap" },
  { name: "Docs", href: "#docs" },
];

function Brand() {
  return (
    <Link
      to="/"
      className="flex h-full items-center gap-2.5 px-4 transition-opacity hover:opacity-80 sm:px-5"
      aria-label="Neko Share home"
    >
      <ThemeLogo alt="Neko Share logo" width="28" height="28" />
    </Link>
  );
}

export function Header({
  setTheme,
}: {
  setTheme: (theme: "light" | "dark" | "system") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const previousRootOverflow = root.style.overflow;
    const previousScrollbarGutter = root.style.scrollbarGutter;
    const previousBodyOverflow = body.style.overflow;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsOpen(false);
      }
    };

    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "stable";
    body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.scrollbarGutter = previousScrollbarGutter;
      body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      desktopQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [isOpen]);

  const toggleTheme = () => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "light" : "dark",
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "relative z-20 mx-auto flex h-14 items-stretch border-b bg-background/70 backdrop-blur-md shadow-xs",
          (isScrolled || isOpen) &&
            "border-border bg-background/90 backdrop-blur-xl",
        )}
      >
        <Brand />

        <nav className="hidden items-stretch md:flex">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-4 font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center md:flex">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="group h-full rounded-none px-4"
                aria-label="Select language"
              >
                EN
                <LuChevronDown className="transition-transform duration-200 group-data-open:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Languages</DropdownMenuLabel>
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>Thai</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* <Button
            variant="ghost"
            size="icon-sm"
            className="h-full w-12 rounded-none"
            asChild
          >
            <a
              href="#development"
              aria-label="View Neko Share development status"
            >
              <LuActivity />
            </a>
          </Button> */}

          <Button
            variant="ghost"
            size="icon-sm"
            className="h-full w-12 rounded-none"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            <ThemeToggleIcon />
          </Button>
        </div>

        <Button
          className="ml-auto h-full w-14 rounded-none border-border/70 md:hidden"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          <span aria-hidden="true" className="relative block size-5">
            <span
              className={cn(
                "absolute left-1/2 top-1.5 h-0.5 w-4 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ease-out",
                isOpen && "translate-y-[3px] -rotate-45",
              )}
            />
            <span
              className={cn(
                "absolute left-1/2 top-3 h-0.5 w-4 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ease-out",
                isOpen && "-translate-y-[3px] rotate-45",
              )}
            />
          </span>
        </Button>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 top-14 z-10 flex flex-col overflow-hidden bg-background/95 backdrop-blur-xl transition-opacity duration-200 md:hidden",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <div
          className={cn(
            "grid shrink-0 border-t bg-background transition-[grid-template-rows,opacity] duration-200",
            isOpen
              ? "grid-rows-[1fr] border-border opacity-100"
              : "grid-rows-[0fr] border-transparent opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-4 pb-5 pt-4 sm:px-6">
              <nav className="grid gap-1">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="rounded-md px-3 py-3.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {item.name}
                  </a>
                ))}
              </nav>
              <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-4">
                <Button variant="outline" size="sm">
                  EN
                </Button>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href="#development"
                    aria-label="View Neko Share development status"
                    onClick={() => setIsOpen(false)}
                  >
                    <LuActivity />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                >
                  <ThemeToggleIcon />
                </Button>
                <Button className="ml-auto" size="sm" asChild>
                  <a href="#roadmap" onClick={() => setIsOpen(false)}>
                    View roadmap
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setIsOpen(false)}
          className="min-h-0 flex-1"
        />
      </div>
    </header>
  );
}
