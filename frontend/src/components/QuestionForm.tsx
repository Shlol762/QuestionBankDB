import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  AlertCircle,
  Plus,
  CheckCircle2,
  BookOpen,
  Tag,
  Pencil
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

interface QuestionFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface QuestionFormData {
  topic_id: string;
  question_text: string;
  answer_text: string;
  image_url: string;
  marks: number;
  difficulty: string;
  q_type: string;
  options: Record<string, string>;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialData?.topic?.subject_id?.toString() || ''
  );
  
  const isEditing = !!initialData;

  const defaultOptions = { A: '', B: '', C: '', D: '' };

  // Form State
  const [formData, setFormData] = useState<QuestionFormData>({
    topic_id: initialData?.topic_id?.toString() || '',
    question_text: initialData?.question_text || '',
    answer_text: initialData?.answer_text || '',
    image_url: initialData?.image_url || '',
    marks: initialData?.marks || 5,
    difficulty: initialData?.difficulty || 'Medium',
    q_type: initialData?.q_type || 'MCQ',
    options: initialData?.options || defaultOptions
  });

  // Keep state in sync if initialData changes
  useEffect(() => {
    if (initialData) {
      setSelectedSubjectId(initialData.topic?.subject_id?.toString() || '');
      setFormData({
        topic_id: initialData.topic_id?.toString() || '',
        question_text: initialData.question_text || '',
        answer_text: initialData.answer_text || '',
        image_url: initialData.image_url || '',
        marks: initialData.marks || 5,
        difficulty: initialData.difficulty || 'Medium',
        q_type: initialData.q_type || 'MCQ',
        options: initialData.options || defaultOptions
      });
    }
  }, [initialData]);

  // 1. Get current user
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get('/auth/me').then(r => r.data)
  });

  // 2. Get full hierarchy
  const { data: rawHierarchy = [] } = useQuery({
    queryKey: ['curriculum-hierarchy'],
    queryFn: () => client.get('/curriculum/hierarchy').then(r => r.data)
  });

  // 3. Extract subjects based on role
  const availableSubjects = useMemo(() => {
    if (user?.is_admin) {
      const subjects: any[] = [];
      rawHierarchy.forEach((s: any) => {
        s.grades.forEach((g: any) => {
          g.subjects.forEach((sub: any) => {
            subjects.push({ ...sub, display: `${s.syllabus_name} - G${g.grade_level} - ${sub.subject_name}` });
          });
        });
      });
      return subjects;
    } else {
      return user?.subjects?.map((s: any) => ({ ...s, display: s.subject_name })) || [];
    }
  }, [user, rawHierarchy]);

  // 4. Extract topics for selected subject
  const availableTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    let foundTopics: any[] = [];
    rawHierarchy.forEach((s: any) => {
      s.grades.forEach((g: any) => {
        const sub = g.subjects.find((sub: any) => sub.subject_id === parseInt(selectedSubjectId));
        if (sub) foundTopics = sub.topics || [];
      });
    });
    return foundTopics;
  }, [selectedSubjectId, rawHierarchy]);

  const handleOptionChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      options: { ...formData.options, [key]: value }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const uploadData = new FormData();
    uploadData.append('file', file);
    try {
      const res = await client.post('/questions/upload-image', uploadData);
      setFormData({ ...formData, image_url: res.data.image_url });
    } catch (err) {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.topic_id) {
      setError("Please select a topic");
      return;
    }
    
    if (formData.q_type === 'MCQ') {
      const emptyOptions = Object.values(formData.options).some(v => !String(v).trim());
      if (emptyOptions) {
        setError("Please fill all 4 options for MCQ");
        return;
      }
      if (!formData.answer_text) {
        setError("Please select which option is correct");
        return;
      }
    }

    if (formData.q_type === 'True/False' && !formData.answer_text) {
      setError("Please select whether the statement is True or False");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        topic_id: parseInt(formData.topic_id),
        marks: parseInt(formData.marks.toString()),
        options: formData.q_type === 'MCQ' ? formData.options : null
      };

      if (isEditing) {
        await client.patch(`/questions/${initialData.question_id}`, payload);
      } else {
        await client.post('/questions/', payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-w-5xl mx-auto text-gray-900 font-sans">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isEditing ? 'bg-amber-500' : 'bg-academy-600'} text-white rounded-xl shadow-lg shadow-academy-600/20`}>
              {isEditing ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Refine Question' : 'Compose Question'}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Author: {isEditing ? initialData.teacher?.full_name : user?.full_name}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left: Context & Content */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">1. Select Subject</label>
                  <div className="relative group">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600" />
                    <select 
                      value={selectedSubjectId}
                      onChange={(e) => { setSelectedSubjectId(e.target.value); setFormData({...formData, topic_id: '', answer_text: ''}); }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none font-bold"
                      required
                    >
                      <option value="">Choose Subject...</option>
                      {availableSubjects.map((s: any) => (
                        <option key={s.subject_id} value={s.subject_id}>{s.display || s.subject_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">2. Select Topic</label>
                  <div className="relative group">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600" />
                    <select 
                      disabled={!selectedSubjectId}
                      value={formData.topic_id}
                      onChange={(e) => setFormData({...formData, topic_id: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none font-bold disabled:opacity-50"
                      required
                    >
                      <option value="">Choose Topic...</option>
                      {availableTopics.map((t: any) => (
                        <option key={t.topic_id} value={t.topic_id}>{t.topic_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Question Text</label>
                <textarea 
                  value={formData.question_text}
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-academy-500 outline-none min-h-[120px] text-lg font-bold placeholder:text-gray-300"
                  placeholder="What is the question?"
                  required
                />
              </div>

              {/* Dynamic Content based on Type */}
              {formData.q_type === 'MCQ' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Multiple Choice Options</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D'].map((key) => (
                      <div key={key} className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg font-black text-xs transition-colors ${formData.answer_text === key ? 'bg-academy-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {key}
                        </span>
                        <input 
                          type="text"
                          value={formData.options[key]}
                          onChange={(e) => handleOptionChange(key, e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-academy-500 transition-all font-bold ${formData.answer_text === key ? 'border-academy-500 ring-1 ring-academy-500 bg-white' : 'border-gray-200'}`}
                          placeholder={`Option ${key}...`}
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, answer_text: key})}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${formData.answer_text === key ? 'text-academy-600' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : formData.q_type === 'True/False' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest text-center">Correct Answer Selection</label>
                  <div className="flex gap-4">
                    {['True', 'False'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({...formData, answer_text: val})}
                        className={`flex-1 py-6 rounded-2xl border-2 font-black text-lg transition-all flex flex-col items-center gap-2
                          ${formData.answer_text === val 
                            ? 'bg-academy-600 border-academy-600 text-white shadow-xl shadow-academy-600/20' 
                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-academy-300 hover:text-gray-600'}`}
                      >
                        <CheckCircle2 className={`w-6 h-6 ${formData.answer_text === val ? 'opacity-100 scale-110' : 'opacity-0 scale-50'} transition-all`} />
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Correct Solution / Answer Key</label>
                  <textarea 
                    value={formData.answer_text}
                    onChange={(e) => setFormData({...formData, answer_text: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-academy-500 outline-none min-h-[100px] font-bold placeholder:text-gray-300"
                    placeholder="Provide the answer here..."
                    required
                  />
                </div>
              )}
            </div>

            {/* Right: Meta & Media */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-1 tracking-widest text-center">Classification</label>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <select 
                      value={formData.q_type}
                      onChange={(e) => setFormData({...formData, q_type: e.target.value, answer_text: ''})}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none font-bold"
                    >
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="True/False">True / False</option>
                      <option value="Short Answer">Short Answer</option>
                      <option value="Long Answer">Long Answer</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={formData.difficulty}
                      onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl outline-none font-bold bg-white
                        ${formData.difficulty === 'Easy' ? 'text-emerald-600' : formData.difficulty === 'Medium' ? 'text-amber-600' : 'text-red-600'}`}
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                    <div className="relative">
                      <input 
                        type="number"
                        value={formData.marks}
                        onChange={(e) => setFormData({...formData, marks: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-academy-500 outline-none font-black text-center"
                        min="1"
                      />
                      <span className="absolute -top-2 left-3 px-1 bg-gray-50 text-[8px] font-black text-gray-400 uppercase">Marks</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest text-center">Supporting Diagram</label>
                <div className="relative group">
                  <div className={`
                    border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all min-h-[240px]
                    ${formData.image_url ? 'border-academy-500 bg-academy-50/20' : 'border-gray-200 bg-gray-50 hover:border-academy-400 hover:bg-white'}
                  `}>
                    {uploading ? (
                      <Loader2 className="w-12 h-12 text-academy-500 animate-spin" />
                    ) : formData.image_url ? (
                      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white">
                        <img 
                          src={`http://localhost:8000${formData.image_url}`} 
                          alt="Preview" 
                          className="w-full max-h-[200px] object-contain"
                        />
                        <button 
                          onClick={(e) => { e.preventDefault(); setFormData({...formData, image_url: ''}); }}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-transform active:scale-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-5 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-10 h-10 text-academy-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-600">Drop diagram here</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">or click to browse</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex items-center justify-end gap-4">
            <button 
              type="button"
              onClick={onCancel}
              className="px-8 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-xs tracking-widest"
            >
              Discard Draft
            </button>
            <button 
              type="submit"
              disabled={loading || uploading}
              className={`${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-academy-700 hover:bg-academy-800'} text-white px-12 py-4 rounded-2xl shadow-xl font-black transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{isEditing ? 'Save Changes' : 'Commit to Question Bank'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;
