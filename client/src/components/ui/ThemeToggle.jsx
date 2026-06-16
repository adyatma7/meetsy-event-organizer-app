import React from 'react';
import { Moon, Sun } from 'lucide-react';
import useAppStore from '../../stores/useAppStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Dark Mode"
      className="p-2 border-2 border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-md shadow-brutal dark:shadow-brutal-dark hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
