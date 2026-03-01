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
  login: (token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
  login: (token: string) => {
    localStorage.setItem('token', token);
    set({ isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },
  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const response = await client.get('/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('token');
    } finally {
      set({ isLoading: false });
    }
  },
}));
