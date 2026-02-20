import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Shield, 
  User as UserIcon, 
  Mail, 
  Building2,
  Loader2,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Save,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ChevronDown,
  FolderRoot,
  Layers,
  Book
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import Modal from './Modal';

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{id: number, name: string} | null>(null);
  const [expandedSyllabus, setExpandedSyllabus] = useState<number[]>([]);
  const [expandedGrade, setExpandedGrade] = useState<number[]>([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    department: '',
    is_admin: false,
    subject_ids: [] as number[],
    grade_levels: [] as number[],
    hod_subject_names: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch current user
  const { data: me } = useQuery({ 
    queryKey: ['me'], 
    queryFn: () => client.get('/auth/me').then(r => r.data) 
  });

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await client.get('/auth/users');
      return res.data;
    }
  });

  // Fetch full hierarchy for assignments
  const { data: hierarchy = [] } = useQuery({
    queryKey: ['curriculum-hierarchy'],
    queryFn: async () => {
      const res = await client.get('/curriculum/hierarchy');
      return res.data;
    },
    enabled: isModalOpen
  });

  // Unique subject names for HOD selection
  const uniqueSubjectNames = useMemo(() => {
    const names = new Set<string>();
    hierarchy.forEach((s: any) => s.grades.forEach((g: any) => g.subjects.forEach((sub: any) => names.add(sub.subject_name))));
    return Array.from(names).sort();
  }, [hierarchy]);

  // Unique grade levels for Coordinator selection
  const allGradeLevels = useMemo(() => {
    const levels = new Set<number>();
    hierarchy.forEach((s: any) => s.grades.forEach((g: any) => levels.add(g.grade_level)));
    return Array.from(levels).sort((a, b) => a - b);
  }, [hierarchy]);

  const toggleItem = (listName: 'subject_ids' | 'grade_levels' | 'hod_subject_names', value: any) => {
    setFormData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).includes(value)
        ? (prev[listName] as any[]).filter(v => v !== value)
        : [...(prev[listName] as any[]), value]
    }));
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({ 
      full_name: '', 
      email: '', 
      password: '', 
      department: '', 
      is_admin: false, 
      subject_ids: [],
      grade_levels: [],
      hod_subject_names: []
    });
    setError('');
    setExpandedSyllabus([]);
    setExpandedGrade([]);
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing && editingUserId) {
        await client.patch(`/auth/users/${editingUserId}`, formData);
      } else {
        await client.post('/auth/register', formData);
      }
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await client.delete(`/auth/users/${deleteTarget.id}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: any) => {
    setIsEditing(true);
    setEditingUserId(user.user_id);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '', 
      department: user.department,
      is_admin: user.is_admin,
      subject_ids: user.subjects?.map((s: any) => s.subject_id) || [],
      grade_levels: user.grade_levels || [],
      hod_subject_names: user.hod_subject_names || []
    });
    setIsModalOpen(true);
  };

  const toggleSyllabus = (id: number) => {
    setExpandedSyllabus(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleGrade = (id: number) => {
    setExpandedGrade(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-academy-500" />
        <p className="font-medium">Loading staff records...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">User Management</h2>
          <p className="text-gray-500">Manage school staff, teachers, and administrators.</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-academy-600/20 font-semibold transition-all flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add New Staff
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-gray-900">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 bg-gray-50/50">
              <th className="px-8 py-5">Full Name</th>
              <th className="px-8 py-5">Roles & Scope</th>
              <th className="px-8 py-5">Direct Assignments</th>
              <th className="px-8 py-5">Contact</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {users.map((user: any) => (
              <tr key={user.user_id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${user.is_admin ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-academy-50 text-academy-700 border-academy-100'}`}>
                      {user.full_name.charAt(0)}
                    </div>
                    <span className="font-bold">{user.full_name}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1.5 items-start">
                    {user.is_admin && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {user.grade_levels?.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        <GraduationCap className="w-3 h-3" /> Coordinator (Gr {user.grade_levels.join(', ')})
                      </span>
                    )}
                    {user.hod_subject_names?.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        <BookOpen className="w-3 h-3" /> HOD ({user.hod_subject_names.join(', ')})
                      </span>
                    )}
                    {!user.is_admin && user.grade_levels?.length === 0 && user.hod_subject_names?.length === 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <UserIcon className="w-3 h-3" /> Teacher
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {user.subjects?.length === 0 ? (
                      <span className="text-[10px] text-gray-300 italic">None</span>
                    ) : (
                      user.subjects?.map((s: any) => (
                        <span key={s.subject_id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold border border-gray-200">
                          {s.subject_name}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-8 py-5 text-gray-500 font-medium">
                  {user.email}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(user)} className="p-2 hover:bg-academy-50 text-gray-400 hover:text-academy-600 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {user.user_id !== me?.user_id && (
                      <button onClick={() => setDeleteTarget({id: user.user_id, name: user.full_name})} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={isEditing ? 'Update Staff Member' : 'Register New Staff'}
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleCreateOrUpdateUser} className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Section: Profile (4 cols) */}
            <div className="lg:col-span-4 space-y-5 border-r lg:pr-8 border-gray-100">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Profile Information</h4>
              <div className="space-y-4">
                <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 text-sm" placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                <input required type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 text-sm" placeholder="Work Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500 text-sm" placeholder={isEditing ? "Leave blank to keep current" : "Password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} />
                <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder="Primary Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
              </div>
              
              <div className="p-4 bg-amber-50 rounded-2xl flex items-center justify-between border border-amber-100 mt-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-900">System Administrator</span>
                </div>
                <input type="checkbox" className="w-5 h-5 accent-amber-600 cursor-pointer" checked={formData.is_admin} onChange={e => setFormData({...formData, is_admin: e.target.checked})} />
              </div>
            </div>

            {/* Middle Section: Roles (3 cols) */}
            <div className="lg:col-span-3 space-y-6 border-r lg:pr-8 border-gray-100">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Global Scopes</h4>
              
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">
                  <GraduationCap className="w-3 h-3 text-indigo-500" /> Grade Coordinator
                </label>
                <div className="flex flex-wrap gap-2">
                  {allGradeLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleItem('grade_levels', level)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        formData.grade_levels.includes(level)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
                      }`}
                    >
                      Grade {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">
                  <BookOpen className="w-3 h-3 text-purple-500" /> Head of Dept. (HOD)
                </label>
                <div className="flex flex-wrap gap-2">
                  {uniqueSubjectNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleItem('hod_subject_names', name)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        formData.hod_subject_names.includes(name)
                          ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section: Assignments (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Hierarchical Subject Assignments</h4>
              
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 h-[400px] overflow-y-auto custom-scrollbar">
                {hierarchy.length === 0 && <p className="text-center text-gray-400 py-20 text-sm">No curriculum data available.</p>}
                
                {hierarchy.map((syllabus: any) => (
                  <div key={syllabus.syllabus_id} className="mb-4">
                    <button
                      type="button"
                      onClick={() => toggleSyllabus(syllabus.syllabus_id)}
                      className="w-full flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        {expandedSyllabus.includes(syllabus.syllabus_id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <FolderRoot className="w-4 h-4 text-academy-500" />
                        <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{syllabus.syllabus_name}</span>
                        <span className="text-[10px] text-gray-400 font-bold ml-1">{syllabus.academic_year}</span>
                      </div>
                    </button>

                    {expandedSyllabus.includes(syllabus.syllabus_id) && (
                      <div className="ml-4 mt-1 border-l-2 border-academy-100 pl-4 space-y-3">
                        {syllabus.grades.map((grade: any) => (
                          <div key={grade.config_id}>
                            <button
                              type="button"
                              onClick={() => toggleGrade(grade.config_id)}
                              className="w-full flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                {expandedGrade.includes(grade.config_id) ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                <Layers className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-bold text-gray-600 italic">Grade {grade.grade_level}</span>
                              </div>
                            </button>

                            {expandedGrade.includes(grade.config_id) && (
                              <div className="ml-4 mt-2 grid grid-cols-1 gap-1">
                                {grade.subjects.map((subject: any) => (
                                  <label
                                    key={subject.subject_id}
                                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                                      formData.subject_ids.includes(subject.subject_id)
                                        ? 'bg-academy-600 border-academy-600 text-white shadow-lg shadow-academy-600/20'
                                        : 'bg-white border-gray-100 text-gray-600 hover:border-academy-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Book className={`w-3.5 h-3.5 ${formData.subject_ids.includes(subject.subject_id) ? 'text-white' : 'text-blue-500'}`} />
                                      <span className="text-xs font-bold">{subject.subject_name}</span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={formData.subject_ids.includes(subject.subject_id)}
                                      onChange={() => toggleItem('subject_ids', subject.subject_id)}
                                    />
                                  </label>
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
            </div>
          </div>

          <div className="pt-6 border-t flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[2] bg-academy-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isEditing ? 'Save All Assignments' : 'Register Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Danger Modal */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Revoke Access">
        <div className="space-y-6 text-center p-4">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-100"><Trash2 className="w-10 h-10" /></div>
          <div><h4 className="text-xl font-black text-gray-900 mb-2">Delete {deleteTarget?.name}?</h4><p className="text-sm text-gray-500 leading-relaxed">This will permanently remove the staff member from the portal and revoke all permissions.</p></div>
          <div className="flex gap-3"><button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 text-gray-400 font-bold">Cancel</button><button onClick={handleDeleteUser} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-600/20 hover:bg-red-700">{loading ? 'Deleting...' : 'Delete User'}</button></div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
