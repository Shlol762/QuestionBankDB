import React from 'react';
import { useResolvedCurriculumSelection } from '../../hooks/useResolvedCurriculumSelection';
import { useExplorerUrlState } from '../../hooks/useExplorerUrlState';
import { useUIStore } from '../../store/uiStore';
import { Plus, Edit2, Trash2, Menu, X, Copy, FileText, FileUp, ChevronRight } from 'lucide-react';

export const CurriculumTreePanel: React.FC = () => {
  const { 
    syllabus, grade, subject, topic, 
    selectionLevel, hierarchy, isLoading 
  } = useResolvedCurriculumSelection();
  
  const { 
    selectSyllabus, selectGrade, selectSubject, selectTopic, clearSelection 
  } = useExplorerUrlState();

  const { isExplorerPanelOpen, toggleExplorerPanel, closeExplorerPanel, openDialog } = useUIStore();

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
            {/* Left side: Creation Control (solid color, simple and clean) */}
            <div>
              {selectionLevel === 'none' && (
                <button 
                  onClick={() => openDialog('ADD_SYLLABUS')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  title="Add Syllabus"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Syllabus</span>
                </button>
              )}

              {selectionLevel === 'syllabus' && syllabus && (
                <button 
                  onClick={() => openDialog('ADD_GRADE', { syllabusId: syllabus.id })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  title="Add Grade Level"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Grade</span>
                </button>
              )}

              {selectionLevel === 'grade' && grade && (
                <button 
                  onClick={() => openDialog('ADD_SUBJECT', { configId: grade.id, gradeLevel: grade.level })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  title="Add Subject"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              )}

              {selectionLevel === 'subject' && subject && (
                <button 
                  onClick={() => openDialog('ADD_TOPIC', { subjectId: subject.id })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  title="Add Topic"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Topic</span>
                </button>
              )}
            </div>

            {/* Right side: Management Controls for Current Selection */}
            <div className="flex items-center gap-1.5">
              {selectionLevel === 'syllabus' && syllabus && (
                <>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-0.5">Manage:</span>
                  <button 
                    onClick={() => openDialog('DUPLICATE_SYLLABUS', { syllabusId: syllabus.id, currentName: syllabus.name, currentYear: syllabus.year })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-fuchsia-500/20 text-gray-400 hover:text-neon-fuchsia-400 transition-colors border border-white/10"
                    title="Duplicate Syllabus"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('EDIT_SYLLABUS', { syllabusId: syllabus.id, currentName: syllabus.name, currentYear: syllabus.year })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10"
                    title="Edit Syllabus"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_SYLLABUS', { syllabusId: syllabus.id, syllabusName: syllabus.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10"
                    title="Delete Syllabus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {selectionLevel === 'grade' && grade && (
                <>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-0.5">Manage:</span>
                  <button 
                    onClick={() => openDialog('MANAGE_GRADE_PDF', { gradeId: grade.id, gradeLevel: grade.level, currentPdfUrl: grade.pdfUrl, syllabusName: syllabus?.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10"
                    title="Manage PDF"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('EDIT_GRADE', { configId: grade.id, currentLevel: grade.level })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10"
                    title="Edit Grade Level"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_GRADE', { configId: grade.id, gradeLevel: grade.level })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10"
                    title="Delete Grade Level"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {selectionLevel === 'subject' && subject && (
                <>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-0.5">Manage:</span>
                  <button 
                    onClick={() => openDialog('EDIT_SUBJECT', { subjectId: subject.id, currentName: subject.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_SUBJECT', { subjectId: subject.id, subjectName: subject.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {selectionLevel === 'topic' && topic && (
                <>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-0.5">Manage:</span>
                  <button 
                    onClick={() => openDialog('EDIT_TOPIC', { topicId: topic.id, currentName: topic.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-neon-blue-500/20 text-gray-400 hover:text-neon-blue-400 transition-colors border border-white/10"
                    title="Edit Topic"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openDialog('DELETE_TOPIC', { topicId: topic.id, topicName: topic.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/10"
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
          {/* Level 0: Show all Syllabuses */}
          {selectionLevel === 'none' && hierarchy.map(s => (
            <div key={s.id} className="relative group w-full text-left p-3 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between">
              <button
                onClick={() => handleSelect(() => selectSyllabus(s.id))}
                className="flex-1 text-left"
              >
                <div className="text-sm font-semibold text-white group-hover:text-neon-blue-300">{s.name}</div>
                <div className="text-xs text-gray-500">{s.year} • {s.grades.length} Grades</div>
              </button>

              {/* Admin Actions */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('ADD_GRADE', { syllabusId: s.id }); }}
                  className="p-1.5 text-gray-400 hover:text-neon-emerald-400 transition-colors"
                  title="Add Grade Level"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('DUPLICATE_SYLLABUS', { syllabusId: s.id, currentName: s.name, currentYear: s.year }); }}
                  className="p-1.5 text-gray-400 hover:text-neon-fuchsia-400 transition-colors"
                  title="Duplicate Syllabus"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('EDIT_SYLLABUS', { syllabusId: s.id, currentName: s.name, currentYear: s.year }); }}
                  className="p-1.5 text-gray-400 hover:text-neon-blue-400 transition-colors"
                  title="Edit Syllabus"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('DELETE_SYLLABUS', { syllabusId: s.id, syllabusName: s.name }); }}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete Syllabus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <svg className="w-4 h-4 text-gray-500 group-hover:text-neon-blue-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </div>
          ))}

          {/* Level 1: Show Grades under selected Syllabus */}
          {selectionLevel === 'syllabus' && syllabus && syllabus.grades.map(g => (
            <div 
              key={g.id} 
              className="relative group w-full text-left p-3 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between"
            >
              <button
                onClick={() => handleSelect(() => selectGrade(g.id))}
                className="flex-1 text-left flex items-center gap-2"
              >
                <div className="text-sm font-semibold text-white group-hover:text-neon-blue-300">{g.name}</div>
                {g.pdfUrl && (
                  <a 
                    href={`${import.meta.env.VITE_API_BASE_URL || ''}${g.pdfUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded text-neon-blue-400 hover:text-white hover:bg-neon-blue-500/20 transition-all"
                    title="View PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </a>
                )}
              </button>

              {/* Admin Actions */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('ADD_SUBJECT', { configId: g.id, gradeLevel: g.level }); }}
                  className="p-1.5 text-gray-400 hover:text-neon-emerald-400 transition-colors"
                  title="Add Subject"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('MANAGE_GRADE_PDF', { gradeId: g.id, gradeLevel: g.level, currentPdfUrl: g.pdfUrl, syllabusName: syllabus.name }); }}
                  className="p-1.5 text-gray-400 hover:text-neon-blue-400 transition-colors"
                  title="Manage PDF"
                >
                  <FileUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('EDIT_GRADE', { configId: g.id, currentLevel: g.level }); }}
                  className="p-1.5 text-gray-400 hover:text-neon-blue-400 transition-colors"
                  title="Edit Grade Level"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDialog('DELETE_GRADE', { configId: g.id, gradeLevel: g.level }); }}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete Grade Level"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <svg className="w-4 h-4 text-gray-500 group-hover:text-neon-blue-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </div>
          ))}

          {/* Level 2: Show Subjects under selected Grade */}
          {selectionLevel === 'grade' && grade && (
            <div className="space-y-0.5">
              {grade.subjects.map(sub => (
                <div key={sub.id} className="relative group w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between">
                  <button
                    onClick={() => handleSelect(() => selectSubject(sub.id))}
                    className="flex-1 text-left"
                  >
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">{sub.name}</span>
                  </button>

                  {/* Admin Actions for Subject */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDialog('EDIT_SUBJECT', { subjectId: sub.id, currentName: sub.name }); }}
                      className="p-1 text-gray-400 hover:text-neon-blue-400 transition-colors"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDialog('DELETE_SUBJECT', { subjectId: sub.id, subjectName: sub.name }); }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-neon-blue-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Level 2: Show Topics for selected Subject */}
          {selectionLevel === 'subject' && subject && (
            <div className="space-y-1">
              {subject.topics.map(t => {
                const isSelected = t.id === topic?.id;
                return (
                  <div
                    key={t.id}
                    className={`relative group w-full p-3 rounded-lg transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-neon-blue-500/20 border border-neon-blue-500/40 shadow-[0_0_10px_rgba(14,165,233,0.15)]' 
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => handleSelect(() => selectTopic(t.id))}
                      className="flex-1 flex items-center justify-between pr-2"
                    >
                      <span className={`text-sm font-medium ${isSelected ? 'text-neon-blue-300' : 'text-gray-300'}`}>
                        {t.name}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-neon-blue-500/30 text-neon-blue-200' : 'bg-white/10 text-gray-400'
                      }`}>
                        {t.questionCount}
                      </span>
                    </button>

                    {/* Admin Actions for Topic */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity bg-surface-800/80 rounded-md shadow-md px-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openDialog('EDIT_TOPIC', { topicId: t.id, currentName: t.name }); }}
                        className="p-1 text-gray-400 hover:text-neon-blue-400 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openDialog('DELETE_TOPIC', { topicId: t.id, topicName: t.name }); }}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CurriculumTreePanel;
