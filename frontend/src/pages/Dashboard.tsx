import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  Users as UsersIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronRight,
  Search,
  Filter,
  Loader2,
  Shield,
  Pencil,
  Trash2,
  X,
  Mail,
  GraduationCap,
  Key,
  Layers,
  Moon,
  Sun,
  Monitor,
  Type,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import client from '../api/client';
import QuestionForm from '../components/QuestionForm';
import CurriculumManager from '../components/CurriculumManager';
import UserManagement from '../components/UserManagement';
import Modal from '../components/Modal';

interface DashboardProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode, setIsDarkMode }) => {
  // Persistence for active tab
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('dashboard-active-tab') || 'subjects');
  
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [preselectedTopic, setPreselectedTopic] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordVaultRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Handle tab persistence
  useEffect(() => {
    localStorage.setItem('dashboard-active-tab', activeTab);
  }, [activeTab]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleAddQuestionFromCurriculum = (topic: any) => {
    setPreselectedTopic(topic);
    setActiveTab('questions');
    setIsAddingQuestion(true);
  };

  // Identity
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get('/auth/me').then(r => r.data),
    staleTime: Infinity
  });
  
  const passwordMutation = useMutation({
    mutationFn: (payload: any) => client.patch('/auth/me/password', payload),
    onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    passwordMutation.reset();
    if (newPassword !== confirmPassword) {
        passwordMutation.mutate(undefined, {
            onError: () => {},
            onSuccess: () => {}
        });
        return;
    }
    passwordMutation.mutate({
        current_password: currentPassword,
        new_password: newPassword
    });
  }

  const isAdmin = user?.is_admin || false;

  // Questions Query
  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ['questions', debouncedSearch, filterType, filterDifficulty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filterType) params.append('q_type', filterType);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      const res = await client.get(`/questions/?${params.toString()}`);
      return res.data;
    },
    enabled: !!user && activeTab === 'questions'
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.delete(`/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Could not delete question.");
    }
  });

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';
  };

  if (userLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-12 h-12 animate-spin text-academy-600 mb-4" />
        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Establishing Secure Session</p>
      </div>
    );
  }

  const navItems = [
    { id: 'subjects', icon: BookOpen, label: isAdmin ? 'Full Curriculum' : 'My Scope', role: 'teacher' },
    { id: 'questions', icon: PlusCircle, label: 'Question Bank', role: 'teacher' },
    { id: 'users', icon: UsersIcon, label: 'Staff Directory', role: 'admin' },
    { id: 'settings', icon: SettingsIcon, label: 'Preferences', role: 'teacher' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'subjects':
        return <CurriculumManager onAddQuestion={handleAddQuestionFromCurriculum} />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="text-gray-900 dark:text-white">
              <h2 className="text-3xl font-black tracking-tight">Portal Configuration</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Fine-tune your workspace and security environment.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 pb-4">
                  <Monitor className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-widest">Visual Experience</h3>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Dark Interface</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Reduced eye strain</p>
                    </div>
                  </div>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isDarkMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 pb-4">
                  <Type className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-widest">Question Defaults</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Marks</label>
                    <input type="number" defaultValue={5} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Base Complexity</label>
                    <select defaultValue="Medium" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm dark:text-white">
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div id="password-vault" ref={passwordVaultRef} className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 pb-4">
                    <Key className="w-5 h-5 text-red-500" />
                    <h3 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-widest">Security</h3>
                </div>

                {passwordMutation.isError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {(passwordMutation.error as any)?.response?.data?.detail || "Passwords do not match."}
                    </div>
                )}

                {passwordMutation.isSuccess && (
                     <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-black border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        Password updated successfully.
                    </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm" autoComplete="current-password" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm" autoComplete="new-password" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-sm" autoComplete="new-password" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={passwordMutation.isPending} className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50">
                            {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
          </div>
        );
      case 'questions':
        if (isAddingQuestion || editingQuestion) {
          return (
            <QuestionForm 
              initialData={editingQuestion || (preselectedTopic ? { topic_id: preselectedTopic.topic_id, topic: preselectedTopic } : null)}
              onSuccess={() => {
                setIsAddingQuestion(false);
                setEditingQuestion(null);
                setPreselectedTopic(null);
                queryClient.invalidateQueries({ queryKey: ['questions'] });
              }}
              onCancel={() => {
                setIsAddingQuestion(false);
                setEditingQuestion(null);
                setPreselectedTopic(null);
              }}
            />
          );
        }
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 text-gray-900 dark:text-white">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Question Repository</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Manage and search through the central assessment database.</p>
              </div>
              <button onClick={() => setIsAddingQuestion(true)} className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-3 rounded-2xl shadow-xl shadow-academy-600/20 font-black transition-all flex items-center gap-2 active:scale-95">
                <PlusCircle className="w-5 h-5" /> New Question
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-white transition-colors duration-300">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                    <input type="text" placeholder="Filter by text..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:ring-4 focus:ring-academy-500/10 outline-none bg-white dark:bg-gray-900 font-bold transition-all" />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
                  </div>
                  <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-3 border rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-academy-600 border-academy-600 text-white shadow-lg' : 'dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-700'}`}>
                    <Filter className="w-4 h-4" /> {showFilters ? 'Hide Logic' : 'Filter Logic'}
                    {(filterType || filterDifficulty) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  </button>
                </div>

                {showFilters && (
                  <div className="flex flex-wrap gap-8 pt-4 pb-2 animate-in slide-in-from-top-2 duration-200 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Question Category</p>
                      <div className="flex flex-wrap gap-2">
                        {['MCQ', 'True/False', 'Match the Following', 'Short Answer', 'Long Answer'].map(t => (
                          <button key={t} onClick={() => setFilterType(filterType === t ? '' : t)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${filterType === t ? 'bg-academy-600 border-academy-600 text-white shadow-md' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-academy-300'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Complexity Level</p>
                      <div className="flex gap-2">
                        {['Easy', 'Medium', 'Hard'].map(d => (
                          <button key={d} onClick={() => setFilterDifficulty(filterDifficulty === d ? '' : d)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${filterDifficulty === d ? 'bg-academy-600 border-academy-600 text-white shadow-md' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-academy-300'}`}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end pb-1">
                      <button onClick={() => { setFilterType(''); setFilterDifficulty(''); setSearchQuery(''); }} className="text-[10px] font-black text-red-500 uppercase hover:underline underline-offset-4 tracking-widest">Clear All</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100 dark:border-gray-700">
                      <th className="px-8 py-5">Question Detail</th>
                      <th className="px-8 py-5">Classification</th>
                      <th className="px-8 py-5">Complexity</th>
                      <th className="px-8 py-5 text-center">Score</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {qLoading ? (
                      <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-academy-500" /></td></tr>
                    ) : questions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-32 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-3xl flex items-center justify-center text-gray-200 dark:text-gray-800">
                              <Search className="w-10 h-10" />
                            </div>
                            <div>
                              <p className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs">No Records Found</p>
                              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium mt-1">Adjust your filters or start by adding a new question.</p>
                            </div>
                            <button onClick={() => setIsAddingQuestion(true)} className="mt-2 text-academy-600 dark:text-academy-400 font-black text-[10px] uppercase tracking-widest hover:underline">+ Create First Question</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      questions.map((q: any) => (
                        <tr key={q.question_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              {q.image_url && (
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-900 overflow-hidden flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm">
                                  <img src={`http://localhost:8000${q.image_url}`} className="w-full h-full object-cover" alt="" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white line-clamp-1 max-w-sm">{q.question_text}</p>
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 font-black uppercase tracking-widest">ID #{q.question_id} • {q.topic?.topic_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-academy-50 dark:bg-academy-900/50 text-academy-700 dark:text-academy-400 rounded-lg text-[9px] font-black uppercase tracking-widest">{q.q_type}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              q.difficulty === 'Easy' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700' :
                              q.difficulty === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700' : 'bg-red-50 dark:bg-red-900/30 text-red-700'
                            }`}>{q.difficulty}</span>
                          </td>
                          <td className="px-8 py-6 font-black text-gray-900 dark:text-white text-center text-sm">{q.marks}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-1">
                              <button onClick={() => setEditingQuestion(q)} className="p-2.5 hover:bg-academy-50 dark:hover:bg-academy-900/30 text-gray-400 hover:text-academy-600 rounded-xl transition-colors shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteTarget(q)} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 rounded-xl transition-colors shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Destructive Action">
              <div className="space-y-8 text-center pt-2">
                <div className="w-24 h-24 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto border-4 border-red-100 dark:border-red-900/30 shadow-inner group">
                  <Trash2 className="w-12 h-12 transition-transform group-hover:rotate-12" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white">Purge Question?</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-6 leading-relaxed font-medium">This question will be permanently removed from the repository. All associated data will be lost.</p>
                </div>
                <div className="flex gap-4 px-2">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">Retain Question</button>
                  <button onClick={() => deleteMutation.mutate(deleteTarget.question_id)} disabled={deleteMutation.isPending} className="flex-[2] py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-2xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {deleteMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    Delete Permanently
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-gray-950 overflow-hidden font-sans transition-colors duration-300`}>
      <aside className="w-72 bg-academy-900 dark:bg-black text-white flex flex-col shadow-2xl z-20 border-r border-white/5">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-academy-500 p-2.5 rounded-2xl shadow-xl shadow-academy-500/30 rotate-3"><BookOpen className="w-7 h-7 text-white" /></div>
          <div><h1 className="text-2xl font-black tracking-tighter">QB PORTAL</h1><p className="text-[8px] font-black text-academy-400 uppercase tracking-[0.2em] ml-0.5">Academic System</p></div>
        </div>

        <nav className="flex-1 mt-8 px-5 space-y-2">
          {navItems.map((item) => {
            if (item.role === 'admin' && !isAdmin) return null;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsAddingQuestion(false); setEditingQuestion(null); }} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${isActive ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex items-center gap-4">
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-academy-400' : 'text-gray-600 group-hover:text-gray-300'}`} />
                  <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all ${isActive ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-1'}`} />
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 bg-black/20">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.1em] border border-transparent hover:border-red-900/50">
            <LogOut className="w-5 h-5" /> Sign Out Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden dark:text-white">
        <header className="h-24 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-10 shadow-sm z-10 transition-colors duration-300">
          <div className="relative w-[440px] group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-all" />
            <input type="text" placeholder="Omni-search curriculum..." value={searchQuery} onChange={(e) => { if (activeTab !== 'questions') setActiveTab('questions'); setSearchQuery(e.target.value); }} className="w-full pl-14 pr-6 py-3.5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-black focus:ring-4 focus:ring-academy-500/10 outline-none transition-all" />
          </div>

          <div className="flex items-center gap-8">
            <div className="h-10 w-px bg-gray-100 dark:bg-gray-800" />
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setIsProfileOpen(true)}>
              <div className="text-right">
                <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-academy-600 transition-colors tracking-tight">{user?.full_name}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mt-1">{isAdmin ? 'Head Administrator' : 'Staff Faculty'}</p>
              </div>
              <div className="h-12 w-12 bg-academy-600 rounded-2xl flex items-center justify-center text-white font-black border-4 border-white dark:border-gray-800 shadow-xl group-hover:scale-105 transition-all">
                {user ? getInitials(user.full_name) : '??'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#fcfdfe] dark:bg-gray-950 transition-colors duration-300">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
        </div>
      </main>

      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Operational Identity" maxWidth="max-w-2xl">
        <div className="space-y-8 p-4 dark:text-white animate-in zoom-in-95">
          <div className="flex items-center gap-8 pb-10 border-b border-gray-100 dark:border-gray-700">
            <div className="h-28 w-28 bg-academy-600 rounded-[32px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-academy-600/30 transform -rotate-3 border-8 border-white dark:border-gray-800">{user ? getInitials(user.full_name) : '??'}</div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{user?.full_name}</h3>
              <p className="text-sm text-gray-500 font-bold flex items-center gap-2"><Mail className="w-4 h-4 text-academy-500" /> {user?.email}</p>
              <span className="inline-block text-[10px] font-black uppercase text-academy-600 bg-academy-50 dark:bg-academy-900/30 px-3 py-1.5 rounded-xl tracking-widest">{user?.department} Authority</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2.5 border-b dark:border-gray-700 pb-2"><Shield className="w-3.5 h-3.5" /> Authorization Scope</h4>
              <div className="space-y-3">
                {isAdmin && <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center gap-3"><Shield className="w-6 h-6 text-amber-600" /><span className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Root Administrator</span></div>}
                {user?.grade_levels?.length > 0 && <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center gap-3"><GraduationCap className="w-6 h-6 text-indigo-600" /><div><p className="text-xs font-black text-indigo-900 dark:text-indigo-100 uppercase">Grade Coordinator</p><p className="text-[9px] font-bold text-indigo-400 mt-0.5">Levels: {user.grade_levels.join(', ')}</p></div></div>}
                {user?.hod_subject_names?.length > 0 && <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl flex items-center gap-3"><BookOpen className="w-6 h-6 text-purple-600" /><div><p className="text-xs font-black text-purple-900 dark:text-purple-100 uppercase">Subject Head</p><p className="text-[9px] font-bold text-purple-400 mt-0.5">{user.hod_subject_names.join(', ')}</p></div></div>}
              </div>
            </div>
            <div className="space-y-5">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2.5 border-b dark:border-gray-700 pb-2"><Layers className="w-3.5 h-3.5" /> Direct Assignments</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 max-h-[180px] overflow-y-auto">
                {user?.subjects?.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {user.subjects.map((s: any) => <span key={s.subject_id} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight shadow-sm">{s.subject_name}</span>)}
                  </div>
                ) : <p className="text-xs text-gray-400 italic py-4 text-center">No individual subject hooks.</p>}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t dark:border-gray-700 flex items-center justify-between">
            <button className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:text-academy-600 transition-all tracking-widest" onClick={() => { setIsProfileOpen(false); setActiveTab('settings'); }}><Key className="w-4 h-4" /> Password Vault</button>
            <button onClick={handleLogout} className="bg-red-50 dark:bg-red-900/30 text-red-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95">Terminate Session</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
