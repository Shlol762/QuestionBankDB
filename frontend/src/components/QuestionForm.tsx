import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Image as ImageIcon, 
  X, 
  Loader2, 
  AlertCircle,
  Plus,
  CheckCircle2,
  BookOpen,
  Tag,
  Pencil,
  ArrowRightLeft,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderRoot,
  Layers
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

const QUESTION_TYPES = [
  'MCQ',
  'True/False',
  'Match the Following',
  'Short Answer',
  'Long Answer',
  'Fill in the Blanks',
  'One Word Answer',
  'Assertion/Reason',
  'Case Study',
  'Ordering/Sequencing',
  'Diagram Labeling',
  'Comprehension Passage',
] as const;

type QuestionTypeValue = typeof QUESTION_TYPES[number];

const defaultOptions = { A: '', B: '', C: '', D: '' };
const defaultPairs = [{ left: '', right: '' }, { left: '', right: '' }];
const defaultOrdering = ['First event', 'Second event', 'Third event'];
const defaultLabels = ['Label A', 'Label B'];

interface QuestionFormProps {
  initialData?: {
    question_id?: number;
    topic_id?: number;
    topic?: { subject_id: number; [key: string]: unknown };
    question_text?: string;
    answer_text?: string;
    image_url?: string | null;
    marks?: number;
    difficulty?: string;
    q_type?: string;
    status?: string;
    options?: unknown;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

type MatchPair = { left: string; right: string };
type MCQOptions = { A: string; B: string; C: string; D: string };
type MatchOptions = { pairs: MatchPair[] };
type GenericOptions = Record<string, unknown>;
type QuestionOptions = MCQOptions | MatchOptions | GenericOptions | null;

interface HierarchyTopic {
  topic_id: number;
  topic_name: string;
}

interface HierarchySubject {
  subject_id: number;
  subject_name: string;
  config_id?: number;
  topics: HierarchyTopic[];
}

interface HierarchyGrade {
  config_id: number;
  syllabus_id: number;
  grade_level: number;
  subjects: HierarchySubject[];
}

interface HierarchySyllabus {
  syllabus_id: number;
  syllabus_name: string;
  academic_year?: string;
  grades: HierarchyGrade[];
}

interface AllowedSubject {
  allowed_subject_id: number;
  subject_name: string;
  recommendation_note?: string | null;
  is_active: boolean;
}

// --- VALIDATION SCHEMA ---
const questionSchema = z.object({
  topic_id: z.string().min(1, "Topic selection is required"),
  question_text: z.string().min(1, "Question text cannot be empty").max(1000, "Max 1000 characters"),
  answer_text: z.string().min(1, "Answer/solution is required"),
  image_url: z.string().optional(),
  marks: z.number().min(0, "Marks cannot be negative"),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  q_type: z.enum(QUESTION_TYPES),
  status: z.enum(['draft', 'published', 'archived']),
  options: z.any().optional()
}).superRefine((data, ctx) => {
  if (data.q_type === 'MCQ') {
    const opts = data.options && 'A' in data.options ? data.options : null;
    if (!opts?.A?.trim() || !opts?.B?.trim() || !opts?.C?.trim() || !opts?.D?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All MCQ choices (A, B, C, D) must be filled",
        path: ["options"]
      });
    }
    if (!data.answer_text || !['A', 'B', 'C', 'D'].includes(data.answer_text)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a valid correct option (A-D)",
        path: ["answer_text"]
      });
    }
  }
  if (data.q_type === 'Match the Following') {
    const optionObj = (data.options || {}) as Record<string, unknown>;
    const pairs = Array.isArray(optionObj.pairs) ? optionObj.pairs as MatchPair[] : [];
    if (pairs.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum 2 pairs required",
        path: ["options"]
      });
    } else if (pairs.some((p: MatchPair) => !p.left?.trim() || !p.right?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All pairs must be complete",
        path: ["options"]
      });
    }
  }

  if (data.q_type === 'One Word Answer' && data.answer_text.trim().includes(' ')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "One Word Answer must be a single word",
      path: ["answer_text"]
    });
  }

  if (data.q_type === 'Ordering/Sequencing') {
    const optionObj = (data.options || {}) as Record<string, unknown>;
    const items = Array.isArray(optionObj.items) ? optionObj.items as string[] : [];
    if (items.filter((i) => i.trim()).length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least 2 ordering items",
        path: ["options"]
      });
    }
  }

  if (data.q_type === 'Assertion/Reason') {
    const optionObj = (data.options || {}) as Record<string, unknown>;
    if (!String(optionObj.assertion || '').trim() || !String(optionObj.reason || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assertion and reason are both required",
        path: ["options"]
      });
    }
  }

  if (data.q_type === 'Case Study' || data.q_type === 'Comprehension Passage') {
    const optionObj = (data.options || {}) as Record<string, unknown>;
    if (!String(optionObj.passage || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A passage/case block is required for this question type",
        path: ["options"]
      });
    }
  }
});

type QuestionFormData = z.infer<typeof questionSchema>;

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'draft' | 'published'>('draft');
  const { user } = useAuthStore();
  const { defaultMarks, defaultDifficulty } = useSettingsStore();
  
  const isEditing = !!initialData?.question_id;
  const isFirstRender = useRef(true);
  const defaultQuestionType: QuestionTypeValue = QUESTION_TYPES.includes((initialData?.q_type || 'MCQ') as QuestionTypeValue)
    ? (initialData?.q_type as QuestionTypeValue)
    : 'MCQ';
  const defaultStatus: 'draft' | 'published' | 'archived' =
    initialData?.status === 'published' || initialData?.status === 'archived' ? initialData.status : 'draft';
  const defaultOptionsForType = (qType: QuestionTypeValue): QuestionOptions => {
    switch (qType) {
      case 'MCQ':
        return defaultOptions;
      case 'Match the Following':
        return { pairs: defaultPairs };
      case 'Assertion/Reason':
        return { assertion: '', reason: '' };
      case 'Case Study':
        return { passage: '' };
      case 'Comprehension Passage':
        return { passage: '' };
      case 'Ordering/Sequencing':
        return { items: defaultOrdering };
      case 'Diagram Labeling':
        return { labels: defaultLabels };
      case 'Short Answer':
      case 'Long Answer':
      case 'Fill in the Blanks':
      case 'One Word Answer':
      case 'True/False':
      default:
        return null;
    }
  };

  const initialOptions: QuestionOptions = initialData?.options ?? defaultOptionsForType(defaultQuestionType);

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      topic_id: initialData?.topic_id?.toString() || '',
      question_text: initialData?.question_text || '',
      answer_text: initialData?.answer_text || '',
      image_url: initialData?.image_url || '',
      marks: initialData?.marks !== undefined ? initialData.marks : defaultMarks,
      difficulty: (initialData?.difficulty as 'Easy' | 'Medium' | 'Hard' | undefined) || defaultDifficulty,
      q_type: defaultQuestionType,
      status: defaultStatus,
      options: initialOptions,
    }
  });

  const currentQType = watch('q_type');
  const currentOptions = watch('options');
  const currentAnswer = watch('answer_text');
  const currentImageUrl = watch('image_url');
  const currentTopicId = Number(watch('topic_id'));

  const asMCQOptions = (options: QuestionOptions | undefined): MCQOptions => {
    if (options && typeof options === 'object' && 'A' in options && 'B' in options && 'C' in options && 'D' in options) {
      return options as MCQOptions;
    }
    return defaultOptions;
  };

  const asMatchOptions = (options: QuestionOptions | undefined): MatchOptions => {
    if (options && typeof options === 'object' && 'pairs' in options) {
      const maybePairs = (options as Record<string, unknown>).pairs;
      if (Array.isArray(maybePairs)) {
        return { pairs: maybePairs as MatchPair[] };
      }
    }
    return { pairs: defaultPairs };
  };

  const getObjectOptions = (options: QuestionOptions | undefined): GenericOptions => {
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      return options as GenericOptions;
    }
    return {};
  };

  const [expandedSyllabus, setExpandedSyllabus] = useState<number[]>([]);
  const [expandedGrade, setExpandedGrade] = useState<number[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<number[]>([]);
  const [topicSearch, setTopicSearch] = useState('');

  const { data: rawHierarchy = [] } = useQuery<HierarchySyllabus[]>({
    queryKey: ['curriculum-hierarchy'],
    queryFn: () => client.get('/curriculum/hierarchy').then(r => r.data)
  });

  const { data: allowedSubjectsData } = useQuery({
    queryKey: ['allowed-subjects-active'],
    queryFn: () => client.get('/allowed-subjects/?active_only=true&limit=500').then(r => r.data),
  });

  // Scoped hierarchy for topic picking (Syllabus -> Grade -> Subject -> Topic)
  const scopedHierarchy = useMemo(() => {
    return rawHierarchy
      .map((syllabus) => {
        const grades = syllabus.grades
          .map((grade) => {
            const isCoordinator = user?.is_admin || user?.grade_levels?.includes(grade.grade_level);
            const subjects = grade.subjects.filter((subject) => {
              return (
                isCoordinator ||
                user?.subjects?.some((assigned) => assigned.subject_id === subject.subject_id) ||
                user?.hod_subject_names?.includes(subject.subject_name)
              );
            });

            return {
              ...grade,
              subjects,
            };
          })
          .filter((grade) => grade.subjects.length > 0);

        return {
          ...syllabus,
          grades,
        };
      })
      .filter((syllabus) => syllabus.grades.length > 0);
  }, [rawHierarchy, user]);

  const topicIndex = useMemo(() => {
    const lookup = new Map<number, { topic: HierarchyTopic; subject: HierarchySubject; grade: HierarchyGrade; syllabus: HierarchySyllabus }>();
    scopedHierarchy.forEach((syllabus) => {
      syllabus.grades.forEach((grade) => {
        grade.subjects.forEach((subject) => {
          subject.topics.forEach((topic) => {
            lookup.set(topic.topic_id, { topic, subject, grade, syllabus });
          });
        });
      });
    });
    return lookup;
  }, [scopedHierarchy]);

  const selectedTopicMeta = useMemo(() => {
    const topicId = currentTopicId;
    if (!Number.isFinite(topicId)) return undefined;
    return topicIndex.get(topicId);
  }, [topicIndex, currentTopicId]);

  const filteredTopicEntries = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return [];

    const entries: Array<{ topic: HierarchyTopic; subject: HierarchySubject; grade: HierarchyGrade; syllabus: HierarchySyllabus }> = [];
    topicIndex.forEach((value) => {
      const searchable = `${value.topic.topic_name} ${value.subject.subject_name} ${value.grade.grade_level} ${value.syllabus.syllabus_name}`.toLowerCase();
      if (searchable.includes(q)) entries.push(value);
    });
    return entries.slice(0, 30);
  }, [topicIndex, topicSearch]);

  const allowedNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of (allowedSubjectsData?.items || []) as AllowedSubject[]) {
      map.set(item.subject_name.trim().toLowerCase(), item.recommendation_note || '');
    }
    return map;
  }, [allowedSubjectsData]);

  const recommendation = selectedTopicMeta
    ? allowedNameMap.get(selectedTopicMeta.subject.subject_name.trim().toLowerCase())
    : undefined;

  const isRecommendedSubject = selectedTopicMeta
    ? allowedNameMap.has(selectedTopicMeta.subject.subject_name.trim().toLowerCase())
    : true;

  // Mutations
  const mutation = useMutation({
    mutationFn: async (data: QuestionFormData) => {
      const payload = {
        ...data,
        topic_id: parseInt(data.topic_id),
        // For match the following, the answer text is static
        answer_text: data.q_type === 'Match the Following' ? "Pairs matched" : data.answer_text,
      };

      if (isEditing) {
        return client.patch(`/questions/${initialData.question_id}`, payload);
      }
      return client.post('/questions/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success(isEditing ? 'Question updated!' : 'Question created!');
      onSuccess();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail || 'Failed to save question.');
    }
  });

  // Helper for Pairs
  const addPair = () => {
    const currentPairs = asMatchOptions(currentOptions).pairs;
    setValue('options', { pairs: [...currentPairs, { left: '', right: '' }] });
  };

  const removePair = (index: number) => {
    const currentPairs = asMatchOptions(currentOptions).pairs;
    setValue('options', { pairs: currentPairs.filter((_: MatchPair, i: number) => i !== index) });
  };

  const handlePairChange = (index: number, field: 'left' | 'right', val: string) => {
    const newPairs = [...asMatchOptions(currentOptions).pairs];
    newPairs[index] = { ...newPairs[index], [field]: val };
    setValue('options', { pairs: newPairs });
  };

  const uploadImageFile = async (file: File) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
        toast.error("Image exceeds 50MB limit");
        return;
    }

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    try {
      const res = await client.post('/questions/upload-image', uploadData);
      setValue('image_url', res.data.image_url);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onSubmit: SubmitHandler<QuestionFormData> = (data) => {
    mutation.mutate({ ...data, status: submitMode });
  };

  const updateObjectOption = (key: string, value: unknown) => {
    const existing = getObjectOptions(currentOptions);
    setValue('options', { ...existing, [key]: value }, { shouldDirty: true, shouldValidate: false });
  };

  const renderTypeSpecificEditor = () => {
    const objectOptions = getObjectOptions(currentOptions);

    if (currentQType === 'MCQ') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Options Blueprint</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map((key) => (
              <div key={key} className="relative group">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg font-black text-xs transition-all ${currentAnswer === key ? 'bg-academy-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {key}
                </span>
                <input
                  type="text"
                  value={asMCQOptions(currentOptions)[key as keyof MCQOptions] || ''}
                  onChange={(e) => setValue('options', { ...asMCQOptions(currentOptions), [key]: e.target.value }, { shouldDirty: true })}
                  className={`w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl outline-none focus:ring-4 focus:ring-academy-500/10 transition-all font-bold text-sm dark:text-white ${currentAnswer === key ? 'border-academy-500 bg-white dark:bg-gray-800 shadow-sm' : 'border-gray-200 dark:border-gray-700'}`}
                  placeholder={`Choice ${key}...`}
                />
                <button
                  type="button"
                  onClick={() => setValue('answer_text', key, { shouldDirty: true })}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${currentAnswer === key ? 'text-academy-600' : 'text-gray-300 hover:text-gray-400 dark:text-gray-600'}`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          {errors.options && <p className="text-red-500 text-[10px] font-bold">{errors.options.message as string}</p>}
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'True/False') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Correct Assertion</label>
          <div className="flex gap-4">
            {['True', 'False'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setValue('answer_text', val, { shouldDirty: true })}
                className={`flex-1 py-6 rounded-2xl border-2 font-black text-lg transition-all flex flex-col items-center gap-2 ${currentAnswer === val ? 'bg-academy-600 border-academy-600 text-white shadow-xl shadow-academy-600/20' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-academy-300 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                <CheckCircle2 className={`w-6 h-6 ${currentAnswer === val ? 'opacity-100 scale-110' : 'opacity-0 scale-50'} transition-all`} />
                {val}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentQType === 'Match the Following') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Logic Pairs</label>
            <button type="button" onClick={addPair} className="flex items-center gap-1.5 text-[10px] font-black text-academy-600 dark:text-academy-400 uppercase hover:underline transition-all">
              <Plus className="w-3.5 h-3.5" /> Extend Pairs
            </button>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {asMatchOptions(currentOptions).pairs.map((pair: MatchPair, idx: number) => (
              <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left-2">
                <div className="flex-1">
                  <input type="text" value={pair.left} onChange={(e) => handlePairChange(idx, 'left', e.target.value)} placeholder="Term" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 font-bold text-sm dark:text-white" />
                </div>
                <ArrowRightLeft className="w-4 h-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <input type="text" value={pair.right} onChange={(e) => handlePairChange(idx, 'right', e.target.value)} placeholder="Relation" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 font-bold text-sm dark:text-white" />
                </div>
                {asMatchOptions(currentOptions).pairs.length > 2 && (
                  <button type="button" onClick={() => removePair(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          {errors.options && <p className="text-red-500 text-[10px] font-bold">{errors.options.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Fill in the Blanks') {
      const blanks = (watch('question_text').match(/_{3,}/g) || []).length;
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Blank Inputs</p>
          <p className="text-xs font-bold text-gray-500">Detected blank slots in question text: {blanks}</p>
          <input
            {...register('answer_text')}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm dark:text-white"
            placeholder="Comma-separated answers in order: chlorophyll, glucose"
          />
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'One Word Answer') {
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Single-Token Answer</p>
          <input
            {...register('answer_text')}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-black text-sm dark:text-white"
            placeholder="Expected one-word answer"
          />
          {currentAnswer.trim().includes(' ') && <p className="text-amber-600 text-[10px] font-bold">Use one word only.</p>}
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Assertion/Reason') {
      return (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assertion/Reason Designer</p>
          <textarea
            value={String(objectOptions.assertion || '')}
            onChange={(e) => updateObjectOption('assertion', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none min-h-[80px] font-bold text-sm dark:text-white"
            placeholder="Assertion statement"
          />
          <textarea
            value={String(objectOptions.reason || '')}
            onChange={(e) => updateObjectOption('reason', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none min-h-[80px] font-bold text-sm dark:text-white"
            placeholder="Reason statement"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'Both true, reason explains assertion',
              'Both true, reason does not explain assertion',
              'Assertion true, reason false',
              'Assertion false, reason true',
            ].map((choice) => (
              <button
                type="button"
                key={choice}
                onClick={() => setValue('answer_text', choice, { shouldDirty: true })}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all ${currentAnswer === choice ? 'bg-academy-600 border-academy-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                {choice}
              </button>
            ))}
          </div>
          {errors.options && <p className="text-red-500 text-[10px] font-bold">{errors.options.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Case Study' || currentQType === 'Comprehension Passage') {
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passage Workspace</p>
          <textarea
            value={String(objectOptions.passage || '')}
            onChange={(e) => updateObjectOption('passage', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none min-h-[120px] font-medium text-sm dark:text-white"
            placeholder={currentQType === 'Case Study' ? 'Enter the case study context...' : 'Enter the comprehension passage...'}
          />
          <textarea
            {...register('answer_text')}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none min-h-[100px] font-bold text-sm dark:text-white"
            placeholder="Model answer / scoring points"
          />
          {errors.options && <p className="text-red-500 text-[10px] font-bold">{errors.options.message as string}</p>}
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Ordering/Sequencing') {
      const items = Array.isArray(objectOptions.items) ? objectOptions.items as string[] : defaultOrdering;
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sequence Builder</p>
            <button type="button" onClick={() => updateObjectOption('items', [...items, ''])} className="text-[10px] font-black text-academy-600 uppercase">Add Step</button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={`order-${index}`} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black flex items-center justify-center">{index + 1}</span>
                <input
                  value={item}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = e.target.value;
                    updateObjectOption('items', next);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm font-bold dark:text-white"
                  placeholder={`Step ${index + 1}`}
                />
                {items.length > 2 && (
                  <button
                    type="button"
                    onClick={() => updateObjectOption('items', items.filter((_, i) => i !== index))}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <input
            {...register('answer_text')}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-bold dark:text-white"
            placeholder="Correct order indices, e.g. 2,1,3"
          />
          {errors.options && <p className="text-red-500 text-[10px] font-bold">{errors.options.message as string}</p>}
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Diagram Labeling') {
      const labels = Array.isArray(objectOptions.labels) ? objectOptions.labels as string[] : defaultLabels;
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Label Bank</p>
            <button type="button" onClick={() => updateObjectOption('labels', [...labels, ''])} className="text-[10px] font-black text-academy-600 uppercase">Add Label</button>
          </div>
          {labels.map((label, index) => (
            <input
              key={`label-${index}`}
              value={label}
              onChange={(e) => {
                const next = [...labels];
                next[index] = e.target.value;
                updateObjectOption('labels', next);
              }}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm dark:text-white"
              placeholder={`Label ${index + 1}`}
            />
          ))}
          <textarea
            {...register('answer_text')}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none min-h-[90px] font-bold text-sm dark:text-white"
            placeholder="Answer map, e.g. A-Leaf, B-Stem"
          />
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Short Answer') {
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Short Answer Rubric</p>
          <input
            value={String(objectOptions.keywords || '')}
            onChange={(e) => updateObjectOption('keywords', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm dark:text-white"
            placeholder="Must-have keywords (comma separated)"
          />
          <textarea
            {...register('answer_text')}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none min-h-[110px] font-bold dark:text-white"
            placeholder="Concise model answer..."
          />
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    if (currentQType === 'Long Answer') {
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Long-Form Evaluation Guide</p>
          <textarea
            value={String(objectOptions.rubric || '')}
            onChange={(e) => updateObjectOption('rubric', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none min-h-[90px] font-medium text-sm dark:text-white"
            placeholder="Rubric notes (criteria, score split, required depth)"
          />
          <textarea
            {...register('answer_text')}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none min-h-[160px] font-bold dark:text-white"
            placeholder="Exemplar long-form response"
          />
          {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Answer Key</label>
        <textarea
          {...register('answer_text')}
          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none min-h-[120px] font-bold dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all"
          placeholder="Provide the expected solution..."
        />
        {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
      </div>
    );
  };

  // Reset options when type changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (currentQType === 'MCQ') setValue('options', defaultOptions);
    else if (currentQType === 'Match the Following') setValue('options', { pairs: defaultPairs });
    else if (currentQType === 'Assertion/Reason') setValue('options', { assertion: '', reason: '' });
    else if (currentQType === 'Case Study' || currentQType === 'Comprehension Passage') setValue('options', { passage: '' });
    else if (currentQType === 'Ordering/Sequencing') setValue('options', { items: defaultOrdering });
    else if (currentQType === 'Diagram Labeling') setValue('options', { labels: defaultLabels });
    else setValue('options', null);

    if (currentQType === 'True/False') {
      setValue('answer_text', 'True');
    } else if (currentQType === 'Match the Following') {
      setValue('answer_text', 'Pairs matched');
    } else {
      setValue('answer_text', '');
    }
  }, [currentQType, setValue]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-w-5xl mx-auto text-gray-900 dark:text-white transition-colors duration-300">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 ${isEditing ? 'bg-amber-500 shadow-amber-500/20' : 'bg-academy-600 shadow-academy-600/20'} text-white rounded-2xl shadow-xl`}>
              {isEditing ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Modify Question' : 'Author New Question'}</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mt-1">
                {isEditing ? `Revision ID: #${initialData.question_id}` : `Current Draft by ${user?.full_name}`}
              </p>
            </div>
          </div>
          <button aria-label="Close question form" onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {mutation.isError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 text-xs font-black animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save."}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Context & Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex justify-between">
                  <span>Topic Selection Flow</span>
                  {!scopedHierarchy.length && <span className="text-red-400 normal-case font-bold">No accessible curriculum found</span>}
                </label>

                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    placeholder="Quick search topic / subject / grade"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                  />
                </div>

                {topicSearch.trim() && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 max-h-44 overflow-y-auto space-y-2">
                    {filteredTopicEntries.length ? filteredTopicEntries.map((entry) => (
                      <button
                        key={`search-${entry.topic.topic_id}`}
                        type="button"
                        onClick={() => setValue('topic_id', String(entry.topic.topic_id), { shouldValidate: true, shouldDirty: true })}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${currentTopicId === entry.topic.topic_id ? 'border-academy-500 bg-academy-50 dark:bg-academy-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-academy-300'}`}
                      >
                        <p className="text-xs font-black text-gray-900 dark:text-white">{entry.topic.topic_name}</p>
                        <p className="text-[10px] font-bold text-gray-500">{entry.syllabus.syllabus_name} • G{entry.grade.grade_level} • {entry.subject.subject_name}</p>
                      </button>
                    )) : (
                      <p className="text-[10px] font-bold text-gray-500">No matching topics found.</p>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-3xl p-4 max-h-[320px] overflow-y-auto">
                  {scopedHierarchy.map((syllabus) => (
                    <div key={syllabus.syllabus_id} className="mb-3">
                      <button
                        type="button"
                        onClick={() => setExpandedSyllabus((prev) => prev.includes(syllabus.syllabus_id) ? prev.filter((id) => id !== syllabus.syllabus_id) : [...prev, syllabus.syllabus_id])}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          {expandedSyllabus.includes(syllabus.syllabus_id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <FolderRoot className="w-4 h-4 text-academy-500" />
                          <span className="text-xs font-black text-gray-700 dark:text-gray-200">{syllabus.syllabus_name}</span>
                        </div>
                      </button>

                      {expandedSyllabus.includes(syllabus.syllabus_id) && (
                        <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-2">
                          {syllabus.grades.map((grade) => (
                            <div key={grade.config_id}>
                              <button
                                type="button"
                                onClick={() => setExpandedGrade((prev) => prev.includes(grade.config_id) ? prev.filter((id) => id !== grade.config_id) : [...prev, grade.config_id])}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all"
                              >
                                <div className="flex items-center gap-2">
                                  {expandedGrade.includes(grade.config_id) ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-[11px] font-black text-gray-600 dark:text-gray-300">Grade {grade.grade_level}</span>
                                </div>
                              </button>

                              {expandedGrade.includes(grade.config_id) && (
                                <div className="ml-4 pl-3 border-l border-gray-100 dark:border-gray-800 space-y-2">
                                  {grade.subjects.map((subject) => (
                                    <div key={subject.subject_id}>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedSubject((prev) => prev.includes(subject.subject_id) ? prev.filter((id) => id !== subject.subject_id) : [...prev, subject.subject_id])}
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800"
                                      >
                                        <div className="flex items-center gap-2">
                                          {expandedSubject.includes(subject.subject_id) ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                          <span className="text-[10px] font-black text-gray-500 dark:text-gray-400">{subject.subject_name}</span>
                                        </div>
                                      </button>

                                      {expandedSubject.includes(subject.subject_id) && (
                                        <div className="ml-4 space-y-1 mt-1">
                                          {subject.topics.map((topic) => (
                                            <button
                                              key={topic.topic_id}
                                              type="button"
                                              onClick={() => setValue('topic_id', String(topic.topic_id), { shouldValidate: true, shouldDirty: true })}
                                              className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${currentTopicId === topic.topic_id ? 'bg-academy-600 border-academy-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-academy-300'}`}
                                            >
                                              {topic.topic_name}
                                            </button>
                                          ))}
                                          {!subject.topics.length && <p className="text-[10px] text-gray-400">No topics available</p>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedTopicMeta && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-900/10 px-3 py-2">
                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Selected Topic</p>
                    <p className="text-xs font-black text-gray-800 dark:text-gray-200 mt-1">{selectedTopicMeta.topic.topic_name}</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">{selectedTopicMeta.syllabus.syllabus_name} • Grade {selectedTopicMeta.grade.grade_level} • {selectedTopicMeta.subject.subject_name}</p>
                  </div>
                )}

                {selectedTopicMeta && !isRecommendedSubject && (
                  <p className="text-amber-600 text-[10px] font-bold mt-1">
                    Soft recommendation: this subject is not in the Allowed Subjects catalog.
                  </p>
                )}
                {selectedTopicMeta && isRecommendedSubject && recommendation && (
                  <p className="text-emerald-600 text-[10px] font-bold mt-1">Recommendation: {recommendation}</p>
                )}
                <input type="hidden" {...register("topic_id")} />
                {errors.topic_id && <p className="text-red-500 text-[10px] font-bold">{errors.topic_id.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Question Inquiry</label>
                <textarea 
                  {...register("question_text")}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none min-h-[140px] text-lg font-bold placeholder:text-gray-300 dark:placeholder:text-gray-700 dark:text-white transition-all"
                  placeholder="Draft your question here..."
                />
                {errors.question_text && <p className="text-red-500 text-[10px] font-bold">{errors.question_text.message as string}</p>}
              </div>

              {/* Dynamic Type Fields */}
              {renderTypeSpecificEditor()}
            </div>

            {/* Classification & Media */}
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center mb-6">Metadata</label>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      {...register("q_type")}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm dark:text-white shadow-sm"
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Workflow Status</label>
                    <select {...register("status")} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm bg-white dark:bg-gray-800 shadow-sm">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Complexity</label>
                      <select 
                        {...register("difficulty")}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm bg-white dark:bg-gray-800 shadow-sm"
                      >
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Points</label>
                      <input 
                        type="number" 
                        {...register("marks", { valueAsNumber: true })}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-black text-center text-sm dark:text-white shadow-sm" 
                        min="0" 
                        max="100" 
                      />
                      {errors.marks && <p className="text-red-500 text-[10px] font-bold">{errors.marks.message as string}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center ml-1">Visual Reference</label>
                <div onDrop={handleDrop} onDragOver={handleDragOver} className={`relative group border-2 border-dashed rounded-3xl transition-all min-h-[260px] flex items-center justify-center overflow-hidden ${currentImageUrl ? 'border-academy-500 bg-academy-50/10' : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 hover:border-academy-300'}`}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 text-academy-500 animate-spin" />
                      <p className="text-[10px] font-black text-academy-600 uppercase">Processing...</p>
                    </div>
                  ) : currentImageUrl ? (
                    <div className="relative w-full h-full p-4 animate-in fade-in zoom-in-95">
                      {/* Note: The CLI didn't finish externalizing URLs yet! */}
                      <img src={`${import.meta.env.VITE_API_BASE_URL || ''}${currentImageUrl}`} alt="Preview" className="w-full h-[220px] object-contain rounded-2xl shadow-lg" />
                      <button onClick={(e) => { e.preventDefault(); setValue('image_url', ''); }} className="absolute top-6 right-6 p-2 bg-red-600 text-white rounded-xl shadow-xl hover:bg-red-700 transition-all active:scale-90"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center p-8 group-hover:scale-105 transition-transform">
                      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-academy-500"><ImageIcon className="w-10 h-10" /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Import Diagram</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600 uppercase font-black tracking-tighter mt-1">PNG, JPG up to 50MB</p>
                      </div>
                    </div>
                  )}
                  <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" accept="image/*" disabled={uploading} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-6">
            <button type="button" onClick={() => { if (!isDirty || window.confirm('Discard unsaved changes?')) onCancel(); }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Discard Draft</button>
            <button
              type="submit"
              onClick={() => setSubmitMode('draft')}
              disabled={mutation.isPending || uploading}
              className="px-8 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 font-black text-sm transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {mutation.isPending && submitMode === 'draft' ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
              Save as Draft
            </button>
            <button 
              type="submit" 
              onClick={() => setSubmitMode('published')}
              disabled={mutation.isPending || uploading} 
              className={`px-12 py-4 rounded-2xl shadow-2xl font-black text-sm transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 ${isEditing ? 'bg-amber-600 shadow-amber-600/20' : 'bg-academy-700 shadow-academy-700/20'} text-white`}
            >
              {mutation.isPending && submitMode === 'published' ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
              {isEditing ? 'Commit + Publish' : 'Publish Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);

export default QuestionForm;