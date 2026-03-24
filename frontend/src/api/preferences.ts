import client from '../api/client';

export interface UserPreferencesPayload {
  defaultMarks?: number;
  defaultDifficulty?: 'Easy' | 'Medium' | 'Hard';
}

export async function getUserPreferences() {
  const res = await client.get('/auth/me/preferences');
  return res.data;
}

export async function updateUserPreferences(preferences: UserPreferencesPayload) {
  const res = await client.put('/auth/me/preferences', preferences);
  return res.data;
}
