import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toast } from 'react-hot-toast';

export interface AllowedSubject {
  allowed_subject_id: number;
  subject_name: string;
  recommendation_note?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AllowedGrade {
  allowed_grade_id: number;
  grade_name: string;
  recommendation_note?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export const useAllowedSubjects = (activeOnly = false) => {
  return useQuery({
    queryKey: ['allowed_subjects', activeOnly],
    queryFn: async () => {
      const res = await apiClient.get<Page<AllowedSubject>>('/allowed-subjects', {
        params: { active_only: activeOnly, limit: 100 }
      });
      return res.data;
    }
  });
};

export const useAllowedGrades = (activeOnly = false) => {
  return useQuery({
    queryKey: ['allowed_grades', activeOnly],
    queryFn: async () => {
      const res = await apiClient.get<Page<AllowedGrade>>('/allowed-grades', {
        params: { active_only: activeOnly, limit: 100 }
      });
      return res.data;
    }
  });
};

export const useCreateAllowedSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subject_name: string; recommendation_note?: string; is_active?: boolean }) => {
      const res = await apiClient.post<AllowedSubject>('/allowed-subjects', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed_subjects'] });
      toast.success('Subject configuration added successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add subject configuration');
    }
  });
};

export const useUpdateAllowedSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; subject_name?: string; recommendation_note?: string; is_active?: boolean }) => {
      const res = await apiClient.patch<AllowedSubject>(`/allowed-subjects/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed_subjects'] });
      toast.success('Subject configuration updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update subject configuration');
    }
  });
};

export const useDeleteAllowedSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/allowed-subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed_subjects'] });
      toast.success('Subject configuration deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete subject configuration');
    }
  });
};

export const useCreateAllowedGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { grade_name: string; recommendation_note?: string; is_active?: boolean }) => {
      const res = await apiClient.post<AllowedGrade>('/allowed-grades', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed_grades'] });
      toast.success('Grade configuration added successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add grade configuration');
    }
  });
};

export const useUpdateAllowedGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; grade_name?: string; recommendation_note?: string; is_active?: boolean }) => {
      const res = await apiClient.patch<AllowedGrade>(`/allowed-grades/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed_grades'] });
      toast.success('Grade configuration updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update grade configuration');
    }
  });
};

export const useDeleteAllowedGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/allowed-grades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed_grades'] });
      toast.success('Grade configuration deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete grade configuration');
    }
  });
};
