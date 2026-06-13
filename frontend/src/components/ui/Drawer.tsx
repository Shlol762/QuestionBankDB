import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Accordion } from './Accordion';
import { StepWizard } from './StepWizard';
import { useCreateQuestion, useQuestionDetails, useUpdateQuestion } from '../../hooks/useQuestions';
import { useFormAutoAdvance } from '../../hooks/useFormAutoAdvance';
import { useRegisterStaff } from '../../hooks/useStaff';
import { useCurriculumHierarchy } from '../../hooks/useCurriculum';
import { useResolvedCurriculumSelection } from '../../hooks/useResolvedCurriculumSelection';
import { toast } from 'react-hot-toast';

export const Drawer: React.FC = () => {
  const { drawerType, drawerPayload, closeDrawer, openDialog } = useUIStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  const createQuestionMutation = useCreateQuestion();
  const registerStaffMutation = useRegisterStaff();
  const { data: rawHierarchy } = useCurriculumHierarchy();

  // Traverse hierarchy to dynamically build topics list
  const allTopics = useMemo(() => {
    if (!rawHierarchy) return [];
    const list: { id: number; name: string; info: string }[] = [];
    rawHierarchy.forEach(s => {
      (s.grades || []).forEach(g => {
        (g.subjects || []).forEach(sub => {
          (sub.topics || []).forEach(t => {
            list.push({
              id: t.topic_id,
              name: t.topic_name,
              info: `Grade ${g.grade_level} • ${sub.subject_name}`
            });
          });
        });
      });
    });
    return list;
  }, [rawHierarchy]);

  // Traverse hierarchy to dynamically build subjects list
  const allSubjects = useMemo(() => {
    if (!rawHierarchy) return [];
    const list: { id: number; name: string }[] = [];
    rawHierarchy.forEach(s => {
      (s.grades || []).forEach(g => {
        (g.subjects || []).forEach(sub => {
          list.push({
            id: sub.subject_id,
            name: `${sub.subject_name} (Grade ${g.grade_level} • ${s.syllabus_name})`
          });
        });
      });
    });
    return list;
  }, [rawHierarchy]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerType !== null) {
        closeDrawer();
      }
    };
    
    if (drawerType) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [drawerType, closeDrawer]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeDrawer();
    }
  };

  const { topic: currentContextTopic } = useResolvedCurriculumSelection();

  // --- LOCAL STATE FOR QUESTION FORM ---
  const [questionAccordionId, setQuestionAccordionId] = useState('classification');
  const [questionDifficulty, setQuestionDifficulty] = useState('medium');
  const [selectedQuestionTopics, setSelectedQuestionTopics] = useState<number[]>([]);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [questionMarks, setQuestionMarks] = useState('5');
  const [questionText, setQuestionText] = useState('');
  const [mcqOptions, setMcqOptions] = useState([
    { id: 'A', text: '', isCorrect: true },
    { id: 'B', text: '', isCorrect: false },
    { id: 'C', text: '', isCorrect: false },
    { id: 'D', text: '', isCorrect: false }
  ]);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const filteredTopics = useMemo(() => {
    if (!topicSearchQuery.trim()) return [];
    const query = topicSearchQuery.toLowerCase();
    return allTopics.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.info.toLowerCase().includes(query)
    ).filter(t => !selectedQuestionTopics.includes(t.id));
  }, [allTopics, topicSearchQuery, selectedQuestionTopics]);

  const questionId = drawerType === 'EDIT_QUESTION' ? (drawerPayload as { questionId?: number })?.questionId : null;
  const { data: questionDetails, isLoading: isQuestionLoading } = useQuestionDetails(questionId);
  const updateQuestionMutation = useUpdateQuestion();

  // Reset form state and set preselected topic when drawer is opened
  useEffect(() => {
    if (drawerType === 'CREATE_QUESTION') {
      const payload = drawerPayload as { preselectedTopicId?: number | null } | undefined;
      const preselectedId = payload?.preselectedTopicId;
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setSelectedQuestionTopics(preselectedId ? [preselectedId] : []);
      setQuestionDifficulty('medium');
      setQuestionMarks('5');
      setQuestionText('');
      setMcqOptions([
        { id: 'A', text: '', isCorrect: true },
        { id: 'B', text: '', isCorrect: false },
        { id: 'C', text: '', isCorrect: false },
        { id: 'D', text: '', isCorrect: false }
      ]);
      setQuestionAccordionId('classification');
      setTopicSearchQuery('');
    }
  }, [drawerType, drawerPayload]);

  // Load existing question details when editing
  useEffect(() => {
    if (drawerType === 'EDIT_QUESTION' && questionDetails) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setQuestionDifficulty(questionDetails.difficulty.toLowerCase());
      setQuestionMarks(String(questionDetails.marks));
      setQuestionText(questionDetails.question_text);
      
      const selectedIds = questionDetails.topics.map(t => t.topic_id);
      setSelectedQuestionTopics(selectedIds);
      
      if (questionDetails.options) {
        const opts = Object.entries(questionDetails.options).map(([key, value]) => ({
          id: key,
          text: value as string,
          isCorrect: questionDetails.answer_text === key
        }));
        opts.sort((a, b) => a.id.localeCompare(b.id));
        setMcqOptions(opts);
      }
      
      setQuestionAccordionId('classification');
      setTopicSearchQuery('');
    }
  }, [drawerType, questionDetails]);

  const handleOptionTextChange = (id: string, text: string) => {
    setMcqOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleCorrectOptionChange = (id: string) => {
    setMcqOptions(prev => prev.map(opt => ({ ...opt, isCorrect: opt.id === id })));
  };

  const handleSaveQuestionConfirm = async (updateMode: "everywhere" | "copy") => {
    if (!questionId) return;

    const correctOption = mcqOptions.find(o => o.isCorrect);
    const optionsDict = mcqOptions.reduce((acc, opt) => {
      acc[opt.id] = opt.text;
      return acc;
    }, {} as Record<string, string>);

    await updateQuestionMutation.mutateAsync({
      id: questionId,
      payload: {
        update_mode: updateMode,
        context_topic_id: updateMode === 'copy' ? currentContextTopic?.id || undefined : undefined,
        topic_ids: selectedQuestionTopics,
        question_text: questionText,
        answer_text: correctOption ? correctOption.id : 'A',
        options: optionsDict,
        marks: parseInt(questionMarks, 10),
        difficulty: questionDifficulty.toUpperCase(),
        q_type: 'MCQ',
        status: questionDetails?.status || 'DRAFT'
      }
    });

    setShowUpdateConfirm(false);
    closeDrawer();
  };

  const handleDeleteQuestionClick = () => {
    if (!questionId) return;
    openDialog('DELETE_QUESTION', {
      questionId,
      questionText: questionText,
      contextTopicId: currentContextTopic?.id || 0
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionTopics.length === 0) {
      toast.error('Please select at least one topic');
      return;
    }

    if (isEditing) {
      if (selectedQuestionTopics.length > 1) {
        setShowUpdateConfirm(true);
      } else {
        await handleSaveQuestionConfirm('everywhere');
      }
    } else {
      const correctOption = mcqOptions.find(o => o.isCorrect);
      const optionsDict = mcqOptions.reduce((acc, opt) => {
        acc[opt.id] = opt.text;
        return acc;
      }, {} as Record<string, string>);

      await createQuestionMutation.mutateAsync({
        topic_ids: selectedQuestionTopics,
        question_text: questionText,
        answer_text: correctOption ? correctOption.id : 'A',
        options: optionsDict,
        marks: parseInt(questionMarks, 10),
        difficulty: questionDifficulty.toUpperCase(),
        q_type: 'MCQ',
        status: 'DRAFT'
      });
      
      closeDrawer();
    }
  };

  // --- LOCAL STATE FOR STAFF WIZARD ---
  const [staffCurrentStep, setStaffCurrentStep] = useState(0);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('faculty');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  useFormAutoAdvance(drawerRef, `${drawerType}-${staffCurrentStep}`);

  const toggleSubject = (subjId: number) => {
    setSelectedSubjects(prev =>
      prev.includes(subjId) ? prev.filter(s => s !== subjId) : [...prev, subjId]
    );
  };

  const handleStaffComplete = async () => {
    await registerStaffMutation.mutateAsync({
      full_name: staffName,
      email: staffEmail,
      password: staffPassword,
      department: 'Academic Faculty',
      is_admin: staffRole === 'admin',
      subject_ids: staffRole === 'faculty' ? selectedSubjects : [],
      hod_allowed_subject_ids: staffRole === 'hod' ? selectedSubjects : [],
      grade_levels: staffRole === 'coordinator' ? [] : []
    });
    closeDrawer();
  };

  if (!drawerType) return null;

  const isEditing = drawerType.startsWith('EDIT_');
  const isQuestionDrawer = drawerType.includes('QUESTION');
  const isStaffDrawer = drawerType.includes('STAFF');

  // Question Form Content Accordion Items
  const questionAccordionItems = [
    {
      id: 'classification',
      title: '1. Classification & Difficulty',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
          <line x1="4" y1="22" x2="4" y2="15"></line>
        </svg>
      ),
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Associated Topics</label>
            
            {/* Tag Pills list */}
            {selectedQuestionTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedQuestionTopics.map(id => {
                  const topicObj = allTopics.find(t => t.id === id);
                  if (!topicObj) return null;
                  return (
                    <span 
                      key={id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-200"
                    >
                      {topicObj.name}
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionTopics(prev => prev.filter(tId => tId !== id))}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
                        aria-label="Remove topic"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search Input for adding topics */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                type="text"
                value={topicSearchQuery}
                onChange={(e) => setTopicSearchQuery(e.target.value)}
                placeholder="Search and associate topics..."
                className="w-full glass-input pl-9 pr-4 py-2.5 text-sm"
              />
              
              {/* Filtered Topics Dropdown */}
              {topicSearchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto glass-heavy bg-surface-800 border border-white/10 rounded-xl shadow-2xl z-50 divide-y divide-white/5">
                  {filteredTopics.length > 0 ? (
                    filteredTopics.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuestionTopics(prev => [...prev, t.id]);
                          setTopicSearchQuery('');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">{t.info}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-500 text-center">No matching topics found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Marks / Weightage</label>
              <input
                type="number"
                min="1"
                max="100"
                value={questionMarks}
                onChange={(e) => setQuestionMarks(e.target.value)}
                className="w-full glass-input px-4 py-2 text-sm"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((level) => {
                  const isActive = questionDifficulty === level;
                  const activeColors: Record<string, string> = {
                    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
                    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
                    hard: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                  };
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setQuestionDifficulty(level)}
                      className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all duration-200 ${
                        isActive
                          ? activeColors[level]
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'content',
      title: '2. Core Content & Media',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Question Text</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full glass-input px-4 py-3 text-sm min-h-[120px]"
              placeholder="Type your question prompt here. LaTeX math notation is supported (e.g. $$x^2 + y^2 = r^2$$)..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Supporting Images / Reference (Optional)</label>
            <div className="border border-dashed border-white/10 hover:border-neon-blue-500/50 transition-colors duration-300 rounded-xl p-6 flex flex-col items-center justify-center bg-white/[0.01] cursor-pointer">
              <svg className="w-8 h-8 text-gray-400 mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-300 font-medium">Click to upload or drag & drop</span>
              <span className="text-[10px] text-gray-500 mt-1">PNG, JPG or PDF up to 5MB</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'answers',
      title: '3. Answers & Option Editor',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      ),
      content: (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Multiple Choice Options</label>
            <span className="text-[10px] text-neon-blue-400 uppercase tracking-widest font-bold">Select one correct option</span>
          </div>

          <div className="space-y-3">
            {mcqOptions.map((opt) => (
              <div key={opt.id} className="flex items-center gap-3">
                {/* Radio Indicator */}
                <button
                  type="button"
                  onClick={() => handleCorrectOptionChange(opt.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 ${
                    opt.isCorrect
                      ? 'bg-neon-blue-500/20 border-neon-blue-500 text-neon-blue-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                      : 'border-white/10 text-transparent hover:border-white/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${opt.isCorrect ? 'bg-neon-blue-400' : 'bg-transparent'}`} />
                </button>

                <div className="text-sm font-semibold text-gray-400 w-4">{opt.id}</div>

                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                  placeholder={`Option ${opt.id} value...`}
                  className="flex-1 glass-input px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteQuestionClick}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all duration-200 cursor-pointer"
              >
                Delete Question
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-neon-blue-600 hover:bg-neon-blue-500 shadow-[0_0_15px_rgba(14,165,233,0.4)] transition-all duration-200 ml-auto cursor-pointer"
            >
              {isEditing ? 'Update Question' : 'Save Question'}
            </button>
          </div>
        </div>
      )
    }
  ];

  // Staff Form Steps
  const staffWizardSteps = [
    {
      id: 'profile',
      title: 'Profile Info',
      description: 'Provide basic identity details for the new staff member.',
      content: (
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Full Name</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-sm"
              placeholder="e.g. Dr. Sarah Jenkins"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
            <input
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-sm"
              placeholder="sjenkins@school.edu"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Account Password</label>
            <input
              type="password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-sm"
              placeholder="••••••••"
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Minimum {staffRole === 'admin' ? '12' : '8'} characters required for {staffRole === 'admin' ? 'Administrator' : 'Faculty/Staff'} accounts.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'roles',
      title: 'Role Assignment',
      description: 'Define authorization levels and system access for this profile.',
      content: (
        <div className="space-y-3 pt-2">
          {[
            { id: 'admin', title: 'System Administrator', desc: 'Full control of syllabus, users, settings, and question database.' },
            { id: 'coordinator', title: 'Grade Coordinator', desc: 'Manages subjects, topics, and quality reviews for assigned grades.' },
            { id: 'hod', title: 'Department Head (HOD)', desc: 'Controls subject curriculum guidelines and approves questions.' },
            { id: 'faculty', title: 'Faculty User', desc: 'Auths questions, builds assessments, and manages personal drafts.' }
          ].map((roleOption) => {
            const isSelected = staffRole === roleOption.id;
            return (
              <button
                key={roleOption.id}
                type="button"
                onClick={() => setStaffRole(roleOption.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                  isSelected
                    ? 'glass bg-white/5 border-neon-blue-500 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                }`}
              >
                <div>
                  <h4 className={`text-sm font-semibold transition-colors duration-200 ${isSelected ? 'text-neon-blue-400' : 'text-white'}`}>
                    {roleOption.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[90%]">{roleOption.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'border-neon-blue-500 bg-neon-blue-500 text-white'
                    : 'border-white/10 text-transparent'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )
    },
    {
      id: 'subjects',
      title: 'Subject Hooks',
      description: 'Link this faculty member to the specific subjects they are teaching or reviewing.',
      content: (
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Select Active Subjects</label>
          <div className="grid grid-cols-2 gap-3">
            {allSubjects.length === 0 ? (
              <p className="text-xs text-gray-500 col-span-2">No curriculum subjects configured. Please configure them in Platform Configuration first.</p>
            ) : (
              allSubjects.map((subj) => {
                const isChecked = selectedSubjects.includes(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => toggleSubject(subj.id)}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-all duration-200 flex items-center gap-2.5 ${
                      isChecked
                        ? 'bg-neon-emerald-500/10 border-neon-emerald-500 text-neon-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                        : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.03] hover:border-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isChecked ? 'border-neon-emerald-500 bg-neon-emerald-500 text-white' : 'border-white/20'
                    }`}>
                      {isChecked && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {subj.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={drawerRef}
        className="w-full max-w-2xl h-full glass-heavy border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white tracking-wide">
              {isEditing ? 'Edit' : 'Create'} {isQuestionDrawer ? 'Question' : 'Staff Member'}
            </h2>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold text-neon-blue-400">
              {drawerType.replace(/_/g, ' ')}
            </p>
          </div>
          
          <button 
            onClick={closeDrawer}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-blue-500/50"
            aria-label="Close drawer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-900/10 relative">
          {showUpdateConfirm && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-center p-6 animate-fade-in text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-16 h-16 rounded-full glass bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Multi-Topic Edit</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    This question is associated with {selectedQuestionTopics.length} topics. Would you like to update it everywhere, or copy it to edit for this topic only?
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveQuestionConfirm('everywhere')}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-neon-blue-600 hover:bg-neon-blue-500 transition-all duration-200 cursor-pointer"
                  >
                    Apply Everywhere (All Topics)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveQuestionConfirm('copy')}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  >
                    Edit this Topic Only (Creates Copy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpdateConfirm(false)}
                    className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {isQuestionLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400 text-sm">Loading question details...</p>
            </div>
          ) : (
            <>
              {isQuestionDrawer && (
                <form onSubmit={handleSaveQuestion}>
                  <Accordion 
                    items={questionAccordionItems} 
                    activeId={questionAccordionId} 
                    onChange={setQuestionAccordionId} 
                  />
                </form>
              )}

              {isStaffDrawer && (
                <StepWizard
                  steps={staffWizardSteps}
                  currentStep={staffCurrentStep}
                  onStepChange={setStaffCurrentStep}
                  onComplete={handleStaffComplete}
                  onCancel={closeDrawer}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
