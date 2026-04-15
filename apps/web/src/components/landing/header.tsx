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

import {
  AnimatePresence,
  motion,
} from "@workspace/app-ui/components/provide-animate";

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
                  <img src="/NekoShare-Light.svg" alt="Neko Share Light Logo" />
                ) : (
                  <img src="/NekoShare-Dark.svg" alt="Neko Share Dark Logo" />
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
                >
                  <FaGithub />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
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
              <motion.span
                animate={isOpen ? { y: 0, rotate: -45 } : { y: -6, rotate: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-foreground"
              />
              <motion.span
                animate={
                  isOpen
                    ? { opacity: 0, scaleX: 0.6 }
                    : { opacity: 1, scaleX: 1 }
                }
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-foreground"
              />
              <motion.span
                animate={isOpen ? { y: 0, rotate: 45 } : { y: 6, rotate: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-foreground"
              />
            </span>
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.045, delayChildren: 0.04 },
                },
                exit: {
                  transition: { staggerChildren: 0.03, staggerDirection: -1 },
                },
              }}
              className="flex flex-col gap-2 px-4 py-5"
            >
              {navigation.map((item) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  variants={{
                    hidden: { opacity: 0, y: -8 },
                    visible: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -6 },
                  }}
                  transition={{ duration: 0.18 }}
                  className="rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {item.name}
                </motion.a>
              ))}

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -8 },
                  visible: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -6 },
                }}
                transition={{ duration: 0.18 }}
                className="mt-2 flex items-center gap-2 border-t border-border/40 pt-4"
              >
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaGithub />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
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
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
