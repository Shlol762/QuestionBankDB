import React from 'react';
import { useUIStore } from '../store/uiStore';
import { Plus, BookOpen, Layers, Edit2, AlertCircle } from 'lucide-react';
import {
  useAllowedSubjects,
  useAllowedGrades,
  useUpdateAllowedSubject,
  useUpdateAllowedGrade,
  type AllowedSubject,
  type AllowedGrade
} from '../hooks/useSystemConfig';

export const SystemConfigManager: React.FC = () => {
  const { openDialog } = useUIStore();

  const { data: subjectsData, isLoading: isLoadingSubjects } = useAllowedSubjects();
  const { data: gradesData, isLoading: isLoadingGrades } = useAllowedGrades();

  const updateSubjectMutation = useUpdateAllowedSubject();
  const updateGradeMutation = useUpdateAllowedGrade();

  const subjects = subjectsData?.items || [];
  const grades = gradesData?.items || [];

  // Inline toggles for soft-delete compatibility
  const toggleSubjectActive = (sub: AllowedSubject) => {
    updateSubjectMutation.mutate({
      id: sub.allowed_subject_id,
      is_active: !sub.is_active,
    });
  };

  const toggleGradeActive = (gr: AllowedGrade) => {
    updateGradeMutation.mutate({
      id: gr.allowed_grade_id,
      is_active: !gr.is_active,
    });
  };

  const handleAddSubject = () => {
    openDialog('ADD_ALLOWED_SUBJECT');
  };

  const handleEditSubject = (sub: AllowedSubject) => {
    openDialog('EDIT_ALLOWED_SUBJECT', {
      allowedSubjectId: sub.allowed_subject_id,
      currentName: sub.subject_name,
      currentNote: sub.recommendation_note,
      isActive: sub.is_active,
    });
  };

  const handleAddGrade = () => {
    openDialog('ADD_ALLOWED_GRADE');
  };

  const handleEditGrade = (gr: AllowedGrade) => {
    openDialog('EDIT_ALLOWED_GRADE', {
      allowedGradeId: gr.allowed_grade_id,
      currentName: gr.grade_name,
      currentNote: gr.recommendation_note,
      isActive: gr.is_active,
    });
  };

  if (isLoadingSubjects || isLoadingGrades) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-4">
        <div className="w-12 h-12 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold animate-pulse">Loading Platform Configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Platform Configuration</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage allowed curriculum attributes and recommendations. Soft-delete configs by toggling active status to preserve historical questions.
        </p>
      </div>

      {/* Main Grid split into Subjects and Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Allowed Subjects Panel */}
        <div className="glass border-white/10 rounded-2xl p-6 bg-surface-900/30 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neon-blue-400" />
              <h2 className="text-lg font-bold text-white">Allowed Subjects</h2>
            </div>
            <button
              onClick={handleAddSubject}
              className="p-1.5 rounded-lg text-neon-blue-400 hover:text-white hover:bg-neon-blue-500/20 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer border border-neon-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[60vh]">
            {subjects.length > 0 ? (
              subjects.map((sub) => (
                <div
                  key={sub.allowed_subject_id}
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2 ${
                    sub.is_active
                      ? 'bg-white/[0.01] border-white/5 hover:border-white/10'
                      : 'bg-white/[0.005] border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{sub.subject_name}</span>
                    
                    {/* Inline Toggle */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleSubjectActive(sub)}
                        disabled={updateSubjectMutation.isPending}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          sub.is_active ? 'bg-neon-emerald-500' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                            sub.is_active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => handleEditSubject(sub)}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Edit Subject Config"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Recommendation Note */}
                  {sub.recommendation_note && (
                    <div className="flex gap-2 p-2.5 rounded bg-black/20 text-xs border border-white/5 text-gray-400 font-sans">
                      <AlertCircle className="w-4 h-4 text-neon-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-neon-blue-400 uppercase tracking-wider block mb-0.5">Recommendation Note</span>
                        {sub.recommendation_note}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-xs text-center py-6">No allowed subjects configured.</p>
            )}
          </div>
        </div>

        {/* Allowed Grades Panel */}
        <div className="glass border-white/10 rounded-2xl p-6 bg-surface-900/30 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-neon-fuchsia-400" />
              <h2 className="text-lg font-bold text-white">Allowed Grades</h2>
            </div>
            <button
              onClick={handleAddGrade}
              className="p-1.5 rounded-lg text-neon-fuchsia-400 hover:text-white hover:bg-neon-fuchsia-500/20 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer border border-neon-fuchsia-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Add Grade
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[60vh]">
            {grades.length > 0 ? (
              grades.map((gr) => (
                <div
                  key={gr.allowed_grade_id}
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2 ${
                    gr.is_active
                      ? 'bg-white/[0.01] border-white/5 hover:border-white/10'
                      : 'bg-white/[0.005] border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{gr.grade_name}</span>
                    
                    {/* Inline Toggle */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleGradeActive(gr)}
                        disabled={updateGradeMutation.isPending}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          gr.is_active ? 'bg-neon-emerald-500' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                            gr.is_active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => handleEditGrade(gr)}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Edit Grade Config"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Recommendation Note */}
                  {gr.recommendation_note && (
                    <div className="flex gap-2 p-2.5 rounded bg-black/20 text-xs border border-white/5 text-gray-400 font-sans">
                      <AlertCircle className="w-4 h-4 text-neon-fuchsia-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-neon-fuchsia-400 uppercase tracking-wider block mb-0.5">Recommendation Note</span>
                        {gr.recommendation_note}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-xs text-center py-6">No allowed grades configured.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemConfigManager;
