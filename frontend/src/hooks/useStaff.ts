import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toast } from 'react-hot-toast';
import { registerStaff } from '../api/authApi';
import type { UserCreatePayload } from '../api/authApi';
import { formatError } from '../utils/error';

export interface SubjectSimple {
  subject_id: number;
  subject_name: string;
  grade_name?: string;
  syllabus_name?: string;
}

export interface UserRead {
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  is_admin: boolean;
  is_active: boolean;
  subjects: SubjectSimple[];
  grade_levels: number[];
  hod_subject_names: string[];
  hod_allowed_subject_ids: number[];
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface UserUpdatePayload {
  full_name?: string;
  email?: string;
  password?: string;
  department?: string;
  is_admin?: boolean;
  is_active?: boolean;
  subject_ids?: number[];
  grade_levels?: number[];
  hod_allowed_subject_ids?: number[];
}

export const useUsers = (role?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 100 };
      if (role && role !== 'all') {
        params.role = role;
      }
      const res = await apiClient.get<Page<UserRead>>('/auth/users', { params });
      return res.data;
    },
    ...options
  });
};

export const useRegisterStaff = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => registerStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member onboarded successfully!');
    },
    onError: (err: any) => {
      toast.error(formatError(err, 'Failed to onboard staff member'));
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UserUpdatePayload }) => {
      const res = await apiClient.patch<UserRead>(`/auth/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Staff profile updated successfully!');
    },
    onError: (err: any) => {
      toast.error(formatError(err, 'Failed to update staff profile'));
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/auth/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff account deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(formatError(err, 'Failed to delete staff account'));
    }
  });
};

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const res = await apiClient.post(`/auth/users/${id}/reset-password`, { new_password: newPassword });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully!');
    },
    onError: (err: any) => {
      toast.error(formatError(err, 'Failed to reset password'));
    }
  });
};
