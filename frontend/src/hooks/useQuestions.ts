import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchQuestions, createQuestion } from '../api/questionApi';
import type { QuestionCreatePayload } from '../api/questionApi';
import { toast } from 'react-hot-toast';
import { formatError } from '../utils/error';

export const useQuestions = (params: any = {}) => {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: () => fetchQuestions(params),
    staleTime: 1 * 60 * 1000,
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: QuestionCreatePayload) => createQuestion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Question created successfully!');
    },
    onError: (err: any) => {
      toast.error(formatError(err, 'Failed to create question'));
    }
  });
};
