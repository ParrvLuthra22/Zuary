"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const [mounted, setMounted] = useState(false);

  // The persisted theme is only known after hydration; rendering the icon
  // before that would flash the wrong one.
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} theme` : "Toggle theme"
      }
      className={cn(
        "text-fg-muted transition-colors duration-[--dur-micro] hover:text-fg",
        className,
      )}
    >
      {mounted && theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
