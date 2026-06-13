import React, { useEffect, useRef, useState } from 'react';
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
  useDeleteTopic
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

export const Modal: React.FC = () => {
  const { dialogType, dialogPayload, closeDialog } = useUIStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  // --- MUTATION HOOKS ---
  const createSyllabusMutation = useCreateSyllabus();
  const updateSyllabusMutation = useUpdateSyllabus();
  const deleteSyllabusMutation = useDeleteSyllabus();
  const createGradeMutation = useCreateGrade();
  const deleteGradeMutation = useDeleteGrade();
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

    if (dialogPayload) {
      const payload = dialogPayload as any;
      if (payload.currentName !== undefined) setName(payload.currentName);
      if (payload.currentYear !== undefined) setYear(payload.currentYear);
      if (payload.currentLevel !== undefined) setLevel(String(payload.currentLevel));
      if (payload.gradeLevel !== undefined) setLevel(String(payload.gradeLevel));
      if (payload.currentNote !== undefined) setNote(payload.currentNote || '');
      if (payload.isActive !== undefined) setIsActive(payload.isActive);
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

  // Resolve what item name is needed to confirm the deletion
  let targetName = 'DELETE';
  if (isDestructive && dialogPayload) {
    const payload = dialogPayload as any;
    targetName = payload.syllabusName || 
                 payload.subjectName || 
                 payload.topicName || 
                 payload.userName || 
                 (payload.gradeLevel !== undefined ? `Grade ${payload.gradeLevel}` : '') ||
                 (payload.questionText ? payload.questionText.slice(0, 25) : '') ||
                 'DELETE';
    
    // Fallback if targetName is somehow empty
    if (!targetName.trim()) {
      targetName = 'DELETE';
    }
  }

  const isConfirmed = !isDestructive || confirmInput === targetName;

  // Handle confirm click
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    const payload = dialogPayload as any;

    try {
      switch (dialogType) {
        case 'ADD_SYLLABUS':
          await createSyllabusMutation.mutateAsync({ syllabus_name: name, academic_year: year });
          break;
        case 'EDIT_SYLLABUS':
          await updateSyllabusMutation.mutateAsync({ id: payload.syllabusId, payload: { syllabus_name: name, academic_year: year } });
          break;
        case 'DELETE_SYLLABUS':
          await deleteSyllabusMutation.mutateAsync(payload.syllabusId);
          break;
        case 'ADD_GRADE':
          await createGradeMutation.mutateAsync({ syllabus_id: payload.syllabusId, grade_level: parseInt(level, 10) });
          break;
        case 'DELETE_GRADE':
          await deleteGradeMutation.mutateAsync(payload.configId);
          break;
        case 'ADD_SUBJECT':
          if (!allowedSubjectId) return;
          await createSubjectMutation.mutateAsync({ 
            config_id: payload.configId, 
            allowed_subject_id: allowedSubjectId as number, 
            subject_name: name 
          });
          break;
        case 'EDIT_SUBJECT':
          await updateSubjectMutation.mutateAsync({ id: payload.subjectId, payload: { subject_name: name } });
          break;
        case 'DELETE_SUBJECT':
          await deleteSubjectMutation.mutateAsync(payload.subjectId);
          break;
        case 'ADD_TOPIC':
          await createTopicMutation.mutateAsync({ subject_id: payload.subjectId, topic_name: name });
          break;
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

  // Render the fields based on dialog type
  const renderDialogFields = () => {
    switch (dialogType) {
      case 'ADD_SYLLABUS':
      case 'EDIT_SYLLABUS':
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
            {allowedGradesPage?.items.length === 0 ? (
              <div className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                No configured grade levels found. Please add allowed grades under Platform Configuration first.
              </div>
            ) : (
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full glass-input px-4 py-2.5 text-sm"
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
              {allowedSubjectsPage?.items.length === 0 ? (
                <div className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  No configured subjects found. Please add allowed subjects under Platform Configuration first.
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
                  className="w-full glass-input px-4 py-2.5 text-sm"
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
        className={`w-full max-w-md rounded-2xl flex flex-col overflow-hidden animate-fade-in transition-all duration-300 border ${
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
          <div className="p-6 space-y-4">
            {isDestructive ? (
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
            <button 
              type="button"
              onClick={closeDialog}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!isConfirmed}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 ${
                isDestructive 
                  ? 'bg-neon-red-600 hover:bg-neon-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                  : 'bg-neon-blue-600 hover:bg-neon-blue-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'
              }`}
            >
              {isDestructive ? 'Delete Permanently' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
