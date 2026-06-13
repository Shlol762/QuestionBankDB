import { useMemo } from 'react';
import { useExplorerUrlState } from './useExplorerUrlState';
import { useCurriculumHierarchy } from './useCurriculum';

export interface TopicNode { id: number; name: string; questionCount: number; }
export interface SubjectNode { id: number; name: string; topics: TopicNode[]; }
export interface GradeNode { id: number; level: number; name: string; pdfUrl?: string; subjects: SubjectNode[]; }
export interface SyllabusNode { id: number; name: string; year: string; grades: GradeNode[]; }

export interface ResolvedCurriculumSelection {
  syllabus: SyllabusNode | null;
  grade: GradeNode | null;
  subject: SubjectNode | null;
  topic: TopicNode | null;
  selectionLevel: 'none' | 'syllabus' | 'grade' | 'subject' | 'topic';
  hierarchy: SyllabusNode[];
  isLoading: boolean;
}

export function useResolvedCurriculumSelection(): ResolvedCurriculumSelection {
  const urlState = useExplorerUrlState();
  const { data: rawHierarchy, isLoading } = useCurriculumHierarchy();

  const hierarchy: SyllabusNode[] = useMemo(() => {
    if (!rawHierarchy) return [];
    return rawHierarchy.map(s => ({
      id: s.syllabus_id,
      name: s.syllabus_name,
      year: s.academic_year,
      grades: (s.grades || []).map(g => ({
        id: g.config_id,
        level: g.grade_level,
        name: `Grade ${g.grade_level}`,
        pdfUrl: g.pdf_url,
        subjects: (g.subjects || []).map(sub => ({
          id: sub.subject_id,
          name: sub.subject_name,
          topics: (sub.topics || []).map(t => ({
            id: t.topic_id,
            name: t.topic_name,
            questionCount: 0
          }))
        }))
      }))
    }));
  }, [rawHierarchy]);

  return useMemo(() => {
    const { topicId, subjectId, gradeId, syllabusId } = urlState;
    
    if (topicId !== null) {
      for (const s of hierarchy) {
        for (const g of s.grades) {
          for (const sub of g.subjects) {
            const t = sub.topics.find(t => t.id === topicId) ?? null;
            if (t) return { syllabus: s, grade: g, subject: sub, topic: t, selectionLevel: 'subject', hierarchy, isLoading };
          }
        }
      }
    }

    if (subjectId !== null) {
      for (const s of hierarchy) {
        for (const g of s.grades) {
          const sub = g.subjects.find(sub => sub.id === subjectId) ?? null;
          if (sub) return { syllabus: s, grade: g, subject: sub, topic: null, selectionLevel: 'subject', hierarchy, isLoading };
        }
      }
    }

    if (gradeId !== null) {
      for (const s of hierarchy) {
        const g = s.grades.find(g => g.id === gradeId) ?? null;
        if (g) return { syllabus: s, grade: g, subject: null, topic: null, selectionLevel: 'grade', hierarchy, isLoading };
      }
    }

    if (syllabusId !== null) {
      const s = hierarchy.find(s => s.id === syllabusId) ?? null;
      if (s) return { syllabus: s, grade: null, subject: null, topic: null, selectionLevel: 'syllabus', hierarchy, isLoading };
    }

    return { syllabus: null, grade: null, subject: null, topic: null, selectionLevel: 'none', hierarchy, isLoading };
  }, [urlState, hierarchy, isLoading]);
}
