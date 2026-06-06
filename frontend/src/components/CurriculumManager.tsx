import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Book, 
  Layers, 
  FolderRoot, 
  Tag, 
  Plus, 
  Loader2,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  FileText,
  Upload,
  FileX
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import client from '../api/client';
import Modal from './Modal';
import { useAuthStore } from '../store/authStore';

interface CurriculumManagerProps {
  onAddQuestion?: (topic: { topic_id: number; topic_name: string; subject_id: number }) => void;
}

interface Topic { topic_id: number; topic_name: string; }
interface Subject { subject_id: number; subject_name: string; }
interface Grade { config_id: number; grade_level: number; pdf_url?: string | null; syllabus_id?: number; isCoordinator?: boolean; }
interface Syllabus { syllabus_id: number; syllabus_name: string; academic_year: string; pdf_url?: string | null; }


// --- Helper Components for Lazy Loading ---

const TopicNode = ({ topic, subject, canModifyTopic, onAddQuestion, openEdit, setDeleteTarget }: { topic: Topic; subject: Subject; canModifyTopic: boolean; onAddQuestion: any; openEdit: any; setDeleteTarget: any }) => {
  return (
    <div className="group/topic flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold transition-all hover:border-academy-300 dark:hover:border-academy-500 hover:shadow-sm">
      <div className="flex items-center gap-2.5">
        <Tag className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-gray-600 dark:text-gray-300 group-hover/topic:text-gray-900 dark:group-hover/topic:text-white">{topic.topic_name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); onAddQuestion?.({ ...topic, subject_id: subject.subject_id }); }} className="mr-2 text-[9px] font-black uppercase text-academy-600 dark:text-academy-400 hover:text-academy-800 dark:hover:text-academy-200 flex items-center gap-1 px-1.5 py-1 hover:bg-academy-50 dark:hover:bg-academy-900/30 rounded-md transition-all">
          <Plus className="w-3 h-3" /> Question
        </button>
        {canModifyTopic && (
          <>
            <button onClick={(e) => { e.stopPropagation(); openEdit('topic', topic); }} className="p-1.5 text-gray-300 hover:text-academy-600 rounded-md transition-colors" title="Edit Topic"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'topic', id: topic.topic_id, name: topic.topic_name}); }} className="p-1.5 text-gray-300 hover:text-red-600 rounded-md transition-colors" title="Delete Topic"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    </div>
  );
};

const SubjectNode = ({ subject, grade, isAdmin, hodSubjects, assignedSubjectIds, expanded, toggleExpand, openEdit, setDeleteTarget, onAddQuestion, openTopicModal }: { subject: Subject; grade: Grade; isAdmin: boolean; hodSubjects: string[]; assignedSubjectIds: number[]; expanded: string[]; toggleExpand: any; openEdit: any; setDeleteTarget: any; onAddQuestion: any; openTopicModal: any }) => {
  const isExpanded = expanded.includes(`sub-${subject.subject_id}`);
  const canModifySubject = isAdmin || grade.isCoordinator;
  const canModifyTopic = isAdmin || grade.isCoordinator || hodSubjects.includes(subject.subject_name) || assignedSubjectIds.includes(subject.subject_id);

  // Lazy load topics
  const { data, isLoading } = useQuery({
    queryKey: ['topics', subject.subject_id],
    queryFn: () => client.get(`/curriculum/topics/subject/${subject.subject_id}?limit=500`).then(r => r.data),
    enabled: isExpanded
  });

  const topics = data?.items || [];

  return (
    <div className="border-l border-gray-100 dark:border-gray-800 pl-4">
      <div 
        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all group/sub ${isExpanded ? 'text-academy-600 dark:text-academy-400 font-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`} 
        onClick={(e) => { e.stopPropagation(); toggleExpand(`sub-${subject.subject_id}`); }}
      >
        <div className="flex items-center gap-3">
          <Book className={`w-4 h-4 ${isExpanded ? 'text-academy-500' : 'text-gray-300'}`} />
          <span className="text-sm font-bold tracking-tight">{subject.subject_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {canModifySubject && (
              <>
                <button onClick={(e) => { e.stopPropagation(); openEdit('subject', subject); }} className="p-1 text-gray-400 hover:text-academy-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'subject', id: subject.subject_id, name: subject.subject_name}); }} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
            {canModifyTopic && (
              <button onClick={(e) => { e.stopPropagation(); openTopicModal(subject.subject_id); }} className="ml-2 text-[9px] font-black uppercase text-academy-600 dark:text-academy-400 bg-academy-50 dark:bg-academy-900/30 px-2 py-1 rounded-md hover:bg-academy-600 hover:text-white transition-all">+ Topic</button>
            )}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="ml-8 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4 animate-in slide-in-from-top-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 my-2" />
          ) : (
            <>
              {topics.map((topic: Topic) => (
                <TopicNode key={`t-${topic.topic_id}`} topic={topic} subject={subject} canModifyTopic={canModifyTopic} onAddQuestion={onAddQuestion} openEdit={openEdit} setDeleteTarget={setDeleteTarget} />
              ))}
              {topics.length === 0 && (
                <p className="col-span-full text-[10px] text-gray-400 italic py-2 ml-1">No topics defined yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const GradeNode = ({ grade, isAdmin, gradeLevels, hodSubjects, assignedSubjectIds, expanded, toggleExpand, openEdit, setDeleteTarget, onAddQuestion, triggerUpload, uploadingGradeId, removePdfMutation, openSubjectModal, openTopicModal }: { grade: Grade; isAdmin: boolean; gradeLevels: number[]; hodSubjects: string[]; assignedSubjectIds: number[]; expanded: string[]; toggleExpand: any; openEdit: any; setDeleteTarget: any; onAddQuestion: any; triggerUpload: any; uploadingGradeId: any; removePdfMutation: any; openSubjectModal: any; openTopicModal: any }) => {
  const isExpanded = expanded.includes(`g-${grade.config_id}`);
  const isCoordinator = gradeLevels.includes(grade.grade_level);
  const enrichedGrade = { ...grade, isCoordinator };

  // Lazy load subjects
  const { data, isLoading } = useQuery({
    queryKey: ['subjects', grade.config_id],
    queryFn: () => client.get(`/curriculum/subjects/${grade.config_id}?limit=500`).then(r => r.data),
    enabled: isExpanded
  });

  const subjects = useMemo(() => {
    const rawSubjects = data?.items || [];
    if (isAdmin) return rawSubjects;
    return rawSubjects.filter((subject: Subject) => {
      if (isCoordinator) return true;
      if (hodSubjects.includes(subject.subject_name)) return true;
      return assignedSubjectIds.includes(subject.subject_id);
    });
  }, [data, isAdmin, isCoordinator, hodSubjects, assignedSubjectIds]);

  return (
    <div className="border-l-2 border-gray-100 dark:border-gray-800 pl-4">
      <div 
        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all group/grade ${isExpanded ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700' : 'hover:bg-white dark:hover:bg-gray-800/50'}`} 
        onClick={(e) => { e.stopPropagation(); toggleExpand(`g-${grade.config_id}`); }}
      >
        <div className="flex items-center gap-3">
          <Layers className={`w-4 h-4 ${isExpanded ? 'text-amber-500' : 'text-gray-300'}`} />
          <span className="font-black text-xs uppercase tracking-widest text-gray-700 dark:text-gray-300">{getGradeName(grade.grade_level)}</span>
          {grade.pdf_url && (
            <a href={`${import.meta.env.VITE_API_BASE_URL || ''}${grade.pdf_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 text-academy-600 dark:text-academy-400 hover:bg-academy-100 dark:hover:bg-academy-900/50 rounded-lg transition-colors" title="View Grade PDF">
              <FileText className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <button onClick={(e) => { e.stopPropagation(); triggerUpload(grade.config_id); }} className="p-1.5 text-gray-400 hover:text-academy-600 transition-colors" title="Upload Grade PDF">
                  {uploadingGradeId === grade.config_id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-academy-500" /> : <Upload className="w-3.5 h-3.5" />}
                </button>
                {grade.pdf_url && (
                  <button onClick={(e) => { e.stopPropagation(); removePdfMutation.mutate(grade.config_id); }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Remove Grade PDF">
                    {removePdfMutation.isPending && removePdfMutation.variables === grade.config_id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <FileX className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); openEdit('grade', grade); }} className="p-1.5 text-gray-400 hover:text-academy-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'grade', id: grade.config_id, name: getGradeName(grade.grade_level)}); }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
            {(isAdmin || isCoordinator) && (
              <button onClick={(e) => { e.stopPropagation(); openSubjectModal(grade.config_id); }} className="ml-2 text-[10px] font-black uppercase text-academy-600 dark:text-academy-400 border border-academy-100 dark:border-academy-800 px-2 py-1 rounded-lg hover:bg-academy-600 hover:text-white transition-all">+ Subject</button>
            )}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="ml-8 mt-3 space-y-2 animate-in slide-in-from-top-1 duration-150">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 my-2" />
          ) : (
            <>
              {subjects.map((subject: Subject) => (
                <SubjectNode 
                  key={`sub-${subject.subject_id}`} 
                  subject={subject} 
                  grade={enrichedGrade}
                  isAdmin={isAdmin}
                  hodSubjects={hodSubjects}
                  assignedSubjectIds={assignedSubjectIds}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  openEdit={openEdit}
                  setDeleteTarget={setDeleteTarget}
                  onAddQuestion={onAddQuestion}
                  openTopicModal={openTopicModal}
                />
              ))}
              {subjects.length === 0 && (
                <p className="text-[10px] text-gray-400 italic py-1 ml-4">No subjects accessible or registered.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SyllabusNode = ({ syllabus, isAdmin, gradeLevels, hodSubjects, assignedSubjectIds, expanded, toggleExpand, openEdit, setDeleteTarget, onAddQuestion, triggerUpload, uploadingGradeId, removePdfMutation, openGradeModal, openSubjectModal, openTopicModal }: { syllabus: Syllabus; isAdmin: boolean; gradeLevels: number[]; hodSubjects: string[]; assignedSubjectIds: number[]; expanded: string[]; toggleExpand: any; openEdit: any; setDeleteTarget: any; onAddQuestion: any; triggerUpload: any; uploadingGradeId: any; removePdfMutation: any; openGradeModal: any; openSubjectModal: any; openTopicModal: any }) => {
  const isExpanded = expanded.includes(`s-${syllabus.syllabus_id}`);

  // Lazy load grades
  const { data, isLoading } = useQuery({
    queryKey: ['grades', syllabus.syllabus_id],
    queryFn: () => client.get(`/curriculum/grades/${syllabus.syllabus_id}?limit=100`).then(r => r.data),
    enabled: isExpanded
  });

  const grades = data?.items || [];

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md bg-white dark:bg-gray-800">
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer group transition-colors ${isExpanded ? 'bg-academy-50/30 dark:bg-academy-900/10 border-b border-gray-50 dark:border-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`} 
        onClick={() => toggleExpand(`s-${syllabus.syllabus_id}`)}
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-academy-100 dark:bg-academy-900/50 text-academy-700 dark:text-academy-400 rounded-xl transition-transform group-hover:scale-110">
            <FolderRoot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 dark:text-white tracking-tight">{syllabus.syllabus_name}</h3>
              {syllabus.pdf_url && (
                <a href={`${import.meta.env.VITE_API_BASE_URL || ''}${syllabus.pdf_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 text-academy-600 dark:text-academy-400 hover:bg-academy-100 dark:hover:bg-academy-900/50 rounded-lg transition-colors" title="View Syllabus PDF">
                  <FileText className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">{syllabus.academic_year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            {isAdmin && (
              <>
                <button onClick={(e) => { e.stopPropagation(); openEdit('syllabus', syllabus); }} className="p-2 hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-academy-600 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({type:'syllabus', id: syllabus.syllabus_id, name: syllabus.syllabus_name}); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); openGradeModal(syllabus.syllabus_id); }} className="ml-2 bg-academy-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">Add Grade</button>
              </>
            )}
          </div>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50/30 dark:bg-gray-900/10 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 my-2 mx-auto" />
          ) : (
            <>
              {grades.map((grade: Grade) => (
                <GradeNode 
                  key={`g-${grade.config_id}`} 
                  grade={grade}
                  isAdmin={isAdmin}
                  gradeLevels={gradeLevels}
                  hodSubjects={hodSubjects}
                  assignedSubjectIds={assignedSubjectIds}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  openEdit={openEdit}
                  setDeleteTarget={setDeleteTarget}
                  onAddQuestion={onAddQuestion}
                  triggerUpload={triggerUpload}
                  uploadingGradeId={uploadingGradeId}
                  removePdfMutation={removePdfMutation}
                  openSubjectModal={openSubjectModal}
                  openTopicModal={openTopicModal}
                />
              ))}
              {grades.length === 0 && (
                <p className="text-[10px] text-gray-400 italic py-2">No grade levels added to this syllabus.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Manager Component ---

const CurriculumManager: React.FC<CurriculumManagerProps> = ({ onAddQuestion }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Persistence for expanded state
  const [expanded, setExpanded] = useState<string[]>(() => {
    const saved = localStorage.getItem('curriculum-expanded');
    return saved ? JSON.parse(saved) : [];
  });

  const saveExpanded = (newExpanded: string[]) => {
    setExpanded(newExpanded);
    localStorage.setItem('curriculum-expanded', JSON.stringify(newExpanded));
  };

  const [uploadingGradeId, setUploadingGradeId] = useState<number | null>(null);
  
  // 1. Get Identity
  const { user } = useAuthStore();

  const isAdmin = user?.is_admin || false;
  const assignedSubjectIds = user?.subjects?.map((s: { subject_id: number }) => s.subject_id) || [];
  const gradeLevels = user?.grade_levels || [];
  const hodSubjects = user?.hod_subject_names || [];

  // Fetch Allowed Subjects for subject creation dropdown
  const { data: allowedSubjectsData } = useQuery({
    queryKey: ['allowed-subjects-active'],
    queryFn: () => client.get('/allowed-subjects/?active_only=true&limit=500').then(r => r.data),
  });
  const allowedSubjects = allowedSubjectsData?.items || [];

  // Fetch Allowed Grades for grade creation dropdown
  const { data: allowedGradesData } = useQuery({
    queryKey: ['allowed-grades-active'],
    queryFn: () => client.get('/allowed-grades/?active_only=true&limit=500').then(r => r.data),
  });
  const allowedGrades = allowedGradesData?.items || [];

  const getGradeName = (gradeId: number) => {
    const grade = allowedGrades.find((g: { allowed_grade_id: number; grade_name: string }) => g.allowed_grade_id === gradeId);
    return grade ? grade.grade_name : `Grade ${gradeId}`;
  };

  // Modal State
  const [modalType, setModalType] = useState<'syllabus' | 'grade' | 'subject' | 'topic' | null>(null);
  const [modalData, setModalData] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{type: string, id: number, name: string} | null>(null);

  // FETCH ROOT SYLLABUSES ONLY
  const { data: syllabusesData, isLoading, isRefetching } = useQuery({
    queryKey: ['syllabuses'],
    queryFn: async () => {
      const res = await client.get('/curriculum/syllabuses?limit=500');
      return res.data;
    }
  });

  const syllabuses = useMemo(() => syllabusesData?.items || [], [syllabusesData?.items]);

  const validExpandedIds = useMemo(() => {
    const ids = new Set<string>();
    syllabuses.forEach((s: Syllabus) => ids.add(`s-${s.syllabus_id}`));
    return ids;
  }, [syllabuses]);

  React.useEffect(() => {
    const cleaned = expanded.filter(id => {
      if (id.startsWith('s-')) return validExpandedIds.has(id);
      return true;
    });
    if (cleaned.length !== expanded.length) {
      saveExpanded(cleaned);
    }
  }, [expanded, validExpandedIds]);

  const toggleExpand = (id: string) => {
    saveExpanded(expanded.includes(id) ? expanded.filter(i => i !== id) : [...expanded, id]);
  };

  // Mutations
  const mutation = useMutation({
    mutationFn: async ({ method, endpoint, payload }: { method: string, endpoint: string, payload: unknown }) => {
      const clientAny = client as unknown as Record<string, (url: string, data?: unknown) => Promise<{ data: unknown }>>;
      const res = await clientAny[method](endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      if (modalType === 'syllabus') {
        queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
      } else if (modalType === 'grade') {
        queryClient.invalidateQueries({ queryKey: ['grades', modalData.parentId] });
      } else if (modalType === 'subject') {
        queryClient.invalidateQueries({ queryKey: ['subjects', modalData.parentId] });
      } else if (modalType === 'topic') {
        queryClient.invalidateQueries({ queryKey: ['topics', modalData.parentId] });
      }
      setModalType(null);
      setModalData({});
      setIsEditing(false);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'An unexpected error occurred.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (url: string) => client.delete(url),
    onSuccess: () => {
      if (deleteTarget?.type === 'syllabus') {
        queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
      } else if (deleteTarget?.type === 'grade') {
        queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
      } else if (deleteTarget?.type === 'subject') {
        queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
      } else if (deleteTarget?.type === 'topic') {
        queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
      }
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Delete operation failed.");
    }
  });

  const removePdfMutation = useMutation({
    mutationFn: async (gradeId: number) => {
      return client.patch(`/curriculum/grades/${gradeId}`, { pdf_url: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to remove PDF");
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ gradeId, file }: { gradeId: number, file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await client.post('/curriculum/upload-pdf', formData, {
        onUploadProgress: () => {
          // Progress hook intentionally kept empty for future visual indicator.
        }
      });
      return client.patch(`/curriculum/grades/${gradeId}`, { pdf_url: uploadRes.data.pdf_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabuses'] });
      setUploadingGradeId(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Upload failed");
    }
  });

  const triggerUpload = (id: number) => {
    setUploadingGradeId(id);
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingGradeId) {
      uploadMutation.mutate({ gradeId: uploadingGradeId, file });
    }
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let endpoint = '';
    let payload = {};
    const method = isEditing ? 'patch' : 'post';

    switch (modalType) {
      case 'syllabus':
        endpoint = `/curriculum/syllabuses${isEditing ? `/${modalData.id}` : ''}`;
        payload = { syllabus_name: modalData.name, academic_year: modalData.year };
        break;
      case 'grade':
        endpoint = `/curriculum/grades${isEditing ? `/${modalData.id}` : ''}`;
        payload = { syllabus_id: modalData.parentId, grade_level: parseInt(modalData.level) };
        break;
      case 'subject':
        endpoint = `/curriculum/subjects${isEditing ? `/${modalData.id}` : ''}`;
        if (isEditing) {
          payload = { subject_name: modalData.name };
        } else {
          payload = { config_id: modalData.parentId, subject_name: modalData.name, allowed_subject_id: modalData.allowedSubjectId };
        }
        break;
      case 'topic':
        endpoint = `/curriculum/topics${isEditing ? `/${modalData.id}` : ''}`;
        payload = { subject_id: modalData.parentId, topic_name: modalData.name };
        break;
    }

    mutation.mutate({ method, endpoint, payload });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    let url = '';
    if (deleteTarget.type === 'syllabus') url = `/curriculum/syllabuses/${deleteTarget.id}`;
    if (deleteTarget.type === 'grade') url = `/curriculum/grades/${deleteTarget.id}`;
    if (deleteTarget.type === 'subject') url = `/curriculum/subjects/${deleteTarget.id}`;
    if (deleteTarget.type === 'topic') url = `/curriculum/topics/${deleteTarget.id}`;
    deleteMutation.mutate(url);
  };

  const openEdit = (type: 'syllabus' | 'grade' | 'subject' | 'topic', item: Record<string, unknown>) => {
    setIsEditing(true);
    setModalType(type);
    setError('');
    if (type === 'syllabus') setModalData({ id: item.syllabus_id, name: item.syllabus_name, year: item.academic_year });
    if (type === 'grade') setModalData({ id: item.config_id, level: item.grade_level, parentId: item.syllabus_id });
    if (type === 'subject') setModalData({ id: item.subject_id, name: item.subject_name, parentId: item.config_id });
    if (type === 'topic') setModalData({ id: item.topic_id, name: item.topic_name, parentId: item.subject_id });
  };

  const openGradeModal = (parentId: number) => { setModalType('grade'); setModalData({ parentId }); setIsEditing(false); };
  const openSubjectModal = (parentId: number) => { setModalType('subject'); setModalData({ parentId }); setIsEditing(false); };
  const openTopicModal = (parentId: number) => { setModalType('topic'); setModalData({ parentId }); setIsEditing(false); };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-academy-500" />
        <p className="font-medium animate-pulse">Loading curriculum structure...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />

      <div className="flex items-center justify-between mb-8 text-gray-900 dark:text-white">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">{isAdmin ? 'Curriculum Manager' : 'My Academic Scope'}</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{isAdmin ? "Architect and manage the school's educational hierarchy." : "View and manage content for your assigned curriculum segments."}</p>
        </div>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['syllabuses'] })} 
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 text-academy-600 dark:text-academy-400 hover:bg-academy-50 dark:hover:bg-academy-900/30 rounded-xl transition-all font-bold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} /> Sync Data
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Organizational Blueprint</span>
          {isAdmin && (
            <button 
              onClick={() => { setModalType('syllabus'); setModalData({}); setIsEditing(false); setError(''); }} 
              className="bg-academy-600 hover:bg-academy-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-academy-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Define Syllabus
            </button>
          )}
        </div>

        <div className="p-6 space-y-4 min-h-[200px]">
          {syllabuses.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-700"><FolderRoot className="w-8 h-8" /></div>
              <p className="text-gray-400 dark:text-gray-600 font-medium italic">{isAdmin ? "The curriculum is currently empty. Start by defining a syllabus." : "No assigned subjects or grades found."}</p>
            </div>
          ) : (
            syllabuses.map((syllabus: Syllabus) => (
              <SyllabusNode 
                key={`s-${syllabus.syllabus_id}`} 
                syllabus={syllabus}
                isAdmin={isAdmin}
                gradeLevels={gradeLevels}
                hodSubjects={hodSubjects}
                assignedSubjectIds={assignedSubjectIds}
                expanded={expanded}
                toggleExpand={toggleExpand}
                openEdit={openEdit}
                setDeleteTarget={setDeleteTarget}
                onAddQuestion={onAddQuestion}
                triggerUpload={triggerUpload}
                uploadingGradeId={uploadingGradeId}
                removePdfMutation={removePdfMutation}
                openGradeModal={openGradeModal}
                openSubjectModal={openSubjectModal}
                openTopicModal={openTopicModal}
              />
            ))
          )}
        </div>
      </div>

      <Modal isOpen={modalType !== null} onClose={() => setModalType(null)} title={`${isEditing ? 'Refine' : 'Add'} ${modalType?.charAt(0).toUpperCase()}${modalType?.slice(1)}`}>
        <form onSubmit={handleCreateOrUpdate} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {modalType === 'syllabus' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Syllabus Name</label>
                  <input required autoFocus className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 font-bold dark:text-white transition-all" placeholder="e.g. CBSE Primary" value={modalData.name || ''} onChange={e => setModalData({...modalData, name: e.target.value})} maxLength={50} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Year</label>
                  <input required className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 font-bold dark:text-white transition-all" placeholder="e.g. 2025-26" value={modalData.year || ''} onChange={e => setModalData({...modalData, year: e.target.value})} maxLength={15} />
                </div>
              </>
            )}
            {modalType === 'grade' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grade (from Allowed Grades)</label>
                <select
                  required
                  autoFocus
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 font-bold dark:text-white transition-all"
                  value={modalData.level || ''}
                  onChange={e => setModalData({...modalData, level: e.target.value})}
                  disabled={isEditing}
                >
                  <option value="" disabled>Select a grade...</option>
                  {allowedGrades.map((g: { allowed_grade_id: number; grade_name: string }) => (
                    <option key={g.allowed_grade_id} value={g.allowed_grade_id}>{g.grade_name}</option>
                  ))}
                </select>
              </div>
            )}
            {modalType === 'subject' && !isEditing && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject (from Allowed Subjects)</label>
                <select
                  required
                  autoFocus
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 font-bold dark:text-white transition-all"
                  value={modalData.allowedSubjectId || ''}
                  onChange={e => {
                    const selected = allowedSubjects.find((s: { allowed_subject_id: number; subject_name: string }) => s.allowed_subject_id === parseInt(e.target.value));
                    setModalData({...modalData, allowedSubjectId: parseInt(e.target.value), name: selected?.subject_name || ''});
                  }}
                >
                  <option value="" disabled>Select a subject...</option>
                  {allowedSubjects.map((s: { allowed_subject_id: number; subject_name: string }) => (
                    <option key={s.allowed_subject_id} value={s.allowed_subject_id}>{s.subject_name}</option>
                  ))}
                </select>
                {allowedSubjects.length === 0 && (
                  <p className="text-[10px] text-amber-500 font-medium ml-1">No allowed subjects registered. An admin must add them first.</p>
                )}
              </div>
            )}
            {((modalType === 'subject' && isEditing) || modalType === 'topic') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{modalType} Name</label>
                <input required autoFocus className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 font-bold dark:text-white transition-all" placeholder={`Enter ${modalType} name...`} value={modalData.name || ''} onChange={e => setModalData({...modalData, name: e.target.value})} maxLength={60} />
              </div>
            )}
          </div>

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={() => setModalType(null)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Discard</button>
            <button 
              type="submit" 
              disabled={mutation.isPending} 
              className="flex-[2] bg-academy-700 hover:bg-academy-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-academy-700/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isEditing ? 'Commit Update' : `Create ${modalType?.charAt(0).toUpperCase()}${modalType?.slice(1)}`}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Destructive Action">
        <div className="space-y-8 text-center pt-2">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto border-4 border-red-100 dark:border-red-900/30 shadow-inner group">
            <Trash2 className="w-12 h-12 transition-transform group-hover:rotate-12" />
          </div>
          <div className="space-y-3">
            <h4 className="text-2xl font-black text-gray-900 dark:text-white">Delete "{deleteTarget?.name}"?</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 px-6 font-medium leading-relaxed">This will permanently purge this item and all associated nested content. This action is irreversible.</p>
          </div>
          <div className="flex gap-4 px-2">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 text-gray-400 font-black text-xs uppercase tracking-widest">Retain Data</button>
            <button 
              onClick={handleDelete} 
              disabled={deleteMutation.isPending}
              className="flex-[2] py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-2xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Wipe Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Simple Save icon since it was missing in imports but used in UI
const Save = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);

export default CurriculumManager;
