import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchCurriculumHierarchy,
  createSyllabus,
  updateSyllabus,
  deleteSyllabus,
  createGrade,
  deleteGrade,
  createSubject,
  updateSubject,
  deleteSubject,
  createTopic,
  updateTopic,
  deleteTopic
} from '../api/curriculumApi';
import { toast } from 'react-hot-toast';

export const useCurriculumHierarchy = () => {
  return useQuery({
    queryKey: ['curriculum_hierarchy'],
    queryFn: fetchCurriculumHierarchy,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSyllabus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSyllabus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Syllabus created successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create syllabus');
    }
  });
};

export const useUpdateSyllabus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { syllabus_name?: string; academic_year?: string } }) => 
      updateSyllabus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Syllabus updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update syllabus');
    }
  });
};

export const useDeleteSyllabus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSyllabus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Syllabus deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete syllabus');
    }
  });
};

export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Grade level added successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add grade level');
    }
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Grade level deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete grade level');
    }
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Subject created successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create subject');
    }
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { subject_name?: string } }) => 
      updateSubject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Subject updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update subject');
    }
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Subject deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete subject');
    }
  });
};

export const useCreateTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Topic created successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create topic');
    }
  });
};

export const useUpdateTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { topic_name?: string } }) => 
      updateTopic(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Topic updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update topic');
    }
  });
};

export const useDeleteTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum_hierarchy'] });
      toast.success('Topic deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete topic');
    }
  });
};

