import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DifficultyLevel = "Easy" | "Medium" | "Hard";

interface SettingsState {
  defaultMarks: number;
  defaultDifficulty: DifficultyLevel;
  setDefaultMarks: (marks: number) => void;
  setDefaultDifficulty: (difficulty: DifficultyLevel) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultMarks: 5,
      defaultDifficulty: 'Medium',
      setDefaultMarks: (marks) => set({ defaultMarks: marks }),
      setDefaultDifficulty: (difficulty) => set({ defaultDifficulty: difficulty }),
    }),
    {
      name: 'question-bank-settings-storage', // name of the item in the storage (must be unique)
    }
  )
);
