import { create } from 'zustand';
import client from '../api/client';

interface User {
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  is_admin: boolean;
  subjects: { subject_id: number; subject_name: string }[];
  grade_levels: number[];
  hod_subject_names: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastFetched: number | null;
  login: (token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!sessionStorage.getItem('token'),
  isLoading: true,
  lastFetched: null,
  login: (token: string) => {
    sessionStorage.setItem('token', token);
    set({ isAuthenticated: true, lastFetched: null });
  },
  logout: () => {
    sessionStorage.removeItem('token');
    set({ user: null, isAuthenticated: false, lastFetched: null });
  },
  fetchMe: async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false, lastFetched: null });
      return;
    }

    const { lastFetched } = get();
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (lastFetched && Date.now() - lastFetched < FIVE_MINUTES) {
      set({ isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await client.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, lastFetched: Date.now() });
    } catch (error) {
      set({ user: null, isAuthenticated: false, lastFetched: null });
      sessionStorage.removeItem('token');
    } finally {
      set({ isLoading: false });
    }
  },
}));
