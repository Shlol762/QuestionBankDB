import { apiClient } from './client';

export interface TopicRead {
  topic_id: number;
  topic_name: string;
  subject_id: number;
}

export interface SubjectRead {
  subject_id: number;
  subject_name: string;
  config_id: number;
  allowed_subject_id?: number;
}

export interface GradeRead {
  config_id: number;
  syllabus_id: number;
  grade_level: number;
  pdf_url?: string;
}

export interface SyllabusRead {
  syllabus_id: number;
  syllabus_name: string;
  academic_year: string;
  pdf_url?: string;
}

export interface SubjectHierarchy {
  subject_id: number;
  subject_name: string;
  config_id: number;
  allowed_subject_id?: number;
  topics: TopicRead[];
}

export interface GradeHierarchy {
  config_id: number;
  syllabus_id: number;
  grade_level: number;
  pdf_url?: string;
  subjects: SubjectHierarchy[];
}

export interface SyllabusHierarchyRead {
  syllabus_id: number;
  syllabus_name: string;
  academic_year: string;
  pdf_url?: string;
  grades: GradeHierarchy[];
}

export const fetchCurriculumHierarchy = async (): Promise<SyllabusHierarchyRead[]> => {
  const response = await apiClient.get('/curriculum/hierarchy');
  return response.data;
};

export const createSyllabus = async (payload: { syllabus_name: string; academic_year: string }): Promise<SyllabusRead> => {
  const response = await apiClient.post('/curriculum/syllabuses', payload);
  return response.data;
};

export const updateSyllabus = async (id: number, payload: { syllabus_name?: string; academic_year?: string }): Promise<SyllabusRead> => {
  const response = await apiClient.patch(`/curriculum/syllabuses/${id}`, payload);
  return response.data;
};

export const deleteSyllabus = async (id: number): Promise<void> => {
  await apiClient.delete(`/curriculum/syllabuses/${id}`);
};

export const createGrade = async (payload: { syllabus_id: number; grade_level: number }): Promise<GradeRead> => {
  const response = await apiClient.post('/curriculum/grades', payload);
  return response.data;
};

export const deleteGrade = async (id: number): Promise<void> => {
  await apiClient.delete(`/curriculum/grades/${id}`);
};

export const createSubject = async (payload: { config_id: number; allowed_subject_id: number; subject_name: string }): Promise<SubjectRead> => {
  const response = await apiClient.post('/curriculum/subjects', payload);
  return response.data;
};

export const updateSubject = async (id: number, payload: { subject_name?: string }): Promise<SubjectRead> => {
  const response = await apiClient.patch(`/curriculum/subjects/${id}`, payload);
  return response.data;
};

export const deleteSubject = async (id: number): Promise<void> => {
  await apiClient.delete(`/curriculum/subjects/${id}`);
};

export const createTopic = async (payload: { subject_id: number; topic_name: string }): Promise<TopicRead> => {
  const response = await apiClient.post('/curriculum/topics', payload);
  return response.data;
};

export const updateTopic = async (id: number, payload: { topic_name?: string }): Promise<TopicRead> => {
  const response = await apiClient.patch(`/curriculum/topics/${id}`, payload);
  return response.data;
};

export const deleteTopic = async (id: number): Promise<void> => {
  await apiClient.delete(`/curriculum/topics/${id}`);
};

export const duplicateSyllabus = async (
  id: number,
  payload: { new_syllabus_name: string; new_academic_year: string }
): Promise<SyllabusRead> => {
  const response = await apiClient.post(`/curriculum/syllabuses/${id}/duplicate`, payload);
  return response.data;
};

export const updateGrade = async (
  id: number,
  payload: { grade_level?: number; pdf_url?: string | null }
): Promise<GradeRead> => {
  const response = await apiClient.patch(`/curriculum/grades/${id}`, payload);
  return response.data;
};

export const uploadPdf = async (file: File): Promise<{ pdf_url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/curriculum/upload-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};



