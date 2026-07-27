import type { ComponentProps } from "react";

import { LuMoon, LuSun } from "react-icons/lu";

import { cn } from "@workspace/ui/lib/utils";

type ThemeLogoProps = Omit<ComponentProps<"img">, "src">;

export function ThemeLogo({ className, ...props }: ThemeLogoProps) {
  return (
    <>
      <img
        {...props}
        src="/NekoShare-Light.svg"
        className={cn("dark:hidden", className)}
      />
      <img
        {...props}
        src="/NekoShare-Dark.svg"
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}

export function ThemeToggleIcon() {
  return (
    <>
      <LuSun aria-hidden="true" className="dark:hidden" />
      <LuMoon aria-hidden="true" className="hidden dark:block" />
    </>
  );
}