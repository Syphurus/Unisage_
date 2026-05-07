"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/hooks/useTheme";

export function ThemeToggle() {
  const { theme, isReady, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className="h-9 w-9 rounded-xl"
    >
      {isReady && theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
