import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Loader2, 
  ChevronRight, 
  AlertCircle, 
  User as UserIcon,
  CheckCircle2,
  Building2,
  Sparkles
} from 'lucide-react';
import client from '../api/client';

interface SetupProps {
  onComplete: () => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    department: 'IT Administration'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirm_password) {
      return setError("Security Passwords do not match.");
    }
    if (formData.password.length < 8) {
      return setError("Password must be at least 8 characters for robust security.");
    }

    setLoading(true);
    try {
      await client.post('/auth/initial-setup', {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        department: formData.department
      });
      
      setIsSuccess(true);
      // Brief delay for the success state animation before transitioning
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Setup logic failure. Verify server connectivity.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#fcfdfe] dark:bg-gray-950 px-4 transition-colors duration-500">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Setup Complete</h2>
            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Logic Core Activated</p>
          </div>
          <p className="text-sm text-gray-400 font-medium">Redirecting to primary login terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-academy-900 dark:bg-black px-4 py-12 transition-colors duration-300">
      <div className="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:row">
        <div className="flex flex-col lg:flex-row">
          
          {/* Branding & Welcome */}
          <div className="lg:w-5/12 bg-academy-700 dark:bg-academy-800 p-12 lg:p-16 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <ShieldCheck className="absolute -right-16 -bottom-16 w-96 h-96 rotate-12" />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-2xl rotate-3">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter leading-[0.9]">Question Bank</h1>
                <p className="text-academy-300 font-black uppercase text-xs tracking-[0.3em] mt-2">First-Run Deployment</p>
              </div>
              <p className="text-academy-100 text-lg font-medium leading-relaxed max-w-sm">
                Welcome to your new assessment ecosystem. Let's establish the primary authority account to begin configuring your curriculum.
              </p>
            </div>

            <div className="mt-auto relative z-10 pt-16 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 rounded-full bg-white/20 border-2 border-academy-700" />)}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-academy-200">System Ready</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="lg:w-7/12 p-8 lg:p-16 bg-white dark:bg-gray-900">
            <div className="max-w-md mx-auto w-full space-y-10">
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Root Configuration</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Administrator Credentialing</p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-start gap-4 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-bold">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="setup-full-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Identity</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                      <input
                        id="setup-full-name"
                        required
                        autoFocus
                        type="text"
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                        placeholder="Principal / IT Lead"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="setup-department" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                      <input
                        id="setup-department"
                        required
                        type="text"
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value})}
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                        placeholder="IT Services"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="setup-email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Email (Login ID)</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                    <input
                      id="setup-email"
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                      placeholder="admin@school.edu"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label htmlFor="setup-password" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                      <input
                        id="setup-password"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full pl-11 pr-16 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-500">{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="setup-confirm-password" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Security</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                      <input
                        id="setup-confirm-password"
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirm_password}
                        onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                        className="w-full pl-11 pr-16 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-academy-500/10 outline-none font-bold text-sm dark:text-white transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-500">{showConfirmPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                </div>

                <div className="pt-10">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-academy-700 hover:bg-academy-800 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-academy-700/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <span className="text-xs uppercase tracking-[0.2em]">Deploy Portal Architecture</span>
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
