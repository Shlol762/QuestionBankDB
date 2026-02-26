import client from '../api/client';

export async function getUserPreferences() {
  const res = await client.get('/auth/me/preferences');
  return res.data;
}

export async function updateUserPreferences(preferences: any) {
  const res = await client.put('/auth/me/preferences', preferences);
  return res.data;
}
