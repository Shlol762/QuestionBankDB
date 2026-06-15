import React from 'react';
import { useResolvedCurriculumSelection } from '../../hooks/useResolvedCurriculumSelection';
import { useExplorerUrlState } from '../../hooks/useExplorerUrlState';
import { useUIStore } from '../../store/uiStore';
import { useMe } from '../../hooks/useAuth';
import { Plus, Edit2, Trash2, Menu, X, Copy, FileText, FileUp, ChevronRight } from 'lucide-react';

export const CurriculumTreePanel: React.FC = () => {
  const { data: me } = useMe();
  const { 
    syllabus, grade, subject, topic, 
    selectionLevel, hierarchy, isLoading 
  } = useResolvedCurriculumSelection();

  const isAdmin = me?.is_admin === true;
  const canGCManageGrade = (gLevel?: number) => gLevel !== undefined && me?.grade_levels?.includes(gLevel) === true;
  const canHODManageSubject = (allowedSubId?: number) => allowedSubId !== undefined && me?.hod_allowed_subject_ids?.includes(allowedSubId) === true;
  
  const canManageGradePdf = (gLevel?: number, subjects?: any[]) => {
    if (isAdmin) return true;
    if (gLevel === undefined) return false;
    const isGC = canGCManageGrade(gLevel);
    const isHOD = subjects?.some(sub => sub.allowed_subject_id && me?.hod_allowed_subject_ids?.includes(sub.allowed_subject_id));
    return !!(isGC || isHOD);
  };
  
  const { 
    syllabusId, gradeId, subjectId, topicId,
    selectSyllabus, selectGrade, selectSubject, selectTopic, clearSelection 
  } = useExplorerUrlState();

  const { isExplorerPanelOpen, toggleExplorerPanel, closeExplorerPanel, openDialog } = useUIStore();

  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  // Close panel when selecting on mobile
  const handleSelect = (action: () => void) => {
    action();
    if (window.innerWidth < 1024) {
      closeExplorerPanel();
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 glass-heavy rounded-2xl border border-white/10 flex flex-col items-center justify-center p-6 animate-pulse hidden lg:flex">
        <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">Loading Curriculum...</p>
      </div>
    );
  }

  const syllabusStyles = {
    active: "bg-amber-500/20 border border-transparent text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    inactive: "bg-amber-500/[0.02] border border-white/5 hover:bg-amber-500/10 hover:border-amber-500/20 text-gray-300 hover:text-amber-200"
  };

  const gradeStyles = {
    active: "bg-indigo-500/20 border border-transparent text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
    inactive: "bg-indigo-500/[0.02] border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-gray-300 hover:text-indigo-200"
  };

  const subjectStyles = {
    active: "bg-emerald-500/20 border border-transparent text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    inactive: "bg-emerald-500/[0.02] border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-gray-300 hover:text-emerald-200"
  };

  const topicStyles = {
    active: "bg-fuchsia-500/20 border border-transparent text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.15)]",
    inactive: "bg-fuchsia-500/[0.02] border border-white/5 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/20 text-gray-300 hover:text-fuchsia-200"
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleExplorerPanel}
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full glass-heavy bg-surface-800/90 text-white font-semibold shadow-[0_0_20px_rgba(14,165,233,0.3)] border border-neon-blue-500/50 hover:bg-surface-700/90 transition-all"
      >
        {isExplorerPanelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-neon-blue-400" />}
        <span className={isExplorerPanelOpen ? '' : 'text-neon-blue-100'}>
          {isExplorerPanelOpen ? 'Close Panel' : 'Browse Curriculum'}
        </span>
      </button>

      {/* Backdrop for mobile */}
      {isExplorerPanelOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeExplorerPanel}
        />
      )}

      {/* Panel Container */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-80 glass-heavy rounded-r-2xl lg:rounded-2xl border-r lg:border border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        ${isExplorerPanelOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Breadcrumb Header & Controls */}
        <div className="border-b border-white/10 flex flex-col bg-white/[0.01]">
          {/* Row 1: Breadcrumb Path & Active Title */}
          <div className="px-4 py-3 flex flex-col justify-center min-h-[58px]">
            {selectionLevel !== 'none' && (
              <nav className="flex flex-wrap items-center text-[11px] font-bold text-gray-500 gap-1.5 uppercase tracking-wider mb-0.5">
                <button 
                  onClick={() => handleSelect(clearSelection)}
                  className="text-gray-400 hover:text-neon-blue-400 hover:underline cursor-pointer transition-colors"
                >
                  Curriculum
                </button>
                
                {syllabus && selectionLevel !== 'syllabus' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    <button 
                      onClick={() => handleSelect(() => selectSyllabus(syllabus.id))}
                      className="text-gray-400 hover:text-neon-blue-400 hover:underline cursor-pointer transition-colors truncate max-w-[90px]"
                      title={syllabus.name}
                    >
                      {syllabus.name}
                    </button>
                  </>
                )}

                {grade && selectionLevel !== 'syllabus' && selectionLevel !== 'grade' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    <button 
                      onClick={() => handleSelect(() => selectGrade(grade.id))}
                      className="text-gray-400 hover:text-neon-blue-400 hover:underline cursor-pointer transition-colors truncate max-w-[90px]"
                      title={grade.name}
                    >
                      {grade.name}
                    </button>
                  </>
                )}

                {subject && selectionLevel === 'topic' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    <button 
                      onClick={() => handleSelect(() => selectSubject(subject.id))}
                      className="text-gray-400 hover:text-neon-blue-400 hover:underline cursor-pointer transition-colors truncate max-w-[90px]"
                      title={subject.name}
                    >
                      {subject.name}
                    </button>
                  </>
                )}
              </nav>
            )}

            {/* Current Active Level Title */}
            <h2 className="text-base font-bold text-white tracking-wide truncate mt-0.5" title={
              selectionLevel === 'none' ? 'Curriculum' :
              selectionLevel === 'syllabus' ? syllabus?.name :
              selectionLevel === 'grade' ? grade?.name :
              selectionLevel === 'subject' ? subject?.name :
              topic?.name
            }>
              {selectionLevel === 'none' && 'Curriculum'}
              {selectionLevel === 'syllabus' && syllabus?.name}
              {selectionLevel === 'grade' && grade?.name}
              {selectionLevel === 'subject' && subject?.name}
              {selectionLevel === 'topic' && topic?.name}
            </h2>
          </div>

          {/* Divider line for clear separation */}
          <div className="h-px bg-white/10 w-full" />

          {/* Row 2: Controls */}
          <div className="p-3 bg-white/[0.02] flex items-center justify-between w-full min-h-[44px]">
            {/* Left side: Creation Control */}
            <div>
              {selectionLevel === 'none' && isAdmin && (
                <button 
                  onClick={() => openDialog('ADD_SYLLABUS')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  title="Add Syllabus"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Syllabus</span>
                </button>
              )}

              {selectionLevel === 'syllabus' && syllabus && isAdmin && (
                <button 
                  onClick={() => openDialog('ADD_GRADE', { syllabusId: syllabus.id })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  title="Add Grade Level"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Grade</span>
                </button>
              )}

              {selectionLevel === 'grade' && grade && (isAdmin || canGCManageGrade(grade.level)) && (
                <button 
                  onClick={() => openDialog('ADD_SUBJECT', { configId: grade.id, gradeLevel: grade.level })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  title="Add Subject"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              )}

              {selectionLevel === 'subject' && subject && (isAdmin || canGCManageGrade(grade?.level) || canHODManageSubject(subject.allowed_subject_id)) && (
                <button 
                  onClick={() => openDialog('ADD_TOPIC', { subjectId: subject.id })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  title="Add Topic"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Topic</span>
                </button>
              )}
            </div>

            {/* Right side: Management Controls for Current Selection */}
            <div className="flex items-center gap-1.5">
              {selectionLevel === 'syllabus' && syllabus && isAdmin && (
                <>
                  <div className="flex flex-col text-right text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-tight mr-1">
                    <span>Manage</span>
                    <span className="text-gray-300 font-semibold uppercase">Syllabus</span>
                  </div>
                  <button 
                    onClick={() => openDialog('DUPLICATE_SYLLABUS', { syllabusId: syllabus.id, currentName: syllabus.name, currentYear: syllabus.year })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-fuchsia-500/20 text-gray-400 hover:text-neon-fuchsia-400 transition-colors border border-white/10 cursor-pointer"
                    title="Duplicate Syllabus"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('EDIT_SYLLABUS', { syllabusId: syllabus.id, currentName: syllabus.name, currentYear: syllabus.year })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10 cursor-pointer"
                    title="Edit Syllabus"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_SYLLABUS', { syllabusId: syllabus.id, syllabusName: syllabus.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10 cursor-pointer"
                    title="Delete Syllabus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {selectionLevel === 'grade' && grade && canManageGradePdf(grade.level, grade.subjects) && (
                <>
                  <div className="flex flex-col text-right text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-tight mr-1">
                    <span>Manage</span>
                    <span className="text-gray-300 font-semibold uppercase">Grade</span>
                  </div>
                  <button 
                    onClick={() => openDialog('MANAGE_GRADE_PDF', { gradeId: grade.id, gradeLevel: grade.level, currentPdfUrl: grade.pdfUrl, syllabusName: syllabus?.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10 cursor-pointer"
                    title="Manage PDF"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => openDialog('EDIT_GRADE', { configId: grade.id, currentLevel: grade.level })}
                        className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10 cursor-pointer"
                        title="Edit Grade Level"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDialog('DELETE_GRADE', { configId: grade.id, gradeLevel: grade.level })}
                        className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10 cursor-pointer"
                        title="Delete Grade Level"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}

              {selectionLevel === 'subject' && subject && (isAdmin || canGCManageGrade(grade?.level)) && (
                <>
                  <div className="flex flex-col text-right text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-tight mr-1">
                    <span>Manage</span>
                    <span className="text-gray-300 font-semibold uppercase">Subject</span>
                  </div>
                  <button 
                    onClick={() => openDialog('EDIT_SUBJECT', { subjectId: subject.id, currentName: subject.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10 cursor-pointer"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_SUBJECT', { subjectId: subject.id, subjectName: subject.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10 cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {selectionLevel === 'topic' && topic && (isAdmin || canGCManageGrade(grade?.level) || canHODManageSubject(subject?.allowed_subject_id)) && (
                <>
                  <div className="flex flex-col text-right text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-tight mr-1">
                    <span>Manage</span>
                    <span className="text-gray-300 font-semibold uppercase">Topic</span>
                  </div>
                  <button 
                    onClick={() => openDialog('EDIT_TOPIC', { topicId: topic.id, currentName: topic.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10 cursor-pointer"
                    title="Edit Topic"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_TOPIC', { topicId: topic.id, topicName: topic.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10 cursor-pointer"
                    title="Delete Topic"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Drill-down List Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {hierarchy.map(s => {
            const isSyllabusExpanded = expandedNodes.has(`syllabus-${s.id}`);
            const isSyllabusActive = (syllabusId === s.id && gradeId === null && subjectId === null && topicId === null);
            
            return (
              <div key={s.id} className="space-y-1">
                {/* Syllabus Card */}
                <div 
                  onClick={() => handleSelect(() => selectSyllabus(s.id))}
                  onDoubleClick={() => toggleNode(`syllabus-${s.id}`)}
                  className={`group w-full p-2.5 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
                    isSyllabusActive ? syllabusStyles.active : syllabusStyles.inactive
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ChevronRight 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(`syllabus-${s.id}`);
                      }}
                      className={`w-4 h-4 text-gray-500 hover:text-white transition-transform flex-shrink-0 duration-200 cursor-pointer ${isSyllabusExpanded ? 'rotate-90' : ''}`} 
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className={`text-sm font-semibold ${s.name.length > 20 ? 'hover-ticker' : 'truncate'}`}>{s.name}</div>
                      <div className="text-[10px] text-gray-500 font-medium">{s.year} • {s.grades.length} Grades</div>
                    </div>
                  </div>
                  
                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => openDialog('ADD_GRADE', { syllabusId: s.id })}
                        className="p-1.5 text-gray-400 hover:text-neon-emerald-400 transition-colors cursor-pointer"
                        title="Add Grade Level"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDialog('DUPLICATE_SYLLABUS', { syllabusId: s.id, currentName: s.name, currentYear: s.year })}
                        className="p-1.5 text-gray-400 hover:text-neon-fuchsia-400 transition-colors cursor-pointer"
                        title="Duplicate Syllabus"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDialog('EDIT_SYLLABUS', { syllabusId: s.id, currentName: s.name, currentYear: s.year })}
                        className="p-1.5 text-gray-400 hover:text-neon-blue-400 transition-colors cursor-pointer"
                        title="Edit Syllabus"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDialog('DELETE_SYLLABUS', { syllabusId: s.id, syllabusName: s.name })}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Syllabus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Grades (Children of Syllabus) */}
                {isSyllabusExpanded && (
                  <div className="pl-3 border-l border-white/10 ml-4 space-y-1">
                    {s.grades.map(g => {
                      const isGradeExpanded = expandedNodes.has(`grade-${g.id}`);
                      const isGradeActive = (gradeId === g.id && subjectId === null && topicId === null);
                      
                      return (
                        <div key={g.id} className="space-y-1">
                          {/* Grade Card */}
                          <div 
                            onClick={() => handleSelect(() => selectGrade(g.id))}
                            onDoubleClick={() => toggleNode(`grade-${g.id}`)}
                            className={`group w-full p-2.5 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
                              isGradeActive ? gradeStyles.active : gradeStyles.inactive
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <ChevronRight 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNode(`grade-${g.id}`);
                                }}
                                className={`w-3.5 h-3.5 text-gray-500 hover:text-white transition-transform flex-shrink-0 duration-200 cursor-pointer ${isGradeExpanded ? 'rotate-90' : ''}`} 
                              />
                              <div className="text-sm font-semibold truncate">{g.name}</div>
                              {g.pdfUrl && (
                                <a 
                                  href={`${import.meta.env.VITE_API_BASE_URL || ''}${g.pdfUrl}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded text-neon-blue-400 hover:text-white hover:bg-neon-blue-500/20 transition-all flex-shrink-0"
                                  title="View PDF"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                                                       {/* Admin Actions */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              {(isAdmin || canGCManageGrade(g.level)) && (
                                <button 
                                  onClick={() => openDialog('ADD_SUBJECT', { configId: g.id, gradeLevel: g.level })}
                                  className="p-1.5 text-gray-400 hover:text-neon-emerald-400 transition-colors cursor-pointer"
                                  title="Add Subject"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canManageGradePdf(g.level, g.subjects) && (
                                <button 
                                  onClick={() => openDialog('MANAGE_GRADE_PDF', { gradeId: g.id, gradeLevel: g.level, currentPdfUrl: g.pdfUrl, syllabusName: s.name })}
                                  className="p-1.5 text-gray-400 hover:text-neon-blue-400 transition-colors cursor-pointer"
                                  title="Manage PDF"
                                >
                                  <FileUp className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isAdmin && (
                                <>
                                  <button 
                                    onClick={() => openDialog('EDIT_GRADE', { configId: g.id, currentLevel: g.level })}
                                    className="p-1.5 text-gray-400 hover:text-neon-blue-400 transition-colors cursor-pointer"
                                    title="Edit Grade Level"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => openDialog('DELETE_GRADE', { configId: g.id, gradeLevel: g.level })}
                                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete Grade Level"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Subjects (Children of Grade) */}
                          {isGradeExpanded && (
                            <div className="pl-3 border-l border-white/10 ml-4 space-y-1">
                              {g.subjects.map(sub => {
                                const isSubjectExpanded = expandedNodes.has(`subject-${sub.id}`);
                                const isSubjectActive = (subjectId === sub.id && topicId === null);
                                
                                return (
                                  <div key={sub.id} className="space-y-1">
                                    {/* Subject Card */}
                                    <div 
                                      onClick={() => handleSelect(() => selectSubject(sub.id))}
                                      onDoubleClick={() => toggleNode(`subject-${sub.id}`)}
                                      className={`group w-full p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
                                        isSubjectActive ? subjectStyles.active : subjectStyles.inactive
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <ChevronRight 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNode(`subject-${sub.id}`);
                                          }}
                                          className={`w-3.5 h-3.5 text-gray-500 hover:text-white transition-transform flex-shrink-0 duration-200 cursor-pointer ${isSubjectExpanded ? 'rotate-90' : ''}`} 
                                        />
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className={`text-sm font-medium ${sub.name.length > 18 ? 'hover-ticker' : 'truncate'}`}>{sub.name}</div>
                                        </div>
                                      </div>
                                      
                                      {/* Admin Actions */}
                                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        {(isAdmin || canGCManageGrade(g.level) || canHODManageSubject(sub.allowed_subject_id)) && (
                                          <button 
                                            onClick={() => openDialog('ADD_TOPIC', { subjectId: sub.id })}
                                            className="p-1 text-gray-400 hover:text-neon-emerald-400 transition-colors cursor-pointer"
                                            title="Add Topic"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(isAdmin || canGCManageGrade(g.level)) && (
                                          <>
                                            <button 
                                              onClick={() => openDialog('EDIT_SUBJECT', { subjectId: sub.id, currentName: sub.name })}
                                              className="p-1 text-gray-400 hover:text-neon-blue-400 transition-colors cursor-pointer"
                                              title="Edit Subject"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                              onClick={() => openDialog('DELETE_SUBJECT', { subjectId: sub.id, subjectName: sub.name })}
                                              className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                              title="Delete Subject"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Topics (Children of Subject) */}
                                    {isSubjectExpanded && (
                                      <div className="pl-3 border-l border-white/10 ml-4 space-y-1">
                                        {sub.topics.map(t => {
                                          const isTopicActive = (topicId === t.id);
                                          
                                          return (
                                            <div 
                                              key={t.id}
                                              onClick={() => handleSelect(() => selectTopic(t.id))}
                                              onDoubleClick={() => handleSelect(() => selectTopic(t.id))}
                                              className={`group w-full p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
                                                isTopicActive ? topicStyles.active : topicStyles.inactive
                                              }`}
                                            >
                                              <div className="flex-1 flex items-center justify-between pr-2 min-w-0 gap-2">
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                  <span className={`text-xs font-medium ${t.name.length > 16 ? 'hover-ticker' : 'truncate'}`}>{t.name}</span>
                                                </div>
                                                {t.questionCount > 0 && (
                                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                                    isTopicActive ? 'bg-fuchsia-500/30 text-fuchsia-200' : 'bg-white/10 text-gray-400'
                                                  }`}>
                                                    {t.questionCount}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              {/* Admin Actions */}
                                              {(isAdmin || canGCManageGrade(g.level) || canHODManageSubject(sub.allowed_subject_id)) && (
                                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity bg-surface-800/80 rounded-md shadow-md px-1" onClick={(e) => e.stopPropagation()}>
                                                  <button 
                                                    onClick={() => openDialog('EDIT_TOPIC', { topicId: t.id, currentName: t.name })}
                                                    className="p-1 text-gray-400 hover:text-neon-blue-400 transition-colors cursor-pointer"
                                                    title="Edit Topic"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => openDialog('DELETE_TOPIC', { topicId: t.id, topicName: t.name })}
                                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Delete Topic"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default CurriculumTreePanel;
