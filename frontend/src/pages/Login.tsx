import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSetupStatus, useLogin } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: setupData, isLoading: setupLoading } = useSetupStatus();
  const { mutateAsync: login, isPending: isLoading } = useLogin();

  useEffect(() => {
    if (setupData?.setup_required) {
      navigate('/setup', { replace: true });
    }
  }, [setupData, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null);
    try {
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);

      await login(formData);
      navigate('/dashboard/explorer');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    }
  };

  if (setupLoading || setupData?.setup_required) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="w-8 h-8 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-surface-900">
      {/* Animated Vibrant Glassmorphism Background */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue-500/10 rounded-full blur-[140px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-fuchsia-500/10 rounded-full blur-[140px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] bg-neon-emerald-500/5 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(10,10,15,0.2),rgba(0,0,0,0.8))]" />
      </div>

      {/* Floating Login Card */}
      <div className="w-full max-w-md glass bg-surface-800/80 shadow-[0_0_50px_rgba(14,165,233,0.1)] border-white/10 p-8 flex flex-col relative z-10 transition-all duration-300">
        {/* Upper Glow Border Decoration */}
        <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-neon-fuchsia-400 to-transparent opacity-80" />
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue-500 to-neon-fuchsia-500 flex items-center justify-center neon-glow-blue mb-3">
            <LogIn className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1.5 font-sans">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
            Enter your credentials to access the Question Bank Portal.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-neon-red-500/10 border border-neon-red-500/30 text-neon-red-400 text-xs font-medium text-center animate-fade-in">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                {...register('email')}
                placeholder="teacher@school.edu"
                className={`w-full glass-input pl-10 pr-4 py-2.5 text-sm ${
                  errors.email ? 'border-neon-red-500/50 focus:border-neon-red-500' : ''
                }`}
              />
            </div>
            {errors.email && (
              <span className="text-[10px] text-neon-red-400 mt-1 block font-medium">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <a href="#" className="text-[10px] text-neon-blue-400 hover:text-neon-blue-300 font-semibold transition-colors">
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full glass-input pl-10 pr-10 py-2.5 text-sm ${
                  errors.password ? 'border-neon-red-500/50 focus:border-neon-red-500' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <span className="text-[10px] text-neon-red-400 mt-1 block font-medium">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-neon-blue-600 to-neon-fuchsia-600 hover:from-neon-blue-500 hover:to-neon-fuchsia-500 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-gray-400">
          First time here?{' '}
          <Link to="/setup" className="text-neon-blue-400 hover:text-neon-blue-300 font-semibold transition-colors">
            Configure server
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
