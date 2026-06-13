import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { UserPlus, Search, Filter, Edit2, Trash2 } from 'lucide-react';
import { useUsers, type UserRead } from '../hooks/useStaff';

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Administrator',
  coordinator: 'Grade Coordinator',
  hod: 'Department Head (HOD)',
  faculty: 'Faculty User',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-neon-blue-500/10 text-neon-blue-400 border-neon-blue-500/30',
  coordinator: 'bg-neon-fuchsia-500/10 text-neon-fuchsia-400 border-neon-fuchsia-500/30',
  hod: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  faculty: 'bg-neon-emerald-500/10 text-neon-emerald-400 border-neon-emerald-500/30',
};

export const UserManagement: React.FC = () => {
  const { openDrawer, openDialog } = useUIStore();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: usersData, isLoading } = useUsers(roleFilter);
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

  // Helper helper to compute UI role
  const getRole = (user: UserRead): 'admin' | 'coordinator' | 'hod' | 'faculty' => {
    if (user.is_admin) return 'admin';
    if (user.grade_levels && user.grade_levels.length > 0) return 'coordinator';
    if (user.hod_allowed_subject_ids && user.hod_allowed_subject_ids.length > 0) return 'hod';
    return 'faculty';
  };

  // Helper to compute UI subjects list
  const getSubjectsList = (user: UserRead): string[] => {
    if (user.is_admin) return ['All Curriculum'];
    const list: string[] = [];
    if (user.grade_levels && user.grade_levels.length > 0) {
      user.grade_levels.forEach((gl) => list.push(`Grade ${gl} (Coord)`));
    }
    if (user.hod_subject_names && user.hod_subject_names.length > 0) {
      user.hod_subject_names.forEach((name) => list.push(`${name} (HOD)`));
    }
    if (user.subjects && user.subjects.length > 0) {
      user.subjects.forEach((s) => list.push(s.subject_name));
    }
    return list;
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
            className="glass-input px-4 py-2.5 text-sm w-full md:w-56"
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
                <th className="px-6 py-4">Role Badge</th>
                <th className="px-6 py-4">Assigned Curriculum/Subjects</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((user) => {
                  const userRole = getRole(user);
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ROLE_COLORS[userRole]}`}>
                          {ROLE_LABELS[userRole]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {getSubjectsList(user).map((s, idx) => (
                            <span key={idx} className="bg-white/5 border border-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neon-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald-500 animate-ping" />
                          Active
                        </span>
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
