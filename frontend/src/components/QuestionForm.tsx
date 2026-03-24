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
  Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

interface QuestionFormProps {
  initialData?: {
    question_id?: number;
    topic_id?: number;
    topic?: { subject_id: number };
    question_text?: string;
    answer_text?: string;
    image_url?: string;
    marks?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    q_type?: 'MCQ' | 'True/False' | 'Match the Following' | 'Short Answer' | 'Long Answer';
    options?: QuestionOptions;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

type MatchPair = { left: string; right: string };
type MCQOptions = { A: string; B: string; C: string; D: string };
type MatchOptions = { pairs: MatchPair[] };
type QuestionOptions = MCQOptions | MatchOptions | null;

interface HierarchyTopic {
  topic_id: number;
  topic_name: string;
}

interface HierarchySubject {
  subject_id: number;
  subject_name: string;
  topics: HierarchyTopic[];
  display?: string;
}

interface HierarchyGrade {
  grade_level: number;
  subjects: HierarchySubject[];
}

interface HierarchySyllabus {
  syllabus_name: string;
  grades: HierarchyGrade[];
}

// --- VALIDATION SCHEMA ---
const questionSchema = z.object({
  topic_id: z.string().min(1, "Topic selection is required"),
  question_text: z.string().min(1, "Question text cannot be empty").max(1000, "Max 1000 characters"),
  answer_text: z.string().min(1, "Answer/solution is required"),
  image_url: z.string().optional(),
  marks: z.number().min(0, "Marks cannot be negative"),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  q_type: z.enum(['MCQ', 'True/False', 'Match the Following', 'Short Answer', 'Long Answer']),
  options: z.union([
    z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
    z.object({ pairs: z.array(z.object({ left: z.string(), right: z.string() })) }),
    z.null(),
  ]).optional()
}).superRefine((data, ctx) => {
  if (data.q_type === 'MCQ') {
    const opts = data.options || {};
    if (!opts.A?.trim() || !opts.B?.trim() || !opts.C?.trim() || !opts.D?.trim()) {
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
    const pairs = data.options?.pairs || [];
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
});

type QuestionFormData = z.infer<typeof questionSchema>;

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { user } = useAuthStore();
  const { defaultMarks, defaultDifficulty } = useSettingsStore();
  
  const isEditing = !!initialData?.question_id;
  const isFirstRender = useRef(true);

  const defaultOptions = { A: '', B: '', C: '', D: '' };
  const defaultPairs = [{ left: '', right: '' }, { left: '', right: '' }];

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      topic_id: initialData?.topic_id?.toString() || '',
      question_text: initialData?.question_text || '',
      answer_text: initialData?.answer_text || '',
      image_url: initialData?.image_url || '',
      marks: initialData?.marks !== undefined ? initialData.marks : defaultMarks,
      difficulty: initialData?.difficulty || defaultDifficulty,
      q_type: initialData?.q_type || 'MCQ',
      options: initialData ? initialData.options : (initialData?.q_type === 'Match the Following' ? { pairs: defaultPairs } : defaultOptions)
    }
  });

  const currentQType = watch('q_type');
  const currentOptions = watch('options');
  const currentAnswer = watch('answer_text');
  const currentImageUrl = watch('image_url');

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialData?.topic?.subject_id?.toString() || ''
  );

  const { data: rawHierarchy = [] } = useQuery<HierarchySyllabus[]>({
    queryKey: ['curriculum-hierarchy'],
    queryFn: () => client.get('/curriculum/hierarchy').then(r => r.data)
  });

  // Derived available subjects and topics
  const availableSubjects = useMemo(() => {
    const subjects: HierarchySubject[] = [];
    rawHierarchy.forEach((s) => {
      s.grades.forEach((g) => {
        const isCoord = user?.is_admin || user?.grade_levels?.includes(g.grade_level);
        g.subjects.forEach((sub) => {
          if (isCoord || user?.subjects?.some((as) => as.subject_id === sub.subject_id) || user?.hod_subject_names?.includes(sub.subject_name)) {
            subjects.push({ ...sub, display: `${s.syllabus_name} • G${g.grade_level} • ${sub.subject_name}` });
          }
        });
      });
    });
    return subjects;
  }, [user, rawHierarchy]);

  const availableTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    const sub = availableSubjects.find(s => s.subject_id === parseInt(selectedSubjectId));
    return sub?.topics || [];
  }, [selectedSubjectId, availableSubjects]);

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
    const currentPairs = currentOptions?.pairs || [];
    setValue('options', { pairs: [...currentPairs, { left: '', right: '' }] });
  };

  const removePair = (index: number) => {
    const currentPairs = currentOptions?.pairs || [];
    setValue('options', { pairs: currentPairs.filter((_: MatchPair, i: number) => i !== index) });
  };

  const handlePairChange = (index: number, field: 'left' | 'right', val: string) => {
    const newPairs = [...(currentOptions?.pairs || [])];
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
    } catch (err: unknown) {
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

  const onSubmit = (data: QuestionFormData) => {
    mutation.mutate(data);
  };

  // Reset options when type changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (currentQType === 'MCQ') setValue('options', defaultOptions);
    else if (currentQType === 'Match the Following') setValue('options', { pairs: defaultPairs });
    else setValue('options', null);
    
    // Clear answer if type changes (except for types that don't need explicit answer text in UI logic)
    if (currentQType !== 'Match the Following') setValue('answer_text', '');
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
            {(mutation.error as any)?.response?.data?.detail || "Failed to save."}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Context & Content */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex justify-between">
                    <span>Curriculum Hub</span>
                    {!availableSubjects.length && <span className="text-red-400 normal-case font-bold">No assigned subjects found</span>}
                  </label>
                  <div className="relative group">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600" />
                    <select 
                      value={selectedSubjectId}
                      onChange={(e) => { 
                        setSelectedSubjectId(e.target.value); 
                        setValue('topic_id', ''); 
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                    >
                      <option value="">Select Subject</option>
                      {availableSubjects.map((s) => (
                        <option key={s.subject_id} value={s.subject_id}>{s.display}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Specific Topic</label>
                  <div className="relative group">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600" />
                    <select 
                      disabled={!selectedSubjectId || !availableTopics.length}
                      {...register("topic_id")}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white disabled:opacity-50 transition-all"
                    >
                      <option value="">{selectedSubjectId ? (availableTopics.length ? 'Choose Topic' : 'No topics in this subject') : 'Choose Topic'}</option>
                      {availableTopics.map((t) => (
                        <option key={t.topic_id} value={t.topic_id}>{t.topic_name}</option>
                      ))}
                    </select>
                  </div>
                  {errors.topic_id && <p className="text-red-500 text-[10px] font-bold">{errors.topic_id.message as string}</p>}
                </div>
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
              {currentQType === 'MCQ' ? (
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
                          value={currentOptions?.[key] || ''}
                          onChange={(e) => setValue('options', { ...currentOptions, [key]: e.target.value })}
                          className={`w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl outline-none focus:ring-4 focus:ring-academy-500/10 transition-all font-bold text-sm dark:text-white ${currentAnswer === key ? 'border-academy-500 bg-white dark:bg-gray-800 shadow-sm' : 'border-gray-200 dark:border-gray-700'}`}
                          placeholder={`Choice ${key}...`}
                        />
                        <button 
                          type="button"
                          onClick={() => setValue('answer_text', key)}
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
              ) : currentQType === 'True/False' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Correct Assertion</label>
                  <div className="flex gap-4">
                    {['True', 'False'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setValue('answer_text', val)}
                        className={`flex-1 py-6 rounded-2xl border-2 font-black text-lg transition-all flex flex-col items-center gap-2
                          ${currentAnswer === val 
                            ? 'bg-academy-600 border-academy-600 text-white shadow-xl shadow-academy-600/20' 
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-academy-300 hover:text-gray-600 dark:hover:text-gray-300'}`}
                      >
                        <CheckCircle2 className={`w-6 h-6 ${currentAnswer === val ? 'opacity-100 scale-110' : 'opacity-0 scale-50'} transition-all`} />
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ) : currentQType === 'Match the Following' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Logic Pairs</label>
                    <button type="button" onClick={addPair} className="flex items-center gap-1.5 text-[10px] font-black text-academy-600 dark:text-academy-400 uppercase hover:underline transition-all">
                      <Plus className="w-3.5 h-3.5" /> Extend Pairs
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {(currentOptions && 'pairs' in currentOptions ? currentOptions.pairs : []).map((pair: MatchPair, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left-2">
                        <div className="flex-1">
                          <input type="text" value={pair.left} onChange={(e) => handlePairChange(idx, 'left', e.target.value)} placeholder="Term" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 font-bold text-sm dark:text-white" />
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
                        <div className="flex-1">
                          <input type="text" value={pair.right} onChange={(e) => handlePairChange(idx, 'right', e.target.value)} placeholder="Relation" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 font-bold text-sm dark:text-white" />
                        </div>
                        {currentOptions && 'pairs' in currentOptions && currentOptions.pairs.length > 2 && (
                          <button type="button" onClick={() => removePair(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.options && <p className="text-red-500 text-[10px] font-bold">{errors.options.message as string}</p>}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Answer Key</label>
                  <textarea 
                    {...register("answer_text")}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none min-h-[120px] font-bold dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all"
                    placeholder="Provide the expected solution..."
                  />
                  {errors.answer_text && <p className="text-red-500 text-[10px] font-bold">{errors.answer_text.message as string}</p>}
                </div>
              )}
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
                      <option value="MCQ">Multiple Choice</option>
                      <option value="True/False">True / False</option>
                      <option value="Match the Following">Match the Following</option>
                      <option value="Short Answer">Short Answer</option>
                      <option value="Long Answer">Long Answer</option>
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
              disabled={mutation.isPending || uploading} 
              className={`px-12 py-4 rounded-2xl shadow-2xl font-black text-sm transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 ${isEditing ? 'bg-amber-600 shadow-amber-600/20' : 'bg-academy-700 shadow-academy-700/20'} text-white`}
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
              {isEditing ? 'Commit Revisions' : 'Finalize Question'}
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