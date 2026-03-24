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
      version: 1,
      migrate: (persistedState, version) => {
        if (version < 1 || !persistedState) {
          return {
            defaultMarks: 5,
            defaultDifficulty: 'Medium' as DifficultyLevel,
          };
        }

        return persistedState as SettingsState;
      },
      partialize: (state) => ({
        defaultMarks: state.defaultMarks,
        defaultDifficulty: state.defaultDifficulty,
      }),
    }
  )
);
