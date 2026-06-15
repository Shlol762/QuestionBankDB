import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, setAuthToken } from '../api/client';

export const useSetupStatus = () => {
  return useQuery({
    queryKey: ['setup_status'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/setup-status');
      return res.data as { setup_required: boolean };
    }
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    },
    retry: false
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: async (formData: URLSearchParams) => {
      const res = await apiClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      setAuthToken(data.access_token);
    }
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) => {
      const res = await apiClient.patch('/auth/me/password', payload);
      return res.data;
    }
  });
};

export const useLogout = () => {
  return () => {
    setAuthToken(null);
    window.location.href = '/login';
  };
};

