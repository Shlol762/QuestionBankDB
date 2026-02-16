import React, { useState } from 'react';
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
  Save
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
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    department: '',
    is_admin: false,
    subject_ids: [] as number[]
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

  // Fetch real subjects for the checklist
  const { data: availableSubjects = [] } = useQuery({
    queryKey: ['available-subjects'],
    queryFn: async () => {
      const res = await client.get('/curriculum/subjects');
      return res.data;
    },
    enabled: isModalOpen
  });

  const toggleSubject = (id: number) => {
    setFormData(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id) 
        ? prev.subject_ids.filter(sid => sid !== id)
        : [...prev.subject_ids, id]
    }));
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({ full_name: '', email: '', password: '', department: '', is_admin: false, subject_ids: [] });
    setError('');
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
      password: '', // Keep empty for security
      department: user.department,
      is_admin: user.is_admin,
      subject_ids: user.subjects?.map((s: any) => s.subject_id) || []
    });
    setIsModalOpen(true);
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
              <th className="px-8 py-5">Role</th>
              <th className="px-8 py-5">Assigned Subjects</th>
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
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    user.is_admin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {user.is_admin ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {user.is_admin ? 'Admin' : 'Teacher'}
                  </span>
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
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateOrUpdateUser} className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500" placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input required type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500" placeholder="Work Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-academy-500" placeholder={isEditing ? "Leave blank to keep current" : "Password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} />
              
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                <span className="text-sm font-bold text-gray-700">Administrator Role</span>
                <input type="checkbox" className="w-5 h-5 accent-academy-600 cursor-pointer" checked={formData.is_admin} onChange={e => setFormData({...formData, is_admin: e.target.checked})} />
              </div>
            </div>

            <div className="space-y-5">
              <input required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Primary Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Subject Assignments</label>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 h-[160px] overflow-y-auto space-y-1 shadow-inner">
                  {availableSubjects.map((s: any) => (
                    <label key={s.subject_id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border ${formData.subject_ids.includes(s.subject_id) ? 'bg-academy-50 border-academy-200 text-academy-900' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                      <input type="checkbox" className="w-4 h-4 accent-academy-600 rounded" checked={formData.subject_ids.includes(s.subject_id)} onChange={() => toggleSubject(s.subject_id)} />
                      <span className="text-sm font-bold">{s.subject_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[2] bg-academy-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isEditing ? 'Update Profile' : 'Register Member'}
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
