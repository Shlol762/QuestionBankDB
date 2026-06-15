import React, { useState, useMemo } from 'react';
import { useResolvedCurriculumSelection } from '../../hooks/useResolvedCurriculumSelection';
import { useUIStore } from '../../store/uiStore';
import { useQuestions, useUpdateQuestion } from '../../hooks/useQuestions';
import { toast } from 'react-hot-toast';

const QUESTION_TYPES = [
  "MCQ",
  "True/False",
  "Match the Following",
  "Short Answer",
  "Long Answer",
  "Fill in the Blanks",
  "One Word Answer",
  "Assertion/Reason",
  "Case Study",
  "Ordering/Sequencing",
  "Diagram Labeling",
  "Comprehension Passage"
];

const MARKS_RANGES = [
  { label: '1-5 Marks', min: 1, max: 5 },
  { label: '6-10 Marks', min: 6, max: 10 },
  { label: '11-15 Marks', min: 11, max: 15 },
  { label: '16+ Marks', min: 16, max: Infinity }
];

const getTypeStyle = (type: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'px-2.5 py-1.5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none';
  }
  let activeColor = '';
  switch (type) {
    case 'MCQ': activeColor = 'bg-sky-500/15 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.15)]'; break;
    case 'True/False': activeColor = 'bg-cyan-500/15 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]'; break;
    case 'Match the Following': activeColor = 'bg-teal-500/15 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.15)]'; break;
    case 'Short Answer': activeColor = 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'; break;
    case 'Long Answer': activeColor = 'bg-lime-500/15 text-lime-300 shadow-[0_0_8px_rgba(132,204,22,0.15)]'; break;
    case 'Fill in the Blanks': activeColor = 'bg-yellow-500/15 text-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.15)]'; break;
    case 'One Word Answer': activeColor = 'bg-orange-500/15 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.15)]'; break;
    case 'Assertion/Reason': activeColor = 'bg-amber-500/15 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'; break;
    case 'Case Study': activeColor = 'bg-rose-500/15 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]'; break;
    case 'Ordering/Sequencing': activeColor = 'bg-pink-500/15 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.15)]'; break;
    case 'Diagram Labeling': activeColor = 'bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.15)]'; break;
    case 'Comprehension Passage': activeColor = 'bg-purple-500/15 text-purple-300 shadow-[0_0_8px_rgba(139,92,246,0.15)]'; break;
    default: activeColor = 'bg-neon-blue-500/15 text-neon-blue-300 shadow-[0_0_8px_rgba(14,165,233,0.15)]'; break;
  }
  return `px-2.5 py-1.5 ${activeColor} rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none`;
};

const getDifficultyStyle = (val: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'px-2.5 py-1.5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none';
  }
  let activeColor = '';
  if (val === 'Easy') activeColor = 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
  else if (val === 'Medium') activeColor = 'bg-amber-500/15 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]';
  else activeColor = 'bg-rose-500/15 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
  return `px-2.5 py-1.5 ${activeColor} rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none`;
};

const getMarksRangeStyle = (label: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'px-2.5 py-1.5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none';
  }
  let activeColor = '';
  switch (label) {
    case '1-5 Marks': activeColor = 'bg-sky-500/15 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.15)]'; break;
    case '6-10 Marks': activeColor = 'bg-indigo-500/15 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.15)]'; break;
    case '11-15 Marks': activeColor = 'bg-violet-500/15 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.15)]'; break;
    case '16+ Marks': activeColor = 'bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.15)]'; break;
    default: activeColor = 'bg-neon-blue-500/15 text-neon-blue-300 shadow-[0_0_8px_rgba(14,165,233,0.15)]'; break;
  }
  return `px-2.5 py-1.5 ${activeColor} rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none`;
};

const getStatusStyle = (val: string, isActive: boolean) => {
  if (!isActive) {
    return 'px-3 py-1 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none';
  }
  let activeColor = '';
  if (val === 'Published') activeColor = 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
  else activeColor = 'bg-amber-500/15 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]';
  return `px-3 py-1 ${activeColor} rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer border-0 outline-none`;
};

export const QuestionGridPanel: React.FC = () => {
  const { topic, subject, grade, syllabus, hierarchy } = useResolvedCurriculumSelection();
  const { openDrawer, openDialog } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Multi-select pill states using Set for fast lookups
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [selectedMarksRanges, setSelectedMarksRanges] = useState<Set<string>>(new Set());

  const updateQuestionMutation = useUpdateQuestion();

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleDifficulty = (diff: string) => {
    setSelectedDifficulties(prev => {
      const next = new Set(prev);
      if (next.has(diff)) {
        next.delete(diff);
      } else {
        next.add(diff);
      }
      return next;
    });
  };

  const toggleMarksRange = (rangeLabel: string) => {
    setSelectedMarksRanges(prev => {
      const next = new Set(prev);
      if (next.has(rangeLabel)) {
        next.delete(rangeLabel);
      } else {
        next.add(rangeLabel);
      }
      return next;
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedTypes.size > 0) count += selectedTypes.size;
    if (selectedDifficulties.size > 0) count += selectedDifficulties.size;
    if (selectedMarksRanges.size > 0) count += selectedMarksRanges.size;
    if (showArchived) count++;
    return count;
  }, [selectedTypes, selectedDifficulties, selectedMarksRanges, showArchived]);

  // Fetch up to 100 questions from the backend to filter client-side
  const { data: questionsData, isLoading } = useQuestions({
    topic_id: topic?.id || undefined,
    search: searchQuery || undefined,
    status: showArchived ? 'archived' : undefined,
    limit: 100,
  });

  const filteredQuestions = useMemo(() => {
    if (!questionsData?.items) return [];

    return questionsData.items.filter((q) => {
      // --- Hierarchy selection filtering ---
      // As you traverse down the hierarchy, show only questions belonging to the active selection.
      if (syllabus) {
        const isInSelection = q.topics.some((qTopic: any) => {
          for (const s of hierarchy) {
            if (s.id !== syllabus.id) continue;
            for (const g of s.grades) {
              if (grade && g.id !== grade.id) continue;
              for (const sub of g.subjects) {
                if (subject && sub.id !== subject.id) continue;
                if (topic) {
                  if (qTopic.topic_id === topic.id) return true;
                } else {
                  if (sub.topics.some(t => t.id === qTopic.topic_id)) return true;
                }
              }
            }
          }
          return false;
        });
        if (!isInSelection) return false;
      }

      // --- Custom Multi-select pill filters ---
      // 1. Question Type filter (multi-select)
      if (selectedTypes.size > 0 && !selectedTypes.has(q.q_type)) {
        return false;
      }

      // 2. Difficulty filter (multi-select)
      if (selectedDifficulties.size > 0 && !selectedDifficulties.has(q.difficulty)) {
        return false;
      }

      // 3. Marks Range filter (multi-select)
      if (selectedMarksRanges.size > 0) {
        const matches = Array.from(selectedMarksRanges).some(rangeLabel => {
          const range = MARKS_RANGES.find(r => r.label === rangeLabel);
          if (!range) return false;
          return q.marks >= range.min && q.marks <= range.max;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [questionsData, syllabus, grade, subject, topic, hierarchy, selectedTypes, selectedDifficulties, selectedMarksRanges]);

  const handleToggleArchive = async (q: any) => {
    const newStatus = q.status === 'archived' ? 'published' : 'archived';
    try {
      await updateQuestionMutation.mutateAsync({
        id: q.question_id,
        payload: {
          status: newStatus,
          update_mode: 'everywhere'
        }
      });
      toast.success(q.status === 'archived' ? 'Question published successfully!' : 'Question archived successfully!');
    } catch (error) {
      toast.error('Failed to change question status');
    }
  };

  const handleNewQuestion = () => {
    // If no topic selected, we still open the drawer but pass null, 
    // forcing them to use the accordion to select a topic.
    openDrawer('CREATE_QUESTION', { preselectedTopicId: topic?.id || null });
  };

  // Abstract rendering of the grid
  return (
    <div className="flex-1 glass border border-white/10 rounded-2xl flex flex-col overflow-hidden relative">
      {/* Top Header & Toolbar */}
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex flex-col gap-4 z-20 relative">
        {/* Row 1: Title & Primary Action */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="tracking-wide">
              {topic ? (
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-base font-semibold text-gray-400">
                    Showing questions for the topic:
                  </span>
                  <span className="text-lg font-bold text-white">
                    {topic.name}
                  </span>
                  <span className="text-base font-semibold text-gray-400">
                    in {subject?.name} ({grade?.name} {syllabus?.year})
                  </span>
                </div>
              ) : subject ? (
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-base font-semibold text-gray-400">
                    Showing questions for the subject:
                  </span>
                  <span className="text-lg font-bold text-white">
                    {subject.name}
                  </span>
                  <span className="text-base font-semibold text-gray-400">
                    ({grade?.name} {syllabus?.year})
                  </span>
                </div>
              ) : grade ? (
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-base font-semibold text-gray-400">
                    Showing questions for:
                  </span>
                  <span className="text-lg font-bold text-white">
                    {grade.name}
                  </span>
                  <span className="text-base font-semibold text-gray-400">
                    ({syllabus?.name})
                  </span>
                </div>
              ) : syllabus ? (
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-base font-semibold text-gray-400">
                    Showing questions for syllabus:
                  </span>
                  <span className="text-lg font-bold text-white">
                    {syllabus.name}
                  </span>
                  <span className="text-base font-semibold text-gray-400">
                    ({syllabus.year})
                  </span>
                </div>
              ) : (
                <span className="text-xl font-bold text-white">
                  Question Repository (All Questions)
                </span>
              )}
            </h2>
            {!syllabus && (
              <p className="text-xs text-gray-400 mt-0.5">
                Use the curriculum tree on the left to filter by syllabus, grade, subject, or topic
              </p>
            )}
          </div>

          <button 
            onClick={handleNewQuestion}
            className="px-5 h-9 rounded-xl text-xs font-semibold text-white bg-neon-blue-600 hover:bg-neon-blue-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            New Question
          </button>
        </div>

        {/* Row 2: Search & Filters Toolbar */}
        <div className="flex items-center gap-3">
          {/* Localized Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 glass-input pl-9 pr-4 text-xs outline-none"
            />
          </div>

          {/* Filters Button with Quick Clear */}
          <div className="relative flex items-center">
            <button
              onClick={() => setShowFilterPopover(prev => !prev)}
              className={`px-4 h-9 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeFiltersCount > 0
                  ? 'bg-neon-blue-500/15 border-neon-blue-500/40 text-neon-blue-300 shadow-[0_0_10px_rgba(14,165,233,0.15)] pr-8'
                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-neon-blue-500 text-white text-[9px] font-bold shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTypes(new Set());
                  setSelectedDifficulties(new Set());
                  setSelectedMarksRanges(new Set());
                  setShowArchived(false);
                }}
                className="absolute right-2.5 p-0.5 text-neon-blue-400 hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center rounded-md hover:bg-white/5"
                title="Clear Filters"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Absolute Horizontal Collapsible Filters Popover */}
        {showFilterPopover && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFilterPopover(false)} />
            <div className="absolute left-6 right-6 top-[calc(100%+6px)] bg-[#0c101b]/98 backdrop-blur-lg border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 z-50 space-y-4 animate-fade-in">
              {/* Header: Title and Clear Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Active Filters</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedTypes(new Set());
                      setSelectedDifficulties(new Set());
                      setSelectedMarksRanges(new Set());
                      setShowArchived(false);
                    }}
                    className="text-[10px] font-bold text-neon-blue-400 hover:text-neon-blue-300 transition-colors cursor-pointer border-0 bg-transparent outline-none"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {/* Filter Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Category: Question Type */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Question Type</label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {QUESTION_TYPES.map(type => {
                      const isSelected = selectedTypes.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={getTypeStyle(type, isSelected)}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category: Difficulty */}
                <div className="space-y-2 col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Difficulty</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Easy', 'Medium', 'Hard'].map(val => {
                      const isSelected = selectedDifficulties.has(val);
                      return (
                        <button
                          key={val}
                          onClick={() => toggleDifficulty(val)}
                          className={getDifficultyStyle(val, isSelected)}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category: Marks Ranges */}
                <div className="space-y-2 col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Marks Ranges</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MARKS_RANGES.map(range => {
                      const isSelected = selectedMarksRanges.has(range.label);
                      return (
                        <button
                          key={range.label}
                          onClick={() => toggleMarksRange(range.label)}
                          className={getMarksRangeStyle(range.label, isSelected)}
                        >
                          {range.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status (Archived / Published) row */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowArchived(false)}
                    className={getStatusStyle('Published', !showArchived)}
                  >
                    Published Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchived(true)}
                    className={getStatusStyle('Archived', showArchived)}
                  >
                    Archived Only
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-y-auto bg-surface-900/40 p-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
             <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-gray-400 text-sm">Loading questions...</p>
          </div>
        ) : (
          // Data Grid
          <div 
            className="grid gap-5" 
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {filteredQuestions && filteredQuestions.length > 0 ? filteredQuestions.map(q => (
              <div 
                key={q.question_id} 
                onClick={() => openDialog('PREVIEW_QUESTION', q)}
                className="group relative flex flex-col justify-between h-[210px] p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-neon-blue-500/40 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(14,165,233,0.15)] transition-all duration-300 cursor-pointer"
              >
                {/* Content Area */}
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <h4 className="text-sm font-medium text-white mb-3 leading-relaxed line-clamp-3">
                    {q.question_text}
                  </h4>
                  
                  {/* Metadata */}
                  <div className="flex flex-col gap-1.5 text-[11px] text-gray-400 mt-auto">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-neon-fuchsia-400/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      <span className="truncate">{q.teacher?.full_name || `Teacher #${q.teacher_id}`}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-neon-blue-400/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2" /></svg>
                      <span>{new Date(q.updated_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <div className={`px-2.5 h-7 flex items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 bg-neon-emerald-500/10 text-neon-emerald-400`}>
                      {q.status}
                    </div>

                    {/* Quick Archive/Unarchive Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleArchive(q);
                      }}
                      title={q.status === 'archived' ? 'Restore/Publish Question' : 'Archive Question'}
                      className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                        q.status === 'archived'
                          ? 'border-neon-emerald-500/30 bg-neon-emerald-500/10 text-neon-emerald-400 hover:bg-neon-emerald-500/20'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                      }`}
                    >
                      {q.status === 'archived' ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Edit Action (Pen Icon) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDrawer('EDIT_QUESTION', { questionId: q.question_id });
                    }}
                    title="Edit Question"
                    className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-neon-blue-400 hover:border-neon-blue-500/30 hover:bg-neon-blue-500/10 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                <p className="text-gray-400 text-sm">No questions found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionGridPanel;
