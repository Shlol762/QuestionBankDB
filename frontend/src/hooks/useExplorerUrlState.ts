import { useSearchParams } from 'react-router-dom';

export interface ExplorerUrlState {
  topicId: number | null;
  subjectId: number | null;
  gradeId: number | null;
  syllabusId: number | null;
  selectionLevel: 'none' | 'syllabus' | 'grade' | 'subject' | 'topic';
  selectTopic: (topicId: number) => void;
  selectSubject: (subjectId: number) => void;
  selectGrade: (gradeId: number) => void;
  selectSyllabus: (syllabusId: number) => void;
  clearSelection: () => void;
}

function parseIntOrNull(s: string | null): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

export function useExplorerUrlState(): ExplorerUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const topicId = parseIntOrNull(searchParams.get('topic'));
  const subjectId = parseIntOrNull(searchParams.get('subject'));
  const gradeId = parseIntOrNull(searchParams.get('grade'));
  const syllabusId = parseIntOrNull(searchParams.get('syllabus'));

  const selectionLevel = topicId !== null 
    ? 'subject' 
    : subjectId !== null 
      ? 'subject' 
      : gradeId !== null
        ? 'grade'
        : syllabusId !== null 
          ? 'syllabus' 
          : 'none';

  // We explicitly clear the other parameters to ensure only one level is selected.
  // This maintains the single source of truth and prevents overlapping state issues.
  const selectTopic = (id: number) => {
    setSearchParams({ topic: String(id) }, { replace: false });
  };

  const selectSubject = (id: number) => {
    setSearchParams({ subject: String(id) }, { replace: false });
  };

  const selectGrade = (id: number) => {
    setSearchParams({ grade: String(id) }, { replace: false });
  };

  const selectSyllabus = (id: number) => {
    setSearchParams({ syllabus: String(id) }, { replace: false });
  };

  const clearSelection = () => {
    setSearchParams({}, { replace: true });
  };

  return {
    topicId,
    subjectId,
    gradeId,
    syllabusId,
    selectionLevel,
    selectTopic,
    selectSubject,
    selectGrade,
    selectSyllabus,
    clearSelection,
  };
}
