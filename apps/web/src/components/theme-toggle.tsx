import { Button, useTheme } from "@otium/ui";
import { Moon, Sun } from "lucide-react";

/** Bascule clair/sombre. Accessible (aria-label, focus visible via le design system). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Activer le thème ${next === "dark" ? "sombre" : "clair"}`}
      onClick={() => setTheme(next)}
    >
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
