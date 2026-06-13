import { apiClient } from './client';

export interface QuestionRead {
  question_id: number;
  question_text: string;
  answer_text: string;
  options?: any;
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
}

export interface PaginatedQuestions {
  items: QuestionRead[];
  total: number;
}

export const fetchQuestions = async (params: any = {}): Promise<PaginatedQuestions> => {
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

export const createQuestion = async (payload: QuestionCreatePayload) => {
  const response = await apiClient.post('/questions/', payload);
  return response.data;
};
