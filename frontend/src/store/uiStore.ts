import { create } from 'zustand';
import type { ThemeMode, DrawerType, DialogType } from '../types/ui.types';

export interface UIStore {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  
  isExplorerPanelOpen: boolean;
  openExplorerPanel: () => void;
  closeExplorerPanel: () => void;
  toggleExplorerPanel: () => void;
  
  drawerType: DrawerType | null;
  drawerPayload: unknown;
  openDrawer: <T>(type: DrawerType, payload?: T) => void;
  closeDrawer: () => void;
  
  dialogType: DialogType | null;
  dialogPayload: unknown;
  openDialog: <T>(type: DialogType, payload?: T) => void;
  closeDialog: () => void;
}

export const useUIStore = create<UIStore>((set) => {
  // Initialize theme from localStorage
  const storedTheme = (localStorage.getItem('QB_PORTAL_THEME') as ThemeMode) || 'dark';
  // Sync the class on initial load
  if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('dark', storedTheme === 'dark');
  }

  return {
    theme: storedTheme,
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('QB_PORTAL_THEME', newTheme);
      return { theme: newTheme };
    }),
    setTheme: (theme) => set(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('QB_PORTAL_THEME', theme);
      return { theme };
    }),

    isExplorerPanelOpen: false, // Default to closed on mobile, ignored on desktop if always visible
    openExplorerPanel: () => set({ isExplorerPanelOpen: true }),
    closeExplorerPanel: () => set({ isExplorerPanelOpen: false }),
    toggleExplorerPanel: () => set((state) => ({ isExplorerPanelOpen: !state.isExplorerPanelOpen })),

    drawerType: null,
    drawerPayload: null,
    openDrawer: (type, payload) => set({ drawerType: type, drawerPayload: payload ?? null }),
    closeDrawer: () => set({ drawerType: null, drawerPayload: null }),

    dialogType: null,
    dialogPayload: null,
    openDialog: (type, payload) => set({ dialogType: type, dialogPayload: payload ?? null }),
    closeDialog: () => set({ dialogType: null, dialogPayload: null }),
  };
});
