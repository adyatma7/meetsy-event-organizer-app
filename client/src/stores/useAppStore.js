/**
 * Global App Store — Zustand
 *
 * Lightweight global state for cross-component data.
 * Keep module-specific state in component state or custom hooks.
 */

import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};

// Apply initial theme on load
if (typeof window !== 'undefined') {
  if (getInitialTheme() === 'dark') {
    document.documentElement.classList.add('dark');
  }
}

const useAppStore = create((set) => ({
  // --- Theme state ---
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),

  // --- Toast notifications ---
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { id: Date.now(), ...toast }],
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // --- Sidebar state ---
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // --- Current event context (for admin) ---
  currentEvent: null,
  setCurrentEvent: (event) => set({ currentEvent: event }),
}));

export default useAppStore;
