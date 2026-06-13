import { apiClient } from './client';

export interface QuestionRead {
  question_id: number;
  question_text: string;
  answer_text: string;
  options?: Record<string, string>;
  image_url?: string;
  marks: number;
  difficulty: string;
  q_type: string;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  teacher_id: number;
  teacher?: { full_name: string };
  topics: { topic_id: number; topic_name: string; subject_id: number }[];
}

export interface PaginatedQuestions {
  items: QuestionRead[];
  total: number;
}

export const fetchQuestions = async (params: Record<string, unknown> = {}): Promise<PaginatedQuestions> => {
  const response = await apiClient.get('/questions/', { params });
  return response.data;
};

export interface QuestionCreatePayload {
  topic_ids: number[];
  question_text: string;
  answer_text: string;
  options?: Record<string, string>;
  marks: number;
  difficulty: string;
  q_type: string;
  status: string;
}

export interface QuestionUpdatePayload {
  update_mode?: "everywhere" | "copy";
  context_topic_id?: number;
  topic_ids?: number[];
  question_text?: string;
  answer_text?: string;
  options?: Record<string, string>;
  marks?: number;
  difficulty?: string;
  q_type?: string;
  status?: string;
  is_active?: boolean;
}

export const createQuestion = async (payload: QuestionCreatePayload) => {
  const response = await apiClient.post('/questions/', payload);
  return response.data;
};

export const fetchQuestionById = async (id: number): Promise<QuestionRead> => {
  const response = await apiClient.get(`/questions/${id}`);
  return response.data;
};

export const updateQuestion = async (id: number, payload: QuestionUpdatePayload) => {
  const response = await apiClient.patch(`/questions/${id}`, payload);
  return response.data;
};

export const deleteQuestion = async (
  id: number,
  params: { delete_mode?: "unlink" | "delete"; topic_id?: number } = {}
) => {
  const response = await apiClient.delete(`/questions/${id}`, { params });
  return response.data;
};
