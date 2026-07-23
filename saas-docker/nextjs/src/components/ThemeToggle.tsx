"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-2xl bg-stone-200/50 dark:bg-stone-800/50 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Alternar Tema Claro/Escuro"
      className={`relative p-2.5 rounded-2xl border transition-all duration-300 flex items-center justify-center gap-2 text-xs font-bold ${
        isDark
          ? "bg-stone-900 border-stone-800 text-amber-400 hover:bg-stone-800 hover:border-stone-700 shadow-md"
          : "bg-white border-stone-200 text-slate-800 hover:bg-stone-100 hover:border-stone-300 shadow-sm"
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          <span className="hidden sm:inline font-mono text-[11px]">Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
          <span className="hidden sm:inline font-mono text-[11px]">Modo Escuro</span>
        </>
      )}
    </button>
  );
}
