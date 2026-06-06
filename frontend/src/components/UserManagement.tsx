import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Shield, 
  User as UserIcon, 
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ChevronDown,
  FolderRoot,
  Layers,
  Book,
  RefreshCw,
  X
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import client from '../api/client';
import Modal from './Modal';
import Pagination from './Pagination';
import { useAuthStore } from '../store/authStore';

const userSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  is_admin: z.boolean(),
  subject_ids: z.array(z.number()),
  grade_levels: z.array(z.number()),
  hod_allowed_subject_ids: z.array(z.number())
});

type UserFormData = z.infer<typeof userSchema>;

interface UserListItem {
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  is_admin: boolean;
  grade_levels: number[];
  hod_subject_names: string[];
  hod_allowed_subject_ids?: number[];
  subjects: { subject_id: number; subject_name: string }[];
}

const ITEMS_PER_PAGE = 10;

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{id: number, name: string} | null>(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [expandedSyllabus, setExpandedSyllabus] = useState<number[]>([]);
  const [expandedGrade, setExpandedGrade] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  
  const { user: me } = useAuthStore();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      department: '',
      is_admin: false,
      subject_ids: [],
      grade_levels: [],
      hod_allowed_subject_ids: []
    }
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const gradeLevels = watch('grade_levels') || [];
  const subjectIds = watch('subject_ids') || [];
  const hodAllowedSubjectIds = watch('hod_allowed_subject_ids') || [];

  // Fetch Paginated Users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page, ITEMS_PER_PAGE],
    queryFn: async () => {
      const res = await client.get('/auth/users', {
        params: {
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE
        }
      });
      return res.data;
    },
    placeholderData: { items: [], total: 0 }
  });
  
  const users: UserListItem[] = useMemo(() => usersData?.items || [], [usersData?.items]);
  const totalUsers = usersData?.total || 0;

  // Fetch Curriculum for Assignments
  const { data: hierarchy = [] } = useQuery({
    queryKey: ['curriculum-hierarchy'],
    queryFn: async () => {
      const res = await client.get('/curriculum/hierarchy');
      return res.data;
    },
    enabled: isModalOpen
  });

  // Fetch Allowed Subjects for HOD Assignment
  const { data: allowedSubjectsData } = useQuery({
    queryKey: ['allowed-subjects-all'],
    queryFn: async () => {
      const res = await client.get('/allowed-subjects/?limit=500');
      return res.data;
    },
    enabled: isModalOpen
  });
  const allowedSubjects = useMemo(() => allowedSubjectsData?.items || [], [allowedSubjectsData?.items]);

  const allGradeLevels = useMemo(() => {
    const levels = new Set<number>();
    hierarchy.forEach((s: { grades: { grade_level: number }[] }) => s.grades.forEach((g) => levels.add(g.grade_level)));
    return Array.from(levels).sort((a, b) => a - b);
  }, [hierarchy]);

  // Mutations
  const userMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (isEditing && editingUserId) {
        // Remove password if empty to avoid overwriting
        if (!payload.password) delete payload.password;
        return client.patch(`/auth/users/${editingUserId}`, payload);
      }
      return client.post('/auth/register', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.delete(`/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Revoke access failed.");
    }
  });
  
  const passwordResetMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      client.post(`/auth/users/${userId}/reset-password`, { new_password: newPassword }),
    onSuccess: () => {
        setPasswordResetSuccess(true);
        setTimeout(() => setPasswordResetSuccess(false), 3000);
    }
  });

  const promptAndResetPassword = (userId: number) => {
    const nextPassword = window.prompt('Enter a new temporary password (min 12 chars, uppercase, number, special char):');
    if (!nextPassword) return;
    passwordResetMutation.mutate({ userId, newPassword: nextPassword });
  };

  const toggleItem = (listName: 'subject_ids' | 'grade_levels' | 'hod_allowed_subject_ids', value: number | string) => {
    let currentList: Array<number | string>;
    if (listName === 'subject_ids') currentList = subjectIds as Array<number>;
    else if (listName === 'grade_levels') currentList = gradeLevels as Array<number>;
    else currentList = hodAllowedSubjectIds as Array<number>;

    const newList = currentList.includes(value)
      ? currentList.filter(v => v !== value)
      : [...currentList, value];
    setValue(listName, newList as never);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingUserId(null);
    reset({
      full_name: '',
      email: '',
      password: '',
      department: '',
      is_admin: false,
      subject_ids: [],
      grade_levels: [],
      hod_allowed_subject_ids: []
    });
    setExpandedSyllabus([]);
    setExpandedGrade([]);
  };

  const openEdit = (user: UserListItem) => {
    setIsEditing(true);
    setEditingUserId(user.user_id);
    reset({
      full_name: user.full_name,
      email: user.email,
      password: '', 
      department: user.department,
      is_admin: user.is_admin,
      subject_ids: user.subjects?.map((s) => s.subject_id) || [],
      grade_levels: user.grade_levels || [],
      hod_allowed_subject_ids: user.hod_allowed_subject_ids || []
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: UserFormData) => {
    const payload = {
        ...data,
        full_name: data.full_name.trim(),
        email: data.email.trim(),
        department: data.department.trim(),
    };
    userMutation.mutate(payload);
  };

  // Calculate total administrators for the Safety Lock
  const adminCount = useMemo(() => users.filter((u) => u.is_admin).length, [users]);

  if (isLoading && !usersData) { // Show loading only on initial fetch
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-academy-500" />
        <p className="font-black uppercase tracking-widest text-[10px]">Accessing Staff Directory</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {!isModalOpen && (
        <>
          <div className="flex items-center justify-between mb-8 text-gray-900 dark:text-white">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Staff Management</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Oversee operational roles and curriculum hookups.</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-academy-600 hover:bg-academy-700 text-white px-6 py-3.5 rounded-2xl shadow-xl shadow-academy-600/20 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Onboard Staff
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table aria-label="Staff directory" className="w-full text-left">
            <caption className="sr-only">Staff directory</caption>
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                <th scope="col" className="px-8 py-6">Staff Profile</th>
                <th scope="col" className="px-8 py-6">Authorization Level</th>
                <th scope="col" className="px-8 py-6">Active Hooks</th>
                <th scope="col" className="px-8 py-6">Operational Contact</th>
                <th scope="col" className="px-8 py-6 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center p-12">
                    <Loader2 className="w-8 h-8 text-academy-500 animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-12 text-gray-400 font-medium italic">
                    No staff members found.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 shadow-sm ${user.is_admin ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 border-amber-100 dark:border-amber-900/30' : 'bg-academy-50 dark:bg-academy-900/20 text-academy-700 border-academy-100 dark:border-academy-900/30'}`}>
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-black text-gray-900 dark:text-white block tracking-tight">{user.full_name}</span>
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{user.department}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1.5 items-start">
                      {user.is_admin && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                          <Shield className="w-3 h-3" /> Root Admin
                        </span>
                      )}
                      {user.grade_levels?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
                          <GraduationCap className="w-3 h-3" /> Coordinator (Gr {user.grade_levels.join(', ')})
                        </span>
                      )}
                      {user.hod_subject_names?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200">
                          <BookOpen className="w-3 h-3" /> Subject Head ({user.hod_subject_names.join(', ')})
                        </span>
                      )}
                      {!user.is_admin && user.grade_levels?.length === 0 && user.hod_subject_names?.length === 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
                          <UserIcon className="w-3 h-3" /> Faculty
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                      {user.subjects?.length === 0 ? (
                        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-bold italic tracking-tighter">Zero hooks detected</span>
                      ) : (
                        user.subjects?.map((s) => (
                          <span key={s.subject_id} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-lg text-[9px] font-black uppercase border border-gray-200 dark:border-gray-700 shadow-sm">
                            {s.subject_name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-gray-500 dark:text-gray-400 font-bold text-xs tracking-tight">
                    {user.email}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 transition-all transform">
                      <button aria-label="Edit user" onClick={() => openEdit(user)} className="p-2.5 hover:bg-academy-50 dark:hover:bg-academy-900/30 text-gray-400 hover:text-academy-600 dark:hover:text-academy-400 rounded-xl transition-colors shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.user_id !== me?.user_id && (
                        <button
                          aria-label="Delete user"
                          onClick={() => setDeleteTarget({id: user.user_id, name: user.full_name})} 
                          disabled={user.is_admin && adminCount <= 1}
                          title={user.is_admin && adminCount <= 1 ? "Security Lock: Final Administrator" : "Delete User"}
                          className={`p-2.5 rounded-xl transition-colors shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 ${user.is_admin && adminCount <= 1 ? 'opacity-20 cursor-not-allowed text-gray-300' : 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'}`}
                        >
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
        <Pagination 
          currentPage={page}
          totalItems={totalUsers}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
        />
      </div>
        </>
      )}

      {isModalOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300 w-full min-h-[calc(100vh-6rem)] flex flex-col text-gray-900 dark:text-white transition-colors duration-300">
          <div className="p-8 flex-1">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-3 ${isEditing ? 'bg-amber-500 shadow-amber-500/20' : 'bg-academy-600 shadow-academy-600/20'} text-white rounded-2xl shadow-xl`}>
                  {isEditing ? <Pencil className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Refine Staff Identity' : 'Register New Faculty'}</h2>
                </div>
              </div>
              <button aria-label="Close form" onClick={() => { if (!userMutation.isPending) { setIsModalOpen(false); resetForm(); } }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {userMutation.isError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Execution failed.</span>
              </div>
              <div className="ml-8 font-medium">
                {Array.isArray((userMutation.error as any)?.response?.data?.detail)
                  ? (userMutation.error as any).response.data.detail.map((e: any, i: number) => <div key={i}>{e.loc?.join('.')}: {e.msg}</div>)
                  : ((userMutation.error as any)?.response?.data?.detail || 'Verify network connectivity.')}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Column 1: Core Profile */}
            <div className="lg:col-span-4 space-y-6 border-r border-gray-100 dark:border-gray-700 pr-10">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b dark:border-gray-700 pb-3">Staff Details</h4>
              <div className="space-y-4">
                <label htmlFor="user-full-name" className="sr-only">Full Name</label>
                <input id="user-full-name" autoFocus {...register("full_name")} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 text-sm font-bold dark:text-white transition-all" placeholder="Full Name" />
                {errors.full_name && <p className="text-red-500 text-[10px] font-bold">{errors.full_name.message}</p>}
                
                <label htmlFor="user-email" className="sr-only">Email</label>
                <input id="user-email" {...register("email")} type="email" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 text-sm font-bold dark:text-white transition-all" placeholder="School Email" />
                {errors.email && <p className="text-red-500 text-[10px] font-bold">{errors.email.message}</p>}

                <label htmlFor="user-password" className="sr-only">Password</label>
                <div className="relative">
                  <input id="user-password" {...register("password")} type={showPassword ? 'text' : 'password'} className="w-full px-5 py-4 pr-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 text-sm font-bold dark:text-white transition-all" placeholder={isEditing ? "Password (retain current if blank)" : "Initial Password"} />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-500">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
                
                <label htmlFor="user-department" className="sr-only">Department</label>
                <input id="user-department" {...register("department")} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-academy-500/10 text-sm font-bold dark:text-white transition-all" placeholder="Department" />
                {errors.department && <p className="text-red-500 text-[10px] font-bold">{errors.department.message}</p>}
              </div>

                {isEditing && me?.is_admin && editingUserId !== me?.user_id && (
                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={() => promptAndResetPassword(editingUserId!)}
                            disabled={passwordResetMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg disabled:opacity-50"
                        >
                            {passwordResetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Force Password Reset
                        </button>
                        {passwordResetSuccess && <p className="text-emerald-500 text-xs font-bold mt-2 text-center">Password reset completed.</p>}
                    </div>
                )}
              
              <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-[24px] flex items-center justify-between border border-amber-100 dark:border-amber-900/30 mt-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="text-xs font-black text-amber-900 dark:text-amber-100 block uppercase">Administrator Permissions</span>
                    <span className="text-[9px] font-bold text-amber-600/70">Full Platform Access</span>
                  </div>
                </div>
                <input type="checkbox" className="w-6 h-6 accent-amber-600 cursor-pointer rounded-lg" {...register("is_admin")} />
              </div>
            </div>

            {/* Column 2: Scope Definitions */}
            <div className="lg:col-span-3 space-y-8 border-r border-gray-100 dark:border-gray-700 pr-10">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b dark:border-gray-700 pb-3">Management Roles</h4>
              <div className="space-y-8">
                <div>
                  <label className="flex items-center gap-2.5 text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest"><GraduationCap className="w-4 h-4 text-indigo-500" /> Coordinator Of</label>
                  <div className="flex flex-wrap gap-2.5">
                    {allGradeLevels.map((level) => (
                      <button key={level} type="button" onClick={() => toggleItem('grade_levels', level)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black border transition-all ${gradeLevels.includes(level) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300'}`}>GR {level}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2.5 text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest"><BookOpen className="w-4 h-4 text-purple-500" /> Head Of</label>
                  <div className="flex flex-wrap gap-2.5">
                    {allowedSubjects.map((sub: { allowed_subject_id: number; subject_name: string }) => (
                      <button key={sub.allowed_subject_id} type="button" onClick={() => toggleItem('hod_allowed_subject_ids', sub.allowed_subject_id)} className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${hodAllowedSubjectIds.includes(sub.allowed_subject_id) ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-purple-300'}`}>{sub.subject_name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Hierarchical Logic */}
            <div className="lg:col-span-5 space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b dark:border-gray-700 pb-3">Teaching Responsibilities</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-[32px] p-6 h-[440px] overflow-y-auto custom-scrollbar shadow-inner">
                {hierarchy.map((syllabus: { syllabus_id: number; syllabus_name: string; grades: { config_id: number; grade_level: number; subjects: { subject_id: number; subject_name: string }[] }[] }) => (
                  <div key={syllabus.syllabus_id} className="mb-6">
                    <button type="button" onClick={() => setExpandedSyllabus(prev => prev.includes(syllabus.syllabus_id) ? prev.filter(id => id !== syllabus.syllabus_id) : [...prev, syllabus.syllabus_id])} className="w-full flex items-center justify-between p-3 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all group">
                      <div className="flex items-center gap-3">
                        {expandedSyllabus.includes(syllabus.syllabus_id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <FolderRoot className="w-5 h-5 text-academy-500" />
                        <span className="text-[11px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">{syllabus.syllabus_name}</span>
                      </div>
                    </button>
                    {expandedSyllabus.includes(syllabus.syllabus_id) && (
                      <div className="ml-6 mt-2 border-l-2 border-academy-100 dark:border-academy-900 pl-6 space-y-4 animate-in slide-in-from-top-1">
                        {syllabus.grades.map((grade) => (
                          <div key={grade.config_id}>
                            <button type="button" onClick={() => setExpandedGrade(prev => prev.includes(grade.config_id) ? prev.filter(id => id !== grade.config_id) : [...prev, grade.config_id])} className="w-full flex items-center justify-between p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors group">
                              <div className="flex items-center gap-3">
                                {expandedGrade.includes(grade.config_id) ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                <Layers className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase">Grade {grade.grade_level}</span>
                              </div>
                            </button>
                            {expandedGrade.includes(grade.config_id) && (
                              <div className="ml-6 mt-3 grid grid-cols-1 gap-2 animate-in slide-in-from-left-1">
                                {grade.subjects.map((subject) => (
                                  <label key={subject.subject_id} className={`flex items-center justify-between p-3.5 rounded-[18px] cursor-pointer border-2 transition-all ${subjectIds.includes(subject.subject_id) ? 'bg-academy-600 border-academy-600 text-white shadow-xl scale-[1.02]' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-academy-200'}`}>
                                    <div className="flex items-center gap-3.5">
                                      <Book className={`w-4 h-4 ${subjectIds.includes(subject.subject_id) ? 'text-white' : 'text-blue-500'}`} />
                                      <span className="text-[11px] font-black uppercase tracking-tight">{subject.subject_name}</span>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={subjectIds.includes(subject.subject_id)} onChange={() => toggleItem('subject_ids', subject.subject_id)} />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${subjectIds.includes(subject.subject_id) ? 'bg-white border-white' : 'border-gray-200 dark:border-gray-600'}`}>
                                      {subjectIds.includes(subject.subject_id) && <div className="w-2 h-2 bg-academy-600 rounded-full" />}
                                    </div>
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

          <div className="pt-10 border-t border-gray-100 dark:border-gray-700 flex gap-6">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
            <button 
              type="submit" 
              disabled={userMutation.isPending} 
              className="flex-[2] bg-academy-700 hover:bg-academy-800 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-academy-700/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {userMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
              <span className="text-xs uppercase tracking-widest">{isEditing ? 'Save Changes' : 'Register'}</span>
            </button>
          </div>
            </form>
          </div>
        </div>
      )}

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Staff Member">
        <div className="space-y-8 text-center p-6">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-[32px] flex items-center justify-center mx-auto border-4 border-red-100 dark:border-red-900/30 shadow-inner group">
            <Trash2 className="w-12 h-12 transition-transform group-hover:rotate-12" />
          </div>
          <div className="space-y-3">
            <h4 className="text-2xl font-black text-gray-900 dark:text-white">Delete {deleteTarget?.name}?</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 px-8 leading-relaxed font-medium">Permanently remove this staff member from the system. This will immediately revoke all access.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest">Retain User</button>
            <button 
              onClick={() => deleteMutation.mutate(deleteTarget!.id)} 
              disabled={deleteMutation.isPending}
              className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl shadow-2xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {deleteMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Wipe Credentials
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
