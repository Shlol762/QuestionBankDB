import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchQuestions, createQuestion, fetchQuestionById, updateQuestion, deleteQuestion } from '../api/questionApi';
import type { QuestionCreatePayload, QuestionUpdatePayload } from '../api/questionApi';
import { toast } from 'react-hot-toast';
import { formatError } from '../utils/error';

export const useQuestions = (params: Record<string, unknown> = {}) => {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: () => fetchQuestions(params),
    staleTime: 1 * 60 * 1000,
  });
};

export const useQuestionDetails = (id: number | null | undefined) => {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => fetchQuestionById(id!),
    enabled: !!id,
    staleTime: 5 * 1000,
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
    onError: (err: unknown) => {
      toast.error(formatError(err, 'Failed to create question'));
    }
  });
};

export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: QuestionUpdatePayload }) => updateQuestion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question'] });
      toast.success('Question updated successfully!');
    },
    onError: (err: unknown) => {
      toast.error(formatError(err, 'Failed to update question'));
    }
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, deleteMode, topicId }: { id: number; deleteMode?: "unlink" | "delete"; topicId?: number }) =>
      deleteQuestion(id, { delete_mode: deleteMode, topic_id: topicId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      if (variables.deleteMode === 'unlink') {
        toast.success('Question unlinked from this topic successfully!');
      } else {
        toast.success('Question deleted permanently!');
      }
    },
    onError: (err: unknown) => {
      toast.error(formatError(err, 'Failed to delete/unlink question'));
    }
  });
};
