import React, { useState } from 'react';
import { useMe, useUpdatePassword, useLogout } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { toast } from 'react-hot-toast';
import { 
  Mail, 
  Shield, 
  Lock, 
  LogOut, 
  Eye, 
  EyeOff, 
  KeyRound, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { data: me, isLoading: profileLoading } = useMe();
  const updatePasswordMutation = useUpdatePassword();
  const logout = useLogout();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic minimum password length depending on whether they are admin
  const isAdmin = me?.is_admin || false;
  const minLength = isAdmin ? 12 : 8;

  const passwordSchema = zod.object({
    currentPassword: zod.string().min(1, 'Current password is required'),
    newPassword: zod.string()
      .min(minLength, `Password must be at least ${minLength} characters for ${isAdmin ? 'Admin' : 'Faculty'} accounts`)
      .refine(
        (val) => /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val),
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: zod.string().min(1, 'Please confirm your new password')
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"]
  });

  type PasswordFormValues = zod.infer<typeof passwordSchema>;

  const { 
    register, 
    handleSubmit, 
    reset, 
    watch,
    formState: { errors, isSubmitting } 
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      await updatePasswordMutation.mutateAsync({
        current_password: values.currentPassword,
        new_password: values.newPassword
      });
      toast.success('Password updated successfully!');
      reset();
    } catch (err) {
      const axiosError = err as { response?: { data?: { detail?: unknown } } };
      const detail = axiosError?.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail.map(d => (typeof d === 'object' && d?.msg ? d.msg : JSON.stringify(d))).join(', '));
      } else {
        toast.error('Failed to update password. Please check your current password.');
      }
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold animate-pulse">Loading Profile Details...</p>
      </div>
    );
  }

  const getRoles = () => {
    const roles: string[] = [];
    if (me?.is_admin) roles.push('System Administrator');
    if (me?.hod_allowed_subject_ids?.length > 0) roles.push('Subject Head (HOD)');
    if (me?.grade_levels?.length > 0) roles.push('Grade Coordinator');
    if (me?.subjects?.length > 0) roles.push('Faculty Teacher');
    if (roles.length === 0) roles.push('Staff Member');
    return roles;
  };

  const newPasswordValue = watch('newPassword') || '';
  const lengthValid = newPasswordValue.length >= minLength;
  const complexityValid = /[A-Z]/.test(newPasswordValue) && /[a-z]/.test(newPasswordValue) && /[0-9]/.test(newPasswordValue);

  return (
    <div className="flex flex-col flex-1 space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Account Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your profile details and security settings.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Profile Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] overflow-hidden p-6 relative">
            <div className="absolute right-0 top-0 w-24 h-24 bg-neon-blue-500/5 rounded-full blur-2xl"></div>
            
            {/* User Avatar Initial */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue-500 to-neon-fuchsia-500 flex items-center justify-center text-3xl font-extrabold text-white mb-4 neon-glow-blue border border-white/10">
                {me?.full_name?.charAt(0)}
              </div>
              <h2 className="text-lg font-bold text-white">{me?.full_name}</h2>
              <p className="text-xs text-neon-blue-400 font-semibold mt-1">{me?.department}</p>
            </div>

            {/* Profile Info Details */}
            <div className="py-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email Address</p>
                  <p className="text-white truncate mt-0.5">{me?.email}</p>
                </div>
              </div>


              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Assigned Roles</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getRoles().map((role, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 text-[10px] font-medium"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-neon-red-400 hover:bg-neon-red-500/20 hover:border-neon-red-500/40 hover:text-red-300 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* Curriculum Permissions Panel */}
          {(me?.grade_levels?.length > 0 || me?.hod_subject_names?.length > 0 || me?.subjects?.length > 0) && (
            <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neon-fuchsia-400">Curriculum Scope</h3>
              
              {me?.grade_levels?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Grade Coordinator Levels</p>
                  <div className="flex flex-wrap gap-1">
                    {me.grade_levels.map((g: number) => (
                      <span key={g} className="px-2 py-0.5 rounded-md bg-neon-fuchsia-500/10 text-neon-fuchsia-300 text-[10px] font-semibold">
                        Grade {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {me?.hod_subject_names?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Department HOD Subjects</p>
                  <div className="flex flex-wrap gap-1">
                    {me.hod_subject_names.map((sub: string) => (
                      <span key={sub} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-semibold">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {me?.subjects?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Teaching Subjects (Faculty)</p>
                  <div className="flex flex-wrap gap-1">
                    {me.subjects.map((sub: { subject_id: number; subject_name: string }) => (
                      <span key={sub.subject_id} className="px-2 py-0.5 rounded-md bg-neon-blue-500/10 text-neon-blue-300 text-[10px] font-semibold">
                        {sub.subject_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Change Password Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <KeyRound className="w-5 h-5 text-neon-blue-400" />
              <h2 className="text-base font-bold text-white">Change Password</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="w-full glass-input px-4 py-2.5 text-sm pr-10"
                    {...register('currentPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-neon-red-400 font-medium">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="w-full glass-input px-4 py-2.5 text-sm pr-10"
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-neon-red-400 font-medium">{errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="w-full glass-input px-4 py-2.5 text-sm pr-10"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-neon-red-400 font-medium">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Password Requirement Helpers */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Password Requirements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    {lengthValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-neon-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    )}
                    <span className={lengthValid ? 'text-neon-emerald-400' : ''}>
                      At least {minLength} characters ({isAdmin ? 'Admin' : 'Faculty'} role rule)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    {complexityValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-neon-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    )}
                    <span className={complexityValid ? 'text-neon-emerald-400' : ''}>
                      Contains uppercase, lowercase, and number
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-neon-blue-500 hover:bg-neon-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 neon-glow-blue cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Update Security Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountPage;
