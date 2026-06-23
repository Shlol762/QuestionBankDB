import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Accordion } from './Accordion';
import { StepWizard } from './StepWizard';
import { useCreateQuestion, useQuestionDetails, useUpdateQuestion, useUploadQuestionImage } from '../../hooks/useQuestions';
import { useFormAutoAdvance } from '../../hooks/useFormAutoAdvance';
import { useRegisterStaff, useUpdateUser, useUsers } from '../../hooks/useStaff';
import { useMe } from '../../hooks/useAuth';
import { useAllowedSubjects, useAllowedGrades } from '../../hooks/useSystemConfig';
import { useCurriculumHierarchy } from '../../hooks/useCurriculum';
import { useResolvedCurriculumSelection } from '../../hooks/useResolvedCurriculumSelection';
import { toast } from 'react-hot-toast';
import { LatexRenderer } from './LatexRenderer';

export const Drawer: React.FC = () => {
  const { drawerType, drawerPayload, closeDrawer, openDialog } = useUIStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  const createQuestionMutation = useCreateQuestion();
  const uploadImageMutation = useUploadQuestionImage();
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
            const gradeText = g.grade_name || `Grade ${g.grade_level}`;
            list.push({
              id: t.topic_id,
              name: t.topic_name,
              info: `${gradeText} • ${sub.subject_name} • ${s.syllabus_name} (${s.academic_year})`
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
          const gradeText = g.grade_name || `Grade ${g.grade_level}`;
          list.push({
            id: sub.subject_id,
            name: `${sub.subject_name} (${gradeText} • ${s.syllabus_name})`
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
  const [questionAccordionId, setQuestionAccordionId] = useState('content');
  const [questionDifficulty, setQuestionDifficulty] = useState('medium');
  const [questionStatus, setQuestionStatus] = useState<'published' | 'archived'>('published');
  const [selectedQuestionTopics, setSelectedQuestionTopics] = useState<number[]>([]);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [questionMarks, setQuestionMarks] = useState('5');
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [questionType, setQuestionType] = useState<string>('MCQ');
  const [freeFormAnswer, setFreeFormAnswer] = useState('');
  const [matchPairs, setMatchPairs] = useState<{ id: number; left: string; right: string }[]>([
    { id: 1, left: '', right: '' }
  ]);
  const [mcqOptions, setMcqOptions] = useState([
    { id: 'A', text: '', isCorrect: true },
    { id: 'B', text: '', isCorrect: false },
    { id: 'C', text: '', isCorrect: false },
    { id: 'D', text: '', isCorrect: false }
  ]);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const handleAddMatchPair = () => {
    setMatchPairs(prev => [...prev, { id: Date.now(), left: '', right: '' }]);
  };

  const handleRemoveMatchPair = (id: number) => {
    setMatchPairs(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
  };

  const handleMatchPairChange = (id: number, field: 'left' | 'right', value: string) => {
    setMatchPairs(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

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

  // Staff Management Queries & Mutations
  const { data: usersData } = useUsers('all', { enabled: drawerType === 'EDIT_STAFF' });
  const { data: meData } = useMe();
  const updateUserMutation = useUpdateUser();
  const { data: allowedSubjectsPage } = useAllowedSubjects(true);
  const { data: allowedGradesPage } = useAllowedGrades(true);
  const allowedSubjectsList = useMemo(() => allowedSubjectsPage?.items || [], [allowedSubjectsPage]);
  const allowedGradesList = useMemo(() => allowedGradesPage?.items || [], [allowedGradesPage]);

  const editingUserId = (drawerType === 'EDIT_STAFF' && drawerPayload) ? (drawerPayload as { userId?: number })?.userId : null;
  const editingUser = useMemo(() => {
    if (!editingUserId || !usersData?.items) return null;
    return usersData.items.find(u => u.user_id === editingUserId);
  }, [editingUserId, usersData]);

  const isStaffLoading = drawerType === 'EDIT_STAFF' && !editingUser;

  // Reset form state and set preselected topic when drawer is opened
  useEffect(() => {
    if (drawerType === 'CREATE_QUESTION') {
      const payload = drawerPayload as { preselectedTopicId?: number | null } | undefined;
      const preselectedId = payload?.preselectedTopicId;
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setSelectedQuestionTopics(preselectedId ? [preselectedId] : []);
      setQuestionDifficulty('medium');
      setQuestionStatus('published');
      setQuestionMarks('5');
      setQuestionText('');
      setQuestionImageUrl('');
      setQuestionType('MCQ');
      setFreeFormAnswer('');
      setMatchPairs([{ id: 1, left: '', right: '' }]);
      setMcqOptions([
        { id: 'A', text: '', isCorrect: true },
        { id: 'B', text: '', isCorrect: false },
        { id: 'C', text: '', isCorrect: false },
        { id: 'D', text: '', isCorrect: false }
      ]);
      setQuestionAccordionId('content');
      setTopicSearchQuery('');
    }
  }, [drawerType, drawerPayload]);

  // Load existing question details when editing
  useEffect(() => {
    if (drawerType === 'EDIT_QUESTION' && questionDetails) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setQuestionDifficulty(questionDetails.difficulty.toLowerCase());
      setQuestionStatus((questionDetails.status as 'published' | 'archived') || 'published');
      setQuestionMarks(String(questionDetails.marks));
      setQuestionText(questionDetails.question_text);
      setQuestionImageUrl(questionDetails.image_url || '');
      setQuestionType(questionDetails.q_type || 'MCQ');
      
      const selectedIds = questionDetails.topics.map(t => t.topic_id);
      setSelectedQuestionTopics(selectedIds);
      
      if ((questionDetails.q_type === 'MCQ' || !questionDetails.q_type) && questionDetails.options) {
        const opts = Object.entries(questionDetails.options).map(([key, value]) => ({
          id: key,
          text: value as string,
          isCorrect: questionDetails.answer_text === key
        }));
        opts.sort((a, b) => a.id.localeCompare(b.id));
        setMcqOptions(opts);
        setFreeFormAnswer('');
      } else if (questionDetails.q_type === 'Match the Following' && questionDetails.options && Array.isArray(questionDetails.options.pairs)) {
        const pairs = questionDetails.options.pairs.map((p: any, idx: number) => ({
          id: idx + 1,
          left: p.left || '',
          right: p.right || ''
        }));
        setMatchPairs(pairs.length > 0 ? pairs : [{ id: 1, left: '', right: '' }]);
        setFreeFormAnswer('Pairs matched');
      } else {
        setFreeFormAnswer(questionDetails.answer_text || '');
        setMatchPairs([{ id: 1, left: '', right: '' }]);
      }
      
      setQuestionAccordionId('content');
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

    let answerTextVal = '';
    let optionsVal: Record<string, any> | null = null;

    if (questionType === 'MCQ') {
      const correctOption = mcqOptions.find(o => o.isCorrect);
      answerTextVal = correctOption ? correctOption.id : 'A';
      optionsVal = mcqOptions.reduce((acc, opt) => {
        acc[opt.id] = opt.text;
        return acc;
      }, {} as Record<string, string>);
    } else if (questionType === 'True/False') {
      answerTextVal = freeFormAnswer === 'True' || freeFormAnswer === 'False' ? freeFormAnswer : 'True';
      optionsVal = null;
    } else if (questionType === 'Match the Following') {
      answerTextVal = 'Pairs matched';
      optionsVal = {
        pairs: matchPairs.map(p => ({ left: p.left, right: p.right }))
      };
    } else {
      answerTextVal = freeFormAnswer || 'Standard Solution provided in marking scheme.';
      optionsVal = null;
    }

    await updateQuestionMutation.mutateAsync({
      id: questionId,
      payload: {
        update_mode: updateMode,
        context_topic_id: updateMode === 'copy' ? currentContextTopic?.id || undefined : undefined,
        topic_ids: selectedQuestionTopics,
        question_text: questionText,
        answer_text: answerTextVal,
        options: optionsVal,
        image_url: questionImageUrl || undefined,
        marks: parseInt(questionMarks, 10),
        difficulty: questionDifficulty.charAt(0).toUpperCase() + questionDifficulty.slice(1),
        q_type: questionType,
        status: questionStatus
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
      let answerTextVal = '';
      let optionsVal: Record<string, any> | null = null;

      if (questionType === 'MCQ') {
        const correctOption = mcqOptions.find(o => o.isCorrect);
        answerTextVal = correctOption ? correctOption.id : 'A';
        optionsVal = mcqOptions.reduce((acc, opt) => {
          acc[opt.id] = opt.text;
          return acc;
        }, {} as Record<string, string>);
      } else if (questionType === 'True/False') {
        answerTextVal = freeFormAnswer === 'True' || freeFormAnswer === 'False' ? freeFormAnswer : 'True';
        optionsVal = null;
      } else if (questionType === 'Match the Following') {
        answerTextVal = 'Pairs matched';
        optionsVal = {
          pairs: matchPairs.map(p => ({ left: p.left, right: p.right }))
        };
      } else {
        answerTextVal = freeFormAnswer || 'Standard Solution provided in marking scheme.';
        optionsVal = null;
      }

      await createQuestionMutation.mutateAsync({
        topic_ids: selectedQuestionTopics,
        question_text: questionText,
        answer_text: answerTextVal,
        options: optionsVal,
        image_url: questionImageUrl || undefined,
        marks: parseInt(questionMarks, 10),
        difficulty: questionDifficulty.charAt(0).toUpperCase() + questionDifficulty.slice(1),
        q_type: questionType,
        status: questionStatus
      });
      
      closeDrawer();
    }
  };

  // --- LOCAL STATE FOR STAFF WIZARD ---
  const [staffCurrentStep, setStaffCurrentStep] = useState(0);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffDepartment, setStaffDepartment] = useState('');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isStaffActive, setIsStaffActive] = useState(true);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<number[]>([]);
  const [selectedHODSubjectIds, setSelectedHODSubjectIds] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [isHOD, setIsHOD] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [hodSearch, setHodSearch] = useState('');
  const [gradeSearch, setGradeSearch] = useState('');
  const [hodDropdownOpen, setHodDropdownOpen] = useState(false);
  const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);

  useFormAutoAdvance(drawerRef, `${drawerType}-${staffCurrentStep}`);

  const toggleSubject = (subjId: number) => {
    setSelectedSubjects(prev =>
      prev.includes(subjId) ? prev.filter(s => s !== subjId) : [...prev, subjId]
    );
  };

  const toggleGradeLevel = (gradeId: number) => {
    setSelectedGradeLevels(prev =>
      prev.includes(gradeId) ? prev.filter(g => g !== gradeId) : [...prev, gradeId]
    );
  };

  const toggleHODSubject = (subjId: number) => {
    setSelectedHODSubjectIds(prev =>
      prev.includes(subjId) ? prev.filter(s => s !== subjId) : [...prev, subjId]
    );
  };

  const filteredGradeOptions = useMemo(() => {
    const list = allowedGradesList;
    if (!gradeSearch) return list;
    return list.filter(g => g.grade_name.toLowerCase().includes(gradeSearch.toLowerCase()));
  }, [allowedGradesList, gradeSearch]);

  const filteredHODOptions = useMemo(() => {
    const list = allowedSubjectsList;
    if (!hodSearch) return list;
    return list.filter(s => s.subject_name.toLowerCase().includes(hodSearch.toLowerCase()));
  }, [allowedSubjectsList, hodSearch]);

  // Load existing staff details when editing or reset when creating
  useEffect(() => {
    if (drawerType === 'EDIT_STAFF' && editingUser) {
      setStaffName(editingUser.full_name);
      setStaffEmail(editingUser.email);
      setStaffPassword('');
      setStaffDepartment(editingUser.department || '');
      setIsSystemAdmin(editingUser.is_admin);
      setIsStaffActive(editingUser.is_active);
      
      const grades = editingUser.grade_levels || [];
      setSelectedGradeLevels(grades);
      setIsCoordinator(grades.length > 0);

      const hodSubjs = editingUser.hod_allowed_subject_ids || [];
      setSelectedHODSubjectIds(hodSubjs);
      setIsHOD(hodSubjs.length > 0);

      setSelectedSubjects((editingUser.subjects || []).map(s => s.subject_id));
      setStaffCurrentStep(0);
    } else if (drawerType === 'CREATE_STAFF') {
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffDepartment('');
      setIsSystemAdmin(false);
      setIsStaffActive(true);
      setSelectedGradeLevels([]);
      setIsCoordinator(false);
      setSelectedHODSubjectIds([]);
      setIsHOD(false);
      setSelectedSubjects([]);
      setStaffCurrentStep(0);
    }
  }, [drawerType, editingUser]);

  const handleStaffComplete = async () => {
    const minLen = isSystemAdmin ? 12 : 8;
    if (!isEditing && staffPassword.length < minLen) {
      toast.error(`Password must be at least ${minLen} characters for ${isSystemAdmin ? 'Administrator' : 'Faculty/Staff'} accounts.`);
      return;
    }
    if (isEditing && staffPassword && staffPassword.length < minLen) {
      toast.error(`Password must be at least ${minLen} characters for ${isSystemAdmin ? 'Administrator' : 'Faculty/Staff'} accounts.`);
      return;
    }

    const payload = {
      full_name: staffName,
      email: staffEmail,
      department: staffDepartment || 'Academic Faculty',
      is_admin: isSystemAdmin,
      is_active: isStaffActive,
      subject_ids: selectedSubjects,
      hod_allowed_subject_ids: isHOD ? selectedHODSubjectIds : [],
      grade_levels: isCoordinator ? selectedGradeLevels : []
    };

    if (drawerType === 'EDIT_STAFF' && editingUserId) {
      const updatePayload: any = { ...payload };
      if (staffPassword) {
        updatePayload.password = staffPassword;
      }
      await updateUserMutation.mutateAsync({
        id: editingUserId,
        payload: updatePayload
      });
    } else {
      await registerStaffMutation.mutateAsync({
        ...payload,
        password: staffPassword
      });
    }
    closeDrawer();
  };

  const isEditing = drawerType ? drawerType.startsWith('EDIT_') : false;
  const isQuestionDrawer = drawerType ? drawerType.includes('QUESTION') : false;
  const isStaffDrawer = drawerType ? drawerType.includes('STAFF') : false;

  // Question Form Content Accordion Items
  const questionAccordionItems = [
    {
      id: 'content',
      title: '1. Core Content & Media',
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
            {questionText && (
              <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.01] p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neon-blue-400 mb-1.5">Live Math/Text Preview</span>
                <div className="text-sm text-gray-200 select-text font-medium leading-relaxed break-words">
                  <LatexRenderer text={questionText} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Supporting Images / Reference (Optional)</label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="question-image-upload"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const res = await uploadImageMutation.mutateAsync(file);
                  setQuestionImageUrl(res.image_url);
                  toast.success('Image uploaded successfully!');
                } catch (err) {
                  // Error handled by query hook
                }
              }}
            />
            {questionImageUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.01] p-2 flex flex-col items-center justify-center">
                <img
                  src={questionImageUrl.startsWith('/static/') ? `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')}${questionImageUrl}` : questionImageUrl}
                  alt="Uploaded preview"
                  className="max-h-40 rounded-lg object-contain w-full backdrop-blur-sm bg-black/10"
                />
                <button
                  type="button"
                  onClick={() => setQuestionImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors text-white cursor-pointer shadow-lg opacity-0 group-hover:opacity-100 duration-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="question-image-upload"
                className="border border-dashed border-white/10 hover:border-neon-blue-500/50 transition-colors duration-300 rounded-xl p-6 flex flex-col items-center justify-center bg-white/[0.01] cursor-pointer"
              >
                {uploadImageMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-neon-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs text-neon-blue-400 font-medium">Uploading image...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-400 mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-300 font-medium">Click to upload or drag & drop</span>
                    <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, GIF or WEBP up to 5MB</span>
                  </>
                )}
              </label>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end items-center">
            <button
              type="button"
              onClick={() => setQuestionAccordionId('answers')}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-neon-blue-400 hover:text-neon-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Next: Option Editor →
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'answers',
      title: '2. Answers & Option Editor',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      ),
      content: (
        <div className="space-y-5">
          {/* Question Type Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Question Type</label>
            <select
              value={questionType}
              onChange={(e) => {
                const newType = e.target.value;
                setQuestionType(newType);
                if (newType === 'True/False') {
                  setFreeFormAnswer('True');
                } else if (newType !== 'MCQ' && newType !== 'Match the Following') {
                  setFreeFormAnswer('');
                }
              }}
              className="w-full glass-input glass-select px-4 py-2.5 text-sm bg-surface-900 text-white rounded-xl border border-white/5 focus:border-neon-blue-500/50 outline-none"
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="True/False">True / False</option>
              <option value="Match the Following">Match the Following</option>
              <option value="Short Answer">Short Answer</option>
              <option value="Long Answer">Long Answer</option>
              <option value="Fill in the Blanks">Fill in the Blanks</option>
              <option value="One Word Answer">One Word Answer</option>
              <option value="Assertion/Reason">Assertion / Reason</option>
              <option value="Case Study">Case Study</option>
              <option value="Ordering/Sequencing">Ordering / Sequencing</option>
              <option value="Diagram Labeling">Diagram Labeling</option>
            </select>
          </div>

          <div className="border-t border-white/5 my-3" />

          {/* Conditional Editors */}
          {questionType === 'MCQ' ? (
            <div className="space-y-4">
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

                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        placeholder={`Option ${opt.id} value...`}
                        className="w-full glass-input px-3 py-2 text-sm"
                      />
                      {opt.text && (
                        <div className="text-[11px] text-gray-400 pl-1 select-text leading-relaxed">
                          <span className="text-[9px] text-neon-blue-400 font-bold uppercase mr-1">Preview:</span>
                          <LatexRenderer text={opt.text} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : questionType === 'True/False' ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Select Correct Answer</label>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {['True', 'False'].map((tfValue) => {
                  const isActive = freeFormAnswer === tfValue;
                  return (
                    <button
                      key={tfValue}
                      type="button"
                      onClick={() => setFreeFormAnswer(tfValue)}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-neon-blue-500/20 border-neon-blue-500 text-neon-blue-400 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {tfValue}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : questionType === 'Match the Following' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Match Pairs</label>
                <span className="text-[10px] text-neon-blue-400 uppercase tracking-widest font-bold">Define matching terms</span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {matchPairs.map((pair, index) => (
                  <div key={pair.id} className="flex items-center gap-2 bg-white/[0.01] p-3 rounded-xl border border-white/5 relative group">
                    <div className="text-xs font-bold text-gray-500 select-none w-5">{index + 1}</div>
                    
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => handleMatchPairChange(pair.id, 'left', e.target.value)}
                        placeholder="Left side item..."
                        className="w-full glass-input px-3 py-2 text-xs"
                      />
                      {pair.left && (
                        <div className="text-[10px] text-gray-400 pl-1 select-text leading-relaxed">
                          <LatexRenderer text={pair.left} />
                        </div>
                      )}
                    </div>

                    <span className="text-neon-blue-400 text-sm select-none">➔</span>

                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => handleMatchPairChange(pair.id, 'right', e.target.value)}
                        placeholder="Right side definition..."
                        className="w-full glass-input px-3 py-2 text-xs"
                      />
                      {pair.right && (
                        <div className="text-[10px] text-gray-400 pl-1 select-text leading-relaxed">
                          <LatexRenderer text={pair.right} />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMatchPair(pair.id)}
                      className="text-gray-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                      title="Remove pair"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddMatchPair}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                Add Pair
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Correct Answer / Solution Scheme</label>
              <textarea
                value={freeFormAnswer}
                onChange={(e) => setFreeFormAnswer(e.target.value)}
                className="w-full glass-input px-4 py-3 text-sm min-h-[100px]"
                placeholder="Enter correct answer, solution steps or reference schema..."
              />
              {freeFormAnswer && (
                <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.01] p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neon-blue-400 mb-1">Answer Preview</span>
                  <div className="text-xs text-gray-300 font-medium select-text leading-relaxed break-words">
                    <LatexRenderer text={freeFormAnswer} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-white/5 flex justify-end items-center">
            <button
              type="button"
              onClick={() => setQuestionAccordionId('classification')}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-neon-blue-400 hover:text-neon-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Next: Classification & Difficulty →
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'classification',
      title: '3. Classification & Difficulty',
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-200"
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
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0b0f19] border border-white/10 rounded-xl shadow-2xl z-50 divide-y divide-white/5">
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
                      className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all duration-200 cursor-pointer ${
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Question Status</label>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {['published', 'archived'].map((statusOption) => {
                const isActive = questionStatus === statusOption;
                const activeColors: Record<string, string> = {
                  published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
                  archived: 'bg-surface-700 text-gray-300 border-white/10'
                };
                return (
                  <button
                    key={statusOption}
                    type="button"
                    onClick={() => setQuestionStatus(statusOption as 'published' | 'archived')}
                    className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? activeColors[statusOption]
                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {statusOption}
                  </button>
                );
              })}
            </div>
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
  const staffWizardSteps = useMemo(() => {
    const steps = [];

    // Page 1: Profile
    steps.push({
      id: 'profile',
      title: 'Profile',
      description: 'Provide basic identity details for the staff member.',
      content: (
        <div className="space-y-5 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 text-left">Full Name</label>
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 text-left">Email Address</label>
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 text-left">Department</label>
            <input
              type="text"
              value={staffDepartment}
              onChange={(e) => setStaffDepartment(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-sm"
              placeholder="e.g. Science, Mathematics, IT"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 text-left">Account Password</label>
            <input
              type="password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-sm"
              placeholder={isEditing ? "Leave blank to keep current password" : "••••••••"}
              required={!isEditing}
            />
            <p className="text-[10px] text-gray-400 mt-1 text-left">
              Minimum {isSystemAdmin ? '12' : '8'} characters required for {isSystemAdmin ? 'Administrator' : 'Faculty/Staff'} accounts.
            </p>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5 mt-4">
            <div className="text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Account Status</label>
              <span className="text-[10px] text-gray-500">Enable or disable access to the platform for this user.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isStaffActive}
                onChange={() => setIsStaffActive(!isStaffActive)}
                disabled={isEditing && editingUserId === meData?.user_id}
                className="sr-only peer"
                title={isEditing && editingUserId === meData?.user_id ? "You cannot disable your own account" : `Click to ${isStaffActive ? 'disable' : 'enable'} account`}
              />
              <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neon-blue-500/50 bg-white/10 peer-checked:bg-neon-emerald-500 ${
                isEditing && editingUserId === meData?.user_id ? 'opacity-50 cursor-not-allowed' : ''
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out transform ${
                  isStaffActive ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>
        </div>
      )
    });

    // Page 2: Management Roles (select all that apply: Grade Coordinator, Head of Department, Admin Control)
    steps.push({
      id: 'roles',
      title: 'Management Roles',
      description: 'Select all administrative or academic coordination roles that apply to this staff member.',
      content: (
        <div className="space-y-4 pt-2">
          {/* Grade Coordinator Card */}
          <div 
            onClick={() => {
              setIsCoordinator(!isCoordinator);
              if (isCoordinator) {
                setSelectedGradeLevels([]);
              }
            }}
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-4 select-none ${
              isCoordinator
                ? 'glass bg-neon-blue-500/5 border-neon-blue-500/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 transition-colors duration-300 ${
              isCoordinator ? 'bg-neon-blue-500/20 text-neon-blue-400' : 'bg-white/5 text-gray-400'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <h4 className={`text-base font-bold transition-colors duration-200 ${isCoordinator ? 'text-neon-blue-400 font-extrabold' : 'text-white'}`}>
                  Grade Coordinator
                </h4>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isCoordinator ? 'border-neon-blue-500 bg-neon-blue-500 text-white' : 'border-white/20 bg-white/5'
                }`}>
                  {isCoordinator && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Manages syllabus structures, subject standards, and quality reviews for assigned grades. Adds a dedicated grade assignment step to the onboarding flow.
              </p>
            </div>
          </div>

          {/* Head of Department Card */}
          <div 
            onClick={() => {
              setIsHOD(!isHOD);
              if (isHOD) {
                setSelectedHODSubjectIds([]);
              }
            }}
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-4 select-none ${
              isHOD
                ? 'glass bg-amber-500/5 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 transition-colors duration-300 ${
              isHOD ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <h4 className={`text-base font-bold transition-colors duration-200 ${isHOD ? 'text-amber-400 font-extrabold' : 'text-white'}`}>
                  Head of Department (HOD)
                </h4>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isHOD ? 'border-amber-500 bg-amber-500 text-white' : 'border-white/20 bg-white/5'
                }`}>
                  {isHOD && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Approves new questions and designs department-wide academic guidelines. Adds a dedicated subject assignment step to the onboarding flow.
              </p>
            </div>
          </div>

          {/* Admin Control Card */}
          <div 
            onClick={() => setIsSystemAdmin(!isSystemAdmin)}
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-4 select-none ${
              isSystemAdmin
                ? 'glass bg-purple-500/5 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 transition-colors duration-300 ${
              isSystemAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <h4 className={`text-base font-bold transition-colors duration-200 ${isSystemAdmin ? 'text-purple-400 font-extrabold' : 'text-white'}`}>
                  Admin Control
                </h4>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isSystemAdmin ? 'border-purple-500 bg-purple-500 text-white' : 'border-white/20 bg-white/5'
                }`}>
                  {isSystemAdmin && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Grants absolute system access, including setting up database schemas, database resets, global platform settings, and user administration.
              </p>
              {isEditing && !editingUser?.is_admin && isSystemAdmin && !staffPassword && (
                <div className="mt-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-400 leading-relaxed text-left flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span className="font-semibold block mb-0.5">Password Security Check Required</span>
                    Elevating this user to Admin does not automatically update their password. Admin accounts require a password of at least 12 characters. If their current password is shorter, you should specify a new 12+ character password on page 1, or instruct them to update it immediately.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    });

    // Page 3 (Conditional): HOD Subjects
    if (isHOD) {
      steps.push({
        id: 'hod',
        title: 'HOD Subjects',
        description: 'Select the subjects for which this staff member acts as Head of Department.',
        content: (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Managed HOD Subjects</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setHodDropdownOpen(!hodDropdownOpen);
                    setGradeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between cursor-pointer rounded-xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border transition-all duration-200 ${
                    hodDropdownOpen
                      ? 'border-amber-500 ring-2 ring-amber-500/20 text-white'
                      : 'border-white/10 text-gray-300 hover:border-white/20 hover:from-white/[0.05]'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    <span>Select Subjects:</span>
                    {selectedHODSubjectIds.length > 0 ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-extrabold animate-fade-in">
                        {selectedHODSubjectIds.length} selected
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">None selected</span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${hodDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {hodDropdownOpen && (
                  <div className="absolute z-[60] w-full mt-1.5 bg-[#0c0c14] border border-white/10 rounded-xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8)] backdrop-blur-xl p-3 space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search subjects..."
                        value={hodSearch}
                        onChange={(e) => setHodSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                      />
                    </div>
                    <div className="space-y-0.5">
                      {filteredHODOptions.length === 0 ? (
                        <div className="text-xs text-gray-500 py-3 text-center">No subjects matching filter</div>
                      ) : (
                        filteredHODOptions.map((subj) => {
                          const isChecked = selectedHODSubjectIds.includes(subj.allowed_subject_id);
                          return (
                            <button
                              key={subj.allowed_subject_id}
                              type="button"
                              onClick={() => toggleHODSubject(subj.allowed_subject_id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all duration-150 ${
                                isChecked
                                  ? 'bg-amber-500/10 text-amber-400 font-semibold border-l-2 border-amber-500 pl-2'
                                  : 'text-gray-300 hover:bg-white/[0.03] hover:text-white'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'border-amber-500 bg-amber-500 text-white' : 'border-white/20 bg-white/5'
                              }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              {subj.subject_name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected HOD Subject Tags */}
              {selectedHODSubjectIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedHODSubjectIds.map((subId) => {
                    const subjectObj = allowedSubjectsList.find(s => s.allowed_subject_id === subId);
                    return (
                      <span key={subId} className="inline-flex items-center gap-2 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/15 transition-all duration-150 animate-fade-in">
                        {subjectObj?.subject_name || `Subject ${subId}`}
                        <button
                          type="button"
                          onClick={() => toggleHODSubject(subId)}
                          className="text-amber-400 hover:text-amber-300 hover:bg-white/10 rounded-full p-0.5 transition-colors focus:outline-none"
                          aria-label="Remove subject"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      });
    }

    // Page 4 (Conditional): Coordinated Grades
    if (isCoordinator) {
      steps.push({
        id: 'coordinator',
        title: 'Coordinated Grades',
        description: 'Select the grade levels for which this staff member acts as Grade Coordinator.',
        content: (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Coordinated Grade Levels</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setGradeDropdownOpen(!gradeDropdownOpen);
                    setHodDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between cursor-pointer rounded-xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border transition-all duration-200 ${
                    gradeDropdownOpen
                      ? 'border-neon-blue-500 ring-2 ring-neon-blue-500/20 text-white'
                      : 'border-white/10 text-gray-300 hover:border-white/20 hover:from-white/[0.05]'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    <span>Select Grades:</span>
                    {selectedGradeLevels.length > 0 ? (
                      <span className="bg-neon-blue-500/20 text-neon-blue-300 border border-neon-blue-500/30 px-2 py-0.5 rounded-full text-xs font-extrabold animate-fade-in">
                        {selectedGradeLevels.length} selected
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">None selected</span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${gradeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {gradeDropdownOpen && (
                  <div className="absolute z-[60] w-full mt-1.5 bg-[#0c0c14] border border-white/10 rounded-xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8)] backdrop-blur-xl p-3 space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search grades..."
                        value={gradeSearch}
                        onChange={(e) => setGradeSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue-500 focus:ring-1 focus:ring-neon-blue-500/30"
                      />
                    </div>
                    <div className="space-y-0.5">
                      {filteredGradeOptions.length === 0 ? (
                        <div className="text-xs text-gray-500 py-3 text-center">No grades matching filter</div>
                      ) : (
                        filteredGradeOptions.map((grade) => {
                          const isChecked = selectedGradeLevels.includes(grade.allowed_grade_id);
                          return (
                            <button
                              key={grade.allowed_grade_id}
                              type="button"
                              onClick={() => toggleGradeLevel(grade.allowed_grade_id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all duration-150 ${
                                isChecked
                                  ? 'bg-neon-blue-500/10 text-neon-blue-400 font-semibold border-l-2 border-neon-blue-500 pl-2'
                                  : 'text-gray-300 hover:bg-white/[0.03] hover:text-white'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'border-neon-blue-500 bg-neon-blue-500 text-white' : 'border-white/20 bg-white/5'
                              }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              {grade.grade_name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Grade Tags */}
              {selectedGradeLevels.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedGradeLevels.map((glId) => {
                    const gradeObj = allowedGradesList.find(g => g.allowed_grade_id === glId);
                    return (
                      <span key={glId} className="inline-flex items-center gap-2 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-neon-blue-500/10 text-neon-blue-400 border border-neon-blue-500/20 hover:border-neon-blue-500/40 hover:bg-neon-blue-500/15 transition-all duration-150 animate-fade-in">
                        {gradeObj?.grade_name || `Grade ${glId}`}
                        <button
                          type="button"
                          onClick={() => toggleGradeLevel(glId)}
                          className="text-neon-blue-400 hover:text-neon-blue-300 hover:bg-white/10 rounded-full p-0.5 transition-colors focus:outline-none"
                          aria-label="Remove grade"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      });
    }

    // Page 5: Teaching Subjects
    steps.push({
      id: 'subjects',
      title: 'Teaching Subjects',
      description: 'Link this faculty member to the specific subjects they are teaching or reviewing.',
      content: (
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">Select Active Subjects</label>
          <div className="grid grid-cols-2 gap-3">
            {allSubjects.length === 0 ? (
              <p className="text-xs text-gray-500 col-span-2 text-left">No curriculum subjects configured. Please configure them in Platform Configuration first.</p>
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
    });

    return steps;
  }, [
    staffName, staffEmail, staffPassword, staffDepartment, isSystemAdmin, isStaffActive, isHOD, isCoordinator,
    selectedGradeLevels, selectedHODSubjectIds, selectedSubjects,
    hodDropdownOpen, gradeDropdownOpen, hodSearch, gradeSearch,
    filteredGradeOptions, filteredHODOptions, allowedSubjectsList, allowedGradesList,
    allSubjects, isEditing, editingUserId, meData
  ]);

  // Keep step within bounds if wizard steps count shrinks
  useEffect(() => {
    if (staffCurrentStep >= staffWizardSteps.length) {
      setStaffCurrentStep(Math.max(0, staffWizardSteps.length - 1));
    }
  }, [staffWizardSteps.length, staffCurrentStep]);

  if (!drawerType) return null;

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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-900/10 relative">
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

          {isQuestionDrawer && isQuestionLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400 text-sm">Loading question details...</p>
            </div>
          ) : isStaffDrawer && isStaffLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400 text-sm">Loading staff profile...</p>
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
