import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Users as UsersIcon, 
  Settings, 
  LogOut, 
  ChevronRight,
  Search,
  Bell,
  User,
  Filter,
  MoreVertical,
  Plus,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import QuestionForm from '../components/QuestionForm';
import CurriculumManager from '../components/CurriculumManager';
import UserManagement from '../components/UserManagement';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
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

  // 2. Fetch Questions (Filtered if teacher)
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', user?.user_id],
    queryFn: async () => {
      const res = await client.get('/questions/');
      return res.data;
    }
  });

  // Helper for initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', role: 'teacher' },
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
        if (isAddingQuestion) {
          return (
            <QuestionForm 
              onSuccess={() => {
                setIsAddingQuestion(false);
                queryClient.invalidateQueries({ queryKey: ['questions'] });
              }}
              onCancel={() => setIsAddingQuestion(false)}
            />
          );
        }
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Question Bank</h2>
                <p className="text-gray-500">Manage and browse the school curriculum questions.</p>
              </div>
              <button 
                onClick={() => setIsAddingQuestion(true)}
                className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-3 rounded-xl shadow-lg font-semibold transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Add New Question
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Filter questions..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-academy-500 outline-none w-64" />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition-all">
                    <Filter className="w-4 h-4" /> Filters
                  </button>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
                    <th className="px-6 py-4">Question Details</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Difficulty</th>
                    <th className="px-6 py-4">Marks</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-academy-500" /></td></tr>
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                        No questions found. Click "Add New Question" to begin.
                      </td>
                    </tr>
                  ) : (
                    questions.map((q: any) => (
                      <tr key={q.question_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {q.image_url && (
                              <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                <img src={`http://localhost:8000${q.image_url}`} className="w-full h-full object-cover" alt="" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 truncate max-w-xs">{q.question_text}</p>
                              <p className="text-xs text-gray-400 mt-1">ID: #{q.question_id} • {new Date(q.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-academy-50 text-academy-700 rounded-full text-xs font-medium">{q.q_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                            q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">{q.marks}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'dashboard':
      default:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Dashboard</h2>
                <p className="text-gray-500">Welcome to your academic command center.</p>
              </div>
              
              <button 
                onClick={() => {
                  setActiveTab('questions');
                  setIsAddingQuestion(true);
                }}
                className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-academy-600/20 font-semibold transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                New Question
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { label: 'Total Questions', value: questions.length, color: 'bg-blue-500' },
                { label: 'My Subjects', value: '4', color: 'bg-academy-500' },
                { label: 'Reviewed', value: '86%', color: 'bg-emerald-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 h-96 flex flex-col items-center justify-center text-gray-400">
              <BookOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a module from the sidebar to begin</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-academy-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-academy-500 p-2 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">QB Portal</h1>
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
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                  isActive ? 'bg-academy-700 text-white shadow-lg' : 'text-gray-400 hover:bg-academy-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-academy-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search questions, topics..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-academy-500 outline-none text-gray-900"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-gray-500 hover:text-academy-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                3
              </span>
            </button>
            
            <div className="h-10 w-px bg-gray-200 mx-2" />
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{isAdmin ? 'System Administrator' : `${user?.department} Teacher`}</p>
              </div>
              <div className="h-10 w-10 bg-academy-100 rounded-full flex items-center justify-center text-academy-700 font-bold border-2 border-academy-200">
                {user ? getInitials(user.full_name) : '??'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
