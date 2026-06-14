export type ThemeMode = 'dark' | 'light';
export type DrawerType = 'CREATE_QUESTION' | 'EDIT_QUESTION' | 'CREATE_STAFF' | 'EDIT_STAFF';
export type DialogType =
  | 'ADD_SYLLABUS' | 'EDIT_SYLLABUS' | 'DELETE_SYLLABUS' | 'DUPLICATE_SYLLABUS'
  | 'ADD_GRADE'    | 'EDIT_GRADE'    | 'DELETE_GRADE' | 'MANAGE_GRADE_PDF'
  | 'ADD_SUBJECT'  | 'EDIT_SUBJECT'  | 'DELETE_SUBJECT'
  | 'ADD_TOPIC'    | 'EDIT_TOPIC'    | 'DELETE_TOPIC'
  | 'DELETE_QUESTION' | 'DELETE_USER'
  | 'ADD_ALLOWED_SUBJECT' | 'EDIT_ALLOWED_SUBJECT'
  | 'ADD_ALLOWED_GRADE'   | 'EDIT_ALLOWED_GRADE'
  | 'PREVIEW_QUESTION';

// Drawer Payloads
export interface CreateQuestionDrawerPayload { preselectedTopicId: number | null; }
export interface EditQuestionDrawerPayload { questionId: number; contextTopicId: number; }
export type CreateStaffDrawerPayload = Record<string, never>;
export interface EditStaffDrawerPayload { userId: number; }

// Dialog Payloads
export type AddSyllabusDialogPayload = Record<string, never>;
export interface EditSyllabusDialogPayload { syllabusId: number; currentName: string; currentYear: string; }
export interface DeleteSyllabusDialogPayload { syllabusId: number; syllabusName: string; }
export interface DuplicateSyllabusDialogPayload { syllabusId: number; currentName: string; currentYear: string; }

export interface AddGradeDialogPayload { syllabusId: number; }
export interface EditGradeDialogPayload { configId: number; currentLevel: number; }
export interface DeleteGradeDialogPayload { configId: number; gradeLevel: number; }
export interface ManageGradePdfDialogPayload { gradeId: number; gradeLevel: number; currentPdfUrl?: string; syllabusName?: string; }

export interface AddSubjectDialogPayload { configId: number; gradeLevel: number; }
export interface EditSubjectDialogPayload { subjectId: number; currentName: string; }
export interface DeleteSubjectDialogPayload { subjectId: number; subjectName: string; }

export interface AddTopicDialogPayload { subjectId: number; }
export interface EditTopicDialogPayload { topicId: number; currentName: string; }
export interface DeleteTopicDialogPayload { topicId: number; topicName: string; }

export interface DeleteQuestionDialogPayload { questionId: number; questionText: string; contextTopicId: number; }
export interface DeleteUserDialogPayload { userId: number; userName: string; }

export type AddAllowedSubjectDialogPayload = Record<string, never>;
export interface EditAllowedSubjectDialogPayload { allowedSubjectId: number; currentName: string; currentNote: string | null; isActive: boolean; }

export type AddAllowedGradeDialogPayload = Record<string, never>;
export interface EditAllowedGradeDialogPayload { allowedGradeId: number; currentName: string; currentNote: string | null; isActive: boolean; }
