import client from './client';

export const fetchSyllabuses = async () => {
  const res = await client.get('/curriculum/syllabuses');
  return res.data.items;
};

export const fetchGrades = async (syllabusId: number) => {
  const res = await client.get(`/curriculum/grades/${syllabusId}`);
  return res.data.items;
};

export const fetchSubjects = async (gradeConfigId: number) => {
  const res = await client.get(`/curriculum/subjects/${gradeConfigId}`);
  return res.data.items;
};

export const fetchTopics = async (subjectId: number) => {
  const res = await client.get(`/curriculum/topics/subject/${subjectId}`);
  return res.data.items;
};
