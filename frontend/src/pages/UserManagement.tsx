import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { UserPlus, Search, Filter, Edit2, Trash2, Power } from 'lucide-react';
import { useUsers, useUpdateUser, type UserRead } from '../hooks/useStaff';
import { useMe } from '../hooks/useAuth';
import { useAllowedGrades } from '../hooks/useSystemConfig';
import { toast } from 'react-hot-toast';



export const UserManagement: React.FC = () => {
  const { openDrawer, openDialog } = useUIStore();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: usersData, isLoading } = useUsers(roleFilter);
  const { data: allowedGradesPage } = useAllowedGrades(true);
  const allowedGradesList = allowedGradesPage?.items || [];
  const updateUserMutation = useUpdateUser();
  const { data: meData } = useMe();
  const staff = usersData?.items || [];

  const handleCreateStaff = () => {
    openDrawer('CREATE_STAFF');
  };

  const handleEditStaff = (user: UserRead) => {
    openDrawer('EDIT_STAFF', { userId: user.user_id });
  };

  const handleDeleteStaff = (user: UserRead) => {
    openDialog('DELETE_USER', { userId: user.user_id, userName: user.full_name });
  };

  const handleToggleStatus = (user: UserRead) => {
    const isSelf = meData?.user_id === user.user_id;
    if (isSelf) {
      toast.error('Security Protocol: You cannot disable your own account.');
      return;
    }
    updateUserMutation.mutate({
      id: user.user_id,
      payload: { is_active: !user.is_active }
    });
  };



  const filteredStaff = staff.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-4">
        <div className="w-12 h-12 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold animate-pulse">Loading Staff Directory...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Staff Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            Invite, configure authorization levels, and manage teaching assignments for faculty.
          </p>
        </div>
        <button
          onClick={handleCreateStaff}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-neon-emerald-600 hover:bg-neon-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-200 flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Onboard New Staff
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass bg-white/[0.01] border-white/5 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5" /> Filter by Role:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="glass-input glass-select px-4 py-2.5 text-sm w-full md:w-56"
          >
            <option value="all" className="bg-surface-800 text-white">All Roles</option>
            <option value="admin" className="bg-surface-800 text-white">System Administrator</option>
            <option value="coordinator" className="bg-surface-800 text-white">Grade Coordinator</option>
            <option value="hod" className="bg-surface-800 text-white">Department Head (HOD)</option>
            <option value="faculty" className="bg-surface-800 text-white">Faculty User</option>
          </select>
        </div>
      </div>

      {/* Staff Grid/Table */}
      <div className="glass border-white/10 rounded-2xl overflow-hidden bg-surface-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5 text-left text-sm">
            <thead className="bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Management Roles</th>
                <th className="px-6 py-4">Teaching Roles</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((user) => {
                  return (
                    <tr key={user.user_id} className="hover:bg-white/[0.01] transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                            {user.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-semibold text-white">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono text-xs">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {user.is_admin && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-400">
                              System Admin
                            </span>
                          )}
                          {user.hod_subject_names && user.hod_subject_names.map((name) => (
                            <span key={name} className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-purple-500/10 text-purple-400">
                              HOD: {name}
                            </span>
                          ))}
                          {user.grade_levels && user.grade_levels.map((gl) => {
                            const gradeObj = allowedGradesList.find(g => g.allowed_grade_id === gl);
                            return (
                              <span key={gl} className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-neon-blue-500/10 text-neon-blue-400">
                                {gradeObj?.grade_name || `Grade ${gl}`} Coord
                              </span>
                            );
                          })}
                          {!user.is_admin && (!user.hod_subject_names || user.hod_subject_names.length === 0) && (!user.grade_levels || user.grade_levels.length === 0) && (
                            <span className="text-gray-500 text-xs italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {user.subjects && user.subjects.length > 0 ? (
                            Array.from(
                              new Set(
                                user.subjects.map((s) => {
                                  const cleanSyllabus = s.syllabus_name
                                    ? s.syllabus_name
                                      .replace(/\s*\(\d{4}\)/g, '')
                                      .replace(/\s*\d{4}-\d{4}/g, '')
                                      .replace(/\b\d{4}\b/g, '')
                                      .trim()
                                    : '';
                                  const details = [];
                                  if (s.grade_name) details.push(s.grade_name);
                                  if (cleanSyllabus) details.push(cleanSyllabus);
 
                                  return details.length > 0
                                    ? `${s.subject_name} (${details.join('-')})`
                                    : s.subject_name;
                                })
                              )
                            ).map((sText, idx) => (
                              <span key={idx} className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-neon-emerald-500/10 text-neon-emerald-400">
                                {sText}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs italic">None Assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          disabled={meData?.user_id === user.user_id}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neon-blue-500/50 ${
                            user.is_active ? 'bg-neon-emerald-500' : 'bg-white/10'
                          } ${meData?.user_id === user.user_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={meData?.user_id === user.user_id ? "You cannot disable your own account" : `Click to ${user.is_active ? 'disable' : 'enable'} account`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              user.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditStaff(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No staff profiles match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
