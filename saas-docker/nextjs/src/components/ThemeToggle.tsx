"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`p-2 rounded-xl transition-all duration-300 ${
        isDark
          ? "bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white"
          : "bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
      }`}
      title={isDark ? "Modo Claro" : "Modo Escuro"}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
