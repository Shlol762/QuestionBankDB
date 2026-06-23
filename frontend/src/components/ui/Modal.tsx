import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { 
  useCreateSyllabus, 
  useUpdateSyllabus, 
  useDeleteSyllabus,
  useCreateGrade, 
  useDeleteGrade,
  useCreateSubject, 
  useUpdateSubject, 
  useDeleteSubject,
  useCreateTopic, 
  useUpdateTopic, 
  useDeleteTopic,
  useDuplicateSyllabus,
  useUpdateGrade,
  useUploadPdf,
  useCurriculumHierarchy
} from '../../hooks/useCurriculum';
import { 
  useAllowedSubjects,
  useAllowedGrades,
  useCreateAllowedSubject, 
  useUpdateAllowedSubject, 
  useCreateAllowedGrade, 
  useUpdateAllowedGrade
} from '../../hooks/useSystemConfig';
import { useDeleteUser } from '../../hooks/useStaff';
import { useDeleteQuestion } from '../../hooks/useQuestions';
import { useExplorerUrlState } from '../../hooks/useExplorerUrlState';
import { LatexRenderer } from './LatexRenderer';
import { useFormAutoAdvance } from '../../hooks/useFormAutoAdvance';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { DeleteQuestionDialogPayload } from '../../types/ui.types';

export const Modal: React.FC = () => {
  const { dialogType, dialogPayload, closeDialog, openDrawer } = useUIStore();
  const navigate = useNavigate();
  const { selectSyllabus, selectGrade, selectSubject, selectTopic } = useExplorerUrlState();
  const { data: rawHierarchy } = useCurriculumHierarchy();

  const topicPaths = useMemo(() => {
    const paths: Record<number, string> = {};
    if (!rawHierarchy) return paths;
    rawHierarchy.forEach(s => {
      (s.grades || []).forEach(g => {
        (g.subjects || []).forEach(sub => {
          (sub.topics || []).forEach(t => {
            const gradeText = g.grade_name || `Grade ${g.grade_level}`;
            paths[t.topic_id] = `${s.syllabus_name} (${s.academic_year}) ➔ ${gradeText} ➔ ${sub.subject_name} ➔ ${t.topic_name}`;
          });
        });
      });
    });
    return paths;
  }, [rawHierarchy]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFormAutoAdvance(dialogRef, dialogType, dialogType?.startsWith('DELETE_'));

  // --- MUTATION HOOKS ---
  const createSyllabusMutation = useCreateSyllabus();
  const updateSyllabusMutation = useUpdateSyllabus();
  const deleteSyllabusMutation = useDeleteSyllabus();
  const duplicateSyllabusMutation = useDuplicateSyllabus();
  const createGradeMutation = useCreateGrade();
  const updateGradeMutation = useUpdateGrade();
  const deleteGradeMutation = useDeleteGrade();
  const uploadPdfMutation = useUploadPdf();
  const createSubjectMutation = useCreateSubject();
  const updateSubjectMutation = useUpdateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const createTopicMutation = useCreateTopic();
  const updateTopicMutation = useUpdateTopic();
  const deleteTopicMutation = useDeleteTopic();

  const createAllowedSubjectMutation = useCreateAllowedSubject();
  const updateAllowedSubjectMutation = useUpdateAllowedSubject();
  const createAllowedGradeMutation = useCreateAllowedGrade();
  const updateAllowedGradeMutation = useUpdateAllowedGrade();

  const deleteUserMutation = useDeleteUser();
  const deleteQuestionMutation = useDeleteQuestion();

  // --- QUERY HOOKS FOR SELECT DROPDOWNS ---
  const { data: allowedSubjectsPage } = useAllowedSubjects(true);
  const { data: allowedGradesPage } = useAllowedGrades(true);

  // --- LOCAL FORM STATES ---
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [level, setLevel] = useState('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [confirmInput, setConfirmInput] = useState('');
  const [allowedSubjectId, setAllowedSubjectId] = useState<number | ''>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialogType !== null) {
        closeDialog();
      }
    };
    
    if (dialogType) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [dialogType, closeDialog]);

  // Synchronize payload data into local state when opening
  useEffect(() => {
    if (!dialogType) return;
    
    // Reset inputs
    setName('');
    setYear('');
    setLevel('');
    setNote('');
    setIsActive(true);
    setConfirmInput('');
    setAllowedSubjectId('');
    setPdfFile(null);
    setCurrentPdfUrl(null);

    if (dialogPayload) {
      const payload = dialogPayload as any;
      if (payload.currentName !== undefined) {
        if (dialogType === 'DUPLICATE_SYLLABUS') {
          setName(`${payload.currentName} (Copy)`);
        } else {
          setName(payload.currentName);
        }
      }
      if (payload.currentYear !== undefined) setYear(payload.currentYear);
      if (payload.currentLevel !== undefined) setLevel(String(payload.currentLevel));
      if (payload.gradeLevel !== undefined) setLevel(String(payload.gradeLevel));
      if (payload.currentNote !== undefined) setNote(payload.currentNote || '');
      if (payload.isActive !== undefined) setIsActive(payload.isActive);
      if (payload.currentPdfUrl !== undefined) setCurrentPdfUrl(payload.currentPdfUrl);
    }
  }, [dialogType, dialogPayload]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeDialog();
    }
  };

  if (!dialogType) return null;

  const isDestructive = dialogType.startsWith('DELETE_');

  const isPending = 
    createSyllabusMutation.isPending ||
    updateSyllabusMutation.isPending ||
    deleteSyllabusMutation.isPending ||
    duplicateSyllabusMutation.isPending ||
    createGradeMutation.isPending ||
    updateGradeMutation.isPending ||
    deleteGradeMutation.isPending ||
    uploadPdfMutation.isPending ||
    createSubjectMutation.isPending ||
    updateSubjectMutation.isPending ||
    deleteSubjectMutation.isPending ||
    createTopicMutation.isPending ||
    updateTopicMutation.isPending ||
    deleteTopicMutation.isPending ||
    createAllowedSubjectMutation.isPending ||
    updateAllowedSubjectMutation.isPending ||
    createAllowedGradeMutation.isPending ||
    updateAllowedGradeMutation.isPending ||
    deleteUserMutation.isPending ||
    deleteQuestionMutation.isPending;

  // Resolve what item name is needed to confirm the deletion
  let targetName = 'DELETE';
  if (isDestructive && dialogPayload) {
    const payload = dialogPayload as any;
    targetName = payload.syllabusName || 
                 payload.subjectName || 
                 payload.topicName || 
                 payload.userName || 
                 payload.gradeName ||
                 (payload.gradeLevel !== undefined ? `Grade ${payload.gradeLevel}` : '') ||
                 (payload.questionText ? payload.questionText.slice(0, 25) : '') ||
                 'DELETE';
    
    // Fallback if targetName is somehow empty
    if (!targetName.trim()) {
      targetName = 'DELETE';
    }
  }

  const hasNoTemplates = 
    (dialogType === 'ADD_GRADE' && (!allowedGradesPage?.items || allowedGradesPage.items.length === 0)) ||
    (dialogType === 'ADD_SUBJECT' && (!allowedSubjectsPage?.items || allowedSubjectsPage.items.length === 0));

  const isConfirmed = (!isDestructive || confirmInput === targetName) && !hasNoTemplates;

  // Handle confirm click
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    const payload = dialogPayload as any;

    try {
      switch (dialogType) {
        case 'ADD_SYLLABUS': {
          const res = await createSyllabusMutation.mutateAsync({ syllabus_name: name, academic_year: year });
          if (res?.syllabus_id) {
            selectSyllabus(res.syllabus_id);
          }
          break;
        }
        case 'EDIT_SYLLABUS':
          await updateSyllabusMutation.mutateAsync({ id: payload.syllabusId, payload: { syllabus_name: name, academic_year: year } });
          break;
        case 'DELETE_SYLLABUS':
          await deleteSyllabusMutation.mutateAsync(payload.syllabusId);
          break;
        case 'DUPLICATE_SYLLABUS': {
          const res = await duplicateSyllabusMutation.mutateAsync({ 
            id: payload.syllabusId, 
            payload: { new_syllabus_name: name, new_academic_year: year } 
          });
          if (res?.syllabus_id) {
            selectSyllabus(res.syllabus_id);
          }
          break;
        }
        case 'ADD_GRADE': {
          const gradeLevelParsed = parseInt(level, 10);
          if (isNaN(gradeLevelParsed)) {
            toast.error("Please select a valid grade level.");
            return;
          }
          const res = await createGradeMutation.mutateAsync({ syllabus_id: payload.syllabusId, grade_level: gradeLevelParsed });
          if (res?.config_id) {
            selectGrade(res.config_id);
          }
          break;
        }
        case 'MANAGE_GRADE_PDF': {
          let finalPdfUrl = currentPdfUrl;
          if (pdfFile) {
            const uploadRes = await uploadPdfMutation.mutateAsync(pdfFile);
            finalPdfUrl = uploadRes.pdf_url;
          }
          await updateGradeMutation.mutateAsync({
            id: payload.gradeId,
            payload: { pdf_url: finalPdfUrl }
          });
          break;
        }
        case 'DELETE_GRADE':
          await deleteGradeMutation.mutateAsync(payload.configId);
          break;
        case 'ADD_SUBJECT': {
          const allowedSubIdParsed = parseInt(String(allowedSubjectId), 10);
          if (isNaN(allowedSubIdParsed) || !name.trim()) {
            toast.error("Please select a subject template and enter a display name.");
            return;
          }
          const res = await createSubjectMutation.mutateAsync({ 
            config_id: payload.configId, 
            allowed_subject_id: allowedSubIdParsed, 
            subject_name: name 
          });
          if (res?.subject_id) {
            selectSubject(res.subject_id);
          }
          break;
        }
        case 'EDIT_SUBJECT':
          await updateSubjectMutation.mutateAsync({ id: payload.subjectId, payload: { subject_name: name } });
          break;
        case 'DELETE_SUBJECT':
          await deleteSubjectMutation.mutateAsync(payload.subjectId);
          break;
        case 'ADD_TOPIC': {
          const res = await createTopicMutation.mutateAsync({ subject_id: payload.subjectId, topic_name: name });
          if (res?.topic_id) {
            selectTopic(res.topic_id);
          }
          break;
        }
        case 'EDIT_TOPIC':
          await updateTopicMutation.mutateAsync({ id: payload.topicId, payload: { topic_name: name } });
          break;
        case 'DELETE_TOPIC':
          await deleteTopicMutation.mutateAsync(payload.topicId);
          break;
        case 'ADD_ALLOWED_SUBJECT':
          await createAllowedSubjectMutation.mutateAsync({ subject_name: name, recommendation_note: note, is_active: isActive });
          break;
        case 'EDIT_ALLOWED_SUBJECT':
          await updateAllowedSubjectMutation.mutateAsync({ id: payload.allowedSubjectId, subject_name: name, recommendation_note: note, is_active: isActive });
          break;
        case 'ADD_ALLOWED_GRADE':
          await createAllowedGradeMutation.mutateAsync({ grade_name: name, recommendation_note: note, is_active: isActive });
          break;
        case 'EDIT_ALLOWED_GRADE':
          await updateAllowedGradeMutation.mutateAsync({ id: payload.allowedGradeId, grade_name: name, recommendation_note: note, is_active: isActive });
          break;
        case 'DELETE_USER':
          await deleteUserMutation.mutateAsync(payload.userId);
          break;
        default:
          console.warn('Unknown dialog type:', dialogType);
      }
      closeDialog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlinkQuestion = async () => {
    if (!isConfirmed) return;
    const payload = dialogPayload as DeleteQuestionDialogPayload;
    try {
      await deleteQuestionMutation.mutateAsync({
        id: payload.questionId,
        deleteMode: 'unlink',
        topicId: payload.contextTopicId
      });
      closeDialog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDestroyQuestion = async () => {
    if (!isConfirmed) return;
    const payload = dialogPayload as DeleteQuestionDialogPayload;
    try {
      await deleteQuestionMutation.mutateAsync({
        id: payload.questionId,
        deleteMode: 'delete'
      });
      closeDialog();
    } catch (err) {
      console.error(err);
    }
  };

  // Render the fields based on dialog type
  const renderDialogFields = () => {
    switch (dialogType) {
      case 'ADD_SYLLABUS':
      case 'EDIT_SYLLABUS':
      case 'DUPLICATE_SYLLABUS':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Syllabus Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cambridge IGCSE 2026"
                className="w-full glass-input px-4 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Academic Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2026"
                className="w-full glass-input px-4 py-2.5 text-sm"
                required
              />
            </div>
          </div>
        );

      case 'ADD_GRADE':
        return (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Grade Level</label>
            {!allowedGradesPage?.items || allowedGradesPage.items.length === 0 ? (
              <div className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <p>No configured grade levels found. Please add allowed grades under Platform Configuration first.</p>
                <button
                  type="button"
                  onClick={() => {
                    closeDialog();
                    navigate('/dashboard/platform');
                  }}
                  className="text-xs font-semibold text-neon-blue-400 hover:text-neon-blue-300 hover:underline transition-colors cursor-pointer block"
                >
                  Go to Platform Configuration ➔
                </button>
              </div>
            ) : (
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full glass-input glass-select px-4 py-2.5 text-sm"
                required
              >
                <option value="" className="bg-surface-800 text-gray-400">Select a Grade Level...</option>
                {allowedGradesPage?.items.map(grade => (
                  <option key={grade.allowed_grade_id} value={grade.allowed_grade_id} className="bg-surface-800 text-white">
                    {grade.grade_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        );

      case 'EDIT_GRADE':
        return (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Grade Level (ID)</label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. 9"
              className="w-full glass-input px-4 py-2.5 text-sm"
              required
              disabled
            />
          </div>
        );

      case 'ADD_SUBJECT':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Subject Template</label>
              {!allowedSubjectsPage?.items || allowedSubjectsPage.items.length === 0 ? (
                <div className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <p>No configured subjects found. Please add allowed subjects under Platform Configuration first.</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeDialog();
                      navigate('/dashboard/platform');
                    }}
                    className="text-xs font-semibold text-neon-blue-400 hover:text-neon-blue-300 hover:underline transition-colors cursor-pointer block"
                  >
                    Go to Platform Configuration ➔
                  </button>
                </div>
              ) : (
                <select
                  value={allowedSubjectId}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    setAllowedSubjectId(id);
                    const sub = allowedSubjectsPage?.items.find(s => s.allowed_subject_id === id);
                    if (sub) setName(sub.subject_name);
                  }}
                  className="w-full glass-input glass-select px-4 py-2.5 text-sm"
                  required
                >
                  <option value="" className="bg-surface-800 text-gray-400">Select a Subject...</option>
                  {allowedSubjectsPage?.items.map(sub => (
                    <option key={sub.allowed_subject_id} value={sub.allowed_subject_id} className="bg-surface-800 text-white">
                      {sub.subject_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {allowedSubjectId && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Subject Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full glass-input px-4 py-2.5 text-sm"
                  required
                />
              </div>
            )}
          </div>
        );

      case 'EDIT_SUBJECT':
        return (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Subject Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Additional Mathematics"
              className="w-full glass-input px-4 py-2.5 text-sm"
              required
            />
          </div>
        );

      case 'ADD_TOPIC':
      case 'EDIT_TOPIC':
        return (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Topic Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trigonometric Identities"
              className="w-full glass-input px-4 py-2.5 text-sm"
              required
            />
          </div>
        );

      case 'ADD_ALLOWED_SUBJECT':
      case 'EDIT_ALLOWED_SUBJECT':
      case 'ADD_ALLOWED_GRADE':
      case 'EDIT_ALLOWED_GRADE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grade 12 or Biology"
                className="w-full glass-input px-4 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Recommendation Notes</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Guidelines, recommended resources, or curriculum remarks..."
                className="w-full glass-input px-4 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-sm font-medium text-gray-300">Active Status</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-neon-emerald-500' : 'bg-white/10'
                }`}
                role="switch"
                aria-checked={isActive}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        );

      case 'MANAGE_GRADE_PDF':
        return (
          <div className="space-y-4">
            <div className="text-xs text-gray-400">
              Syllabus: <span className="font-semibold text-white">{(dialogPayload as any)?.syllabusName || 'N/A'}</span>
            </div>
            <div className="text-xs text-gray-400">
              Grade Level: <span className="font-semibold text-white">Grade {(dialogPayload as any)?.gradeLevel || 'N/A'}</span>
            </div>

            {/* Current PDF display */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Current PDF Status</span>
              {currentPdfUrl ? (
                <div className="flex items-center justify-between">
                  <a 
                    href={`${import.meta.env.VITE_API_BASE_URL || ''}${currentPdfUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-neon-blue-400 hover:underline flex items-center gap-1.5 truncate max-w-[200px]"
                  >
                    <svg className="w-4 h-4 shrink-0 text-neon-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    View Current PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => { setCurrentPdfUrl(null); setPdfFile(null); }}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline font-medium"
                  >
                    Remove PDF
                  </button>
                </div>
              ) : pdfFile ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neon-emerald-400 truncate max-w-[200px] font-medium">
                    Selected: {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="text-xs text-gray-400 hover:text-white hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                  <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  No PDF uploaded
                </div>
              )}
            </div>

            {/* File Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Upload/Replace PDF</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPdfFile(file);
                    setCurrentPdfUrl(null);
                  }
                }}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 cursor-pointer"
              />
              <span className="block text-[10px] text-gray-500 mt-1.5">Only PDF documents up to 50MB are allowed</span>
            </div>
          </div>
        );

      case 'PREVIEW_QUESTION': {
        const question = dialogPayload as any;
        if (!question) return <p className="text-gray-400 text-sm">No question loaded.</p>;

        const difficultyColor = {
          easy: 'bg-emerald-500/10 text-emerald-400',
          medium: 'bg-amber-500/10 text-amber-400',
          hard: 'bg-red-500/10 text-red-400'
        }[((question.difficulty || 'medium') as string).toLowerCase()] || 'bg-white/10 text-gray-300';

        return (
          <div className="space-y-3">
            {/* 1. Question Prompt with header and top badges sharing the line */}
            <div className="space-y-2 !mt-1">
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Question</span>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-xs font-semibold bg-white/5 text-gray-300 tracking-wide">
                    {question.q_type}
                  </span>
                  <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                    question.status === 'archived'
                      ? 'bg-surface-700/50 text-gray-400' 
                      : 'bg-neon-emerald-500/10 text-neon-emerald-400'
                  }`}>
                    {question.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-white leading-relaxed select-text font-semibold whitespace-pre-wrap">
                <LatexRenderer text={question.question_text} />
              </p>
            </div>

            {/* Supporting Image rendering */}
            {question.image_url && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 p-2 flex items-center justify-center !mt-3">
                <img
                  src={question.image_url.startsWith('/static/') ? `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')}${question.image_url}` : question.image_url}
                  alt="Question illustration"
                  className="max-h-48 rounded-lg object-contain w-full"
                />
              </div>
            )}

            {/* Divider Line 1 */}
            <div className="border-t border-white/5 !mt-3" />

            {/* 2. MCQ Options or Correct Answer directly below the question */}
            {question.q_type === 'MCQ' && question.options ? (
              <div className="space-y-2 !mt-3">
                <span className="block text-[8px] font-bold uppercase tracking-widest text-gray-500">Options</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(question.options).map(([key, value]) => {
                    const isCorrect = question.answer_text === key;
                    return (
                      <div 
                        key={key} 
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                          isCorrect 
                            ? 'bg-neon-emerald-500/10 border-neon-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.08)]' 
                            : 'bg-white/[0.01] border-white/5'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrect ? 'bg-neon-emerald-500 text-white' : 'bg-white/5 text-gray-400'
                        }`}>
                          {key}
                        </span>
                        <span className={`text-sm leading-normal ${isCorrect ? 'text-neon-emerald-400 font-semibold' : 'text-gray-300'}`}>
                          <LatexRenderer text={value as string} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : question.q_type === 'Match the Following' && question.options && Array.isArray(question.options.pairs) ? (
              <div className="space-y-2 !mt-3">
                <span className="block text-[8px] font-bold uppercase tracking-widest text-gray-500">Matching Pairs</span>
                <div className="grid grid-cols-1 gap-2 max-w-lg">
                  {(question.options.pairs as { left: string; right: string }[]).map((pair, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 text-xs text-gray-300">
                      <div className="font-semibold text-white max-w-[45%] overflow-x-auto"><LatexRenderer text={pair.left} /></div>
                      <div className="text-neon-blue-400 font-bold shrink-0">➔</div>
                      <div className="text-gray-300 max-w-[45%] overflow-x-auto"><LatexRenderer text={pair.right} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              question.answer_text && (
                <div className="rounded-xl bg-neon-emerald-500/10 border border-neon-emerald-500/30 p-4 !mt-3">
                  <span className="block text-[8px] font-bold uppercase tracking-widest text-neon-emerald-400 mb-1">Correct Answer</span>
                  <p className="text-sm text-white font-medium leading-relaxed select-text font-semibold">
                    <LatexRenderer text={question.answer_text} />
                  </p>
                </div>
              )
            )}

            {/* Divider Line 2 */}
            <div className="border-t border-white/5 !mt-3" />

            {/* 3. Metadata/Associated Topics and Academic tags below the question sharing a line */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-1 !mt-3 w-full">
              {/* Academic Tags (Difficulty & Marks) */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <span className={`px-3 py-1 rounded-md text-xs font-semibold capitalize tracking-wide ${difficultyColor}`}>
                  {question.difficulty}
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-semibold bg-neon-blue-500/10 text-neon-blue-400 tracking-wide">
                  {question.marks} Marks
                </span>
              </div>

              {/* Divider bar centered */}
              {question.topics && question.topics.length > 0 && (
                <div className="h-4 w-px bg-white/20 shrink-0 self-center" />
              )}

              {/* Associated Topics & Academic Labels (No headers, side-by-side, right-aligned) */}
              {question.topics && question.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end items-center text-right">
                  {question.topics.map((t: any) => (
                    <span 
                      key={t.topic_id} 
                      title={topicPaths[t.topic_id] || `${t.topic_name}`}
                      className="px-3 py-1 rounded-md bg-white/5 text-xs text-gray-300 font-medium hover:bg-white/10 transition-all cursor-help"
                    >
                      {t.topic_name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider Line 3 */}
            <div className="border-t border-white/5 !mt-3" />

            {/* Audit Info Footer */}
            <div className="flex justify-between items-center text-xs text-gray-500 pt-1 !mt-3">
              <span>Authored by: <span className="text-gray-300 font-medium">{question.teacher?.full_name || `Teacher #${question.teacher_id}`}</span></span>
              <span>Created: <span className="text-gray-300 font-medium">{new Date(question.created_at).toLocaleDateString('en-IN')}</span></span>
              <span>Last Updated: <span className="text-gray-300 font-medium">{new Date(question.updated_at).toLocaleDateString('en-IN')}</span></span>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Dialog Title Naming Formatter
  const getDialogTitle = () => {
    return dialogType
      .replace(/ADD_ALLOWED_/, 'ADD ')
      .replace(/EDIT_ALLOWED_/, 'EDIT ')
      .replace(/_/g, ' ');
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={dialogRef}
        className={`w-full ${dialogType === 'PREVIEW_QUESTION' ? 'max-w-xl' : 'max-w-md'} rounded-2xl flex flex-col overflow-hidden animate-fade-in transition-all duration-300 border ${
          isDestructive
            ? 'glass-danger neon-glow-red'
            : 'glass bg-surface-800/95 shadow-2xl border-white/10'
        }`}
      >
        <form onSubmit={handleConfirm}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 pb-4 border-b ${
            isDestructive ? 'border-red-500/10 bg-red-500/[0.02]' : 'border-white/5 bg-white/[0.01]'
          }`}>
            <div className="flex items-center gap-2.5">
              {isDestructive && (
                <svg className="w-5 h-5 text-red-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <h3 className={`text-lg font-bold tracking-wide capitalize ${isDestructive ? 'text-red-400' : 'text-white'}`}>
                {getDialogTitle()}
              </h3>
            </div>
            
            <button 
              type="button"
              onClick={closeDialog}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-blue-500/50"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className={`p-6 ${dialogType === 'PREVIEW_QUESTION' ? 'pt-3' : 'space-y-4'}`}>
            {dialogType === 'DELETE_QUESTION' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                  Are you sure you want to remove this question? You can choose to unlink it from this topic, or delete it permanently from all associated topics.
                </p>
                
                <div className="rounded-xl bg-red-500/5 p-4 border border-red-500/10 space-y-3">
                  <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider">
                    To confirm, type the exact name below:
                  </label>
                  <div className="text-xs text-gray-400 select-all font-mono py-1.5 px-3 bg-black/30 rounded border border-white/5 font-semibold text-center text-red-300">
                    {targetName}
                  </div>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type the confirmation name..."
                    className="w-full glass-input px-3 py-2 text-sm border-red-500/20 focus:border-red-500 focus:ring-red-500/20"
                    required
                  />
                </div>
              </div>
            ) : isDestructive ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                  Are you absolutely sure you want to delete <span className="font-semibold text-white">{targetName}</span>? 
                  This action is permanent and cannot be undone.
                </p>
                
                <div className="rounded-xl bg-red-500/5 p-4 border border-red-500/10 space-y-3">
                  <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider">
                    To confirm deletion, type the exact name below:
                  </label>
                  <div className="text-xs text-gray-400 select-all font-mono py-1.5 px-3 bg-black/30 rounded border border-white/5 font-semibold text-center text-red-300">
                    {targetName}
                  </div>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type the confirmation name..."
                    className="w-full glass-input px-3 py-2 text-sm border-red-500/20 focus:border-red-500 focus:ring-red-500/20"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {renderDialogFields()}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-end gap-3 p-6 pt-4 border-t ${
            isDestructive ? 'border-red-500/10 bg-red-500/[0.01]' : 'border-white/5 bg-white/[0.01]'
          }`}>
            {dialogType !== 'PREVIEW_QUESTION' && (
              <button 
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            {dialogType === 'PREVIEW_QUESTION' ? (
              <div className="flex w-full justify-end items-center">
                <button
                  type="button"
                  onClick={() => {
                    closeDialog();
                    openDrawer('EDIT_QUESTION', { questionId: (dialogPayload as any).question_id });
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-neon-blue-400 hover:text-neon-blue-300 hover:bg-neon-blue-500/10 border border-neon-blue-500/20 transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  Edit Question
                </button>
              </div>
            ) : dialogType === 'DELETE_QUESTION' ? (
              <>
                <button
                  type="button"
                  onClick={handleUnlinkQuestion}
                  disabled={!isConfirmed || isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all duration-200"
                >
                  Unlink Topic
                </button>
                <button
                  type="button"
                  onClick={handleDestroyQuestion}
                  disabled={!isConfirmed || isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-neon-red-600 hover:bg-neon-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-200"
                >
                  Delete Everywhere
                </button>
              </>
            ) : (
              <button 
                type="submit"
                disabled={!isConfirmed || isPending}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 ${
                  isDestructive 
                    ? 'bg-neon-red-600 hover:bg-neon-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : 'bg-neon-blue-600 hover:bg-neon-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                }`}
              >
                {isPending ? 'Processing...' : (isDestructive ? 'Delete Permanently' : 'Confirm')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
