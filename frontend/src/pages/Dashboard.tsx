import React, { useState } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  Users as UsersIcon, 
  Settings, 
  LogOut, 
  ChevronRight,
  Search,
  Bell,
  Filter,
  MoreVertical,
  Plus,
  Loader2,
  Shield,
  Pencil,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import QuestionForm from '../components/QuestionForm';
import CurriculumManager from '../components/CurriculumManager';
import UserManagement from '../components/UserManagement';
import Modal from '../components/Modal';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('subjects'); // Default to My Subjects
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // 1. Fetch Real Identity
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await client.get('/auth/me');
      return res.data;
    }
  });

  const isAdmin = user?.is_admin || false;

  // 2. Fetch Questions
  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ['questions', user?.user_id],
    queryFn: async () => {
      const res = await client.get('/questions/');
      return res.data;
    },
    enabled: !!user
  });

  // 3. Fetch Stats for the notification badge (Example usage)
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => client.get('/stats/').then(r => r.data),
    enabled: !!user
  });

  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await client.delete(`/questions/${deleteTarget.question_id}`);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete question");
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';
  };

  if (userLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-academy-600 mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Establishing Secure Session...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'subjects', icon: BookOpen, label: isAdmin ? 'Full Curriculum' : 'My Subjects', role: 'teacher' },
    { id: 'questions', icon: PlusCircle, label: 'Question Bank', role: 'teacher' },
    { id: 'users', icon: UsersIcon, label: 'User Management', role: 'admin' },
    { id: 'settings', icon: Settings, label: 'Settings', role: 'teacher' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'subjects':
        return <CurriculumManager />;
      case 'users':
        return <UserManagement />;
      case 'questions':
        if (isAddingQuestion || editingQuestion) {
          return (
            <QuestionForm 
              initialData={editingQuestion}
              onSuccess={() => {
                setIsAddingQuestion(false);
                setEditingQuestion(null);
                queryClient.invalidateQueries({ queryKey: ['questions'] });
              }}
              onCancel={() => {
                setIsAddingQuestion(false);
                setEditingQuestion(null);
              }}
            />
          );
        }
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 text-gray-900">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Question Bank</h2>
                <p className="text-gray-500 font-medium">Browse and manage assessment content for your assigned subjects.</p>
              </div>
              <button 
                onClick={() => setIsAddingQuestion(true)}
                className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-3 rounded-xl shadow-lg font-bold transition-all flex items-center gap-2 active:scale-95"
              >
                <PlusCircle className="w-5 h-5" />
                Add New Question
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-gray-900">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search questions..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-academy-500 outline-none w-64 bg-white font-bold" />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-white transition-all">
                    <Filter className="w-4 h-4" /> Filters
                  </button>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-100">
                    <th className="px-8 py-5 text-gray-900">Question Details</th>
                    <th className="px-8 py-5 text-gray-900">Type</th>
                    <th className="px-8 py-5 text-gray-900">Difficulty</th>
                    <th className="px-8 py-5 text-gray-900 text-center">Marks</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {qLoading ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-academy-500" /></td></tr>
                  ) : questions.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-32 text-center text-gray-400 italic font-medium">No questions found. Click "Add New Question" to begin.</td></tr>
                  ) : (
                    questions.map((q: any) => (
                      <tr key={q.question_id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            {q.image_url && (
                              <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                <img src={`http://localhost:8000${q.image_url}`} className="w-full h-full object-cover" alt="" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 line-clamp-1 max-w-sm">{q.question_text}</p>
                              <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-tighter">ID: #{q.question_id} • {q.topic?.topic_name || 'Uncategorized'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-academy-50 text-academy-700 rounded-lg text-[10px] font-black uppercase tracking-tight">{q.q_type}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                            q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-black text-gray-900 text-center">{q.marks}</td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingQuestion(q)}
                              className="p-2 hover:bg-academy-50 text-gray-400 hover:text-academy-600 rounded-lg transition-colors"
                              title="Edit Question"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteTarget(q)}
                              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Question Delete Confirmation */}
            <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Discard Question?">
              <div className="space-y-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
                  <Trash2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Delete this question?</h4>
                  <p className="text-sm text-gray-500 px-4">This action will permanently remove this question from the bank and cannot be undone.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors">Cancel</button>
                  <button 
                    onClick={handleDeleteQuestion} 
                    disabled={isDeleting}
                    className="flex-[2] py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    Confirm Delete
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
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans text-gray-900">
      <aside className="w-64 bg-academy-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-academy-500 p-2 rounded-lg shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">QB Portal</h1>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1">
          {navItems.map((item) => {
            if (item.role === 'admin' && !isAdmin) return null;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsAddingQuestion(false);
                  setEditingQuestion(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                  isActive ? 'bg-academy-700 text-white shadow-lg' : 'text-gray-400 hover:bg-academy-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-academy-300' : 'text-gray-500 group-hover:text-white'}`} />
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90 text-white' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="relative w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Deep search portal..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-full text-sm font-bold focus:ring-4 focus:ring-academy-500/10 outline-none text-gray-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-academy-600 transition-colors">
              <Bell className="w-6 h-6" />
              {stats?.total_questions > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                  {stats.total_questions > 9 ? '9+' : stats.total_questions}
                </span>
              )}
            </button>
            
            <div className="h-8 w-px bg-gray-100" />
            
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-black text-gray-900 leading-none">{user?.full_name}</p>
                <p className="text-[10px] text-gray-400 uppercase font-black mt-1.5 tracking-widest">{isAdmin ? 'Head Administrator' : `${user?.department} Staff`}</p>
              </div>
              <div className="h-11 w-11 bg-academy-100 rounded-2xl flex items-center justify-center text-academy-700 font-black border-2 border-white shadow-sm text-sm">
                {user ? getInitials(user.full_name) : '??'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-[#fbfcfd]">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
