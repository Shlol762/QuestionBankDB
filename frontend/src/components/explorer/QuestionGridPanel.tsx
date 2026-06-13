import React, { useState } from 'react';
import { useResolvedCurriculumSelection } from '../../hooks/useResolvedCurriculumSelection';
import { useUIStore } from '../../store/uiStore';
import { useQuestions } from '../../hooks/useQuestions';

export const QuestionGridPanel: React.FC = () => {
  const { topic } = useResolvedCurriculumSelection();
  const { openDrawer } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: questionsData, isLoading } = useQuestions({
    topic_id: topic?.id || undefined,
    search: searchQuery || undefined,
  });

  const handleNewQuestion = () => {
    // If no topic selected, we still open the drawer but pass null, 
    // forcing them to use the accordion to select a topic.
    openDrawer('CREATE_QUESTION', { preselectedTopicId: topic?.id || null });
  };

  // Abstract rendering of the grid
  return (
    <div className="flex-1 glass border border-white/10 rounded-2xl flex flex-col overflow-hidden relative">
      {/* Top Header & Toolbar */}
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between z-10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {topic ? topic.name : 'Question Repository'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {topic ? `Showing questions for this topic` : 'Select a topic to view specific questions'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Localized Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-9 pr-4 py-2 text-sm w-64"
            />
          </div>

          <button 
            onClick={handleNewQuestion}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-neon-blue-600 hover:bg-neon-blue-500 shadow-[0_0_15px_rgba(14,165,233,0.4)] transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Question
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-y-auto bg-surface-900/40 p-6">
        {!topic ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full glass bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <svg className="w-10 h-10 text-neon-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Topic Selected</h3>
            <p className="text-gray-400 max-w-sm">
              Use the curriculum tree on the left to drill down into a specific topic to view and manage its questions.
            </p>
          </div>
        ) : isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
             <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-gray-400 text-sm">Loading questions...</p>
          </div>
        ) : (
          // Data Grid
          <div className="space-y-3">
            {questionsData?.items && questionsData.items.length > 0 ? questionsData.items.map(q => (
              <div key={q.question_id} className="glass bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] hover:border-white/10 transition-all group flex items-start justify-between">
                <div className="flex-1 pr-6">
                  <h4 className="text-sm font-medium text-white mb-2 leading-relaxed">{q.question_text}</h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-neon-fuchsia-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      {q.teacher?.full_name || `Teacher #${q.teacher_id}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-neon-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      {new Date(q.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[120px]">
                  {/* Status Badge */}
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    !q.is_active 
                      ? 'bg-surface-700/50 text-gray-400 border-white/10' 
                      : q.status === 'published' 
                        ? 'bg-neon-emerald-500/10 text-neon-emerald-400 border-neon-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {!q.is_active ? 'Archived' : q.status}
                  </div>
                  
                  {/* Inline Action */}
                  <button 
                    onClick={() => openDrawer('EDIT_QUESTION', { questionId: q.question_id })}
                    className="text-xs font-semibold text-neon-blue-400 hover:text-neon-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit / Expand →
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-sm text-center py-8">No questions found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionGridPanel;
