import { apiClient } from './client';

export interface UserCreatePayload {
  full_name: string;
  email: string;
  password: string;
  department: string;
  is_admin?: boolean;
  subject_ids?: number[];
  grade_levels?: number[];
  hod_allowed_subject_ids?: number[];
}

export const registerStaff = async (payload: UserCreatePayload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data;
};
