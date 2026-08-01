'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from "lucide-react";

/** Toggles the `.dark` class on <html> and persists the choice. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Reflect whatever the pre-hydration scripts already applied (a user's saved
    // choice, or — when they have none — the workspace's default theme). Don't
    // recompute from system here, or it would override the org default.
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="grid size-8 place-items-center rounded-md border text-sm hover:bg-surface-hover cursor-pointer"
    >
      {dark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
