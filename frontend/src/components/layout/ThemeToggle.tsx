import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

const STORAGE_KEY = "mayhapottabi-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center min-w-[44px] min-h-[44px] text-foreground hover:text-muted-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
    </button>
  );
}
