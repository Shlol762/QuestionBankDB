import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import client from '../api/client';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await client.post('/auth/login', formData);
      localStorage.setItem('token', response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-academy-900 px-4 py-12">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side: Branding / Info (Hidden on very small screens, side-by-side on desktop) */}
        <div className="md:w-5/12 bg-academy-700 p-12 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <GraduationCap className="absolute -right-8 -bottom-8 w-64 h-64 rotate-12" />
          </div>
          
          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">Question Bank Portal</h1>
            <p className="text-academy-100 text-lg leading-relaxed">
              The central command for academic excellence. Manage curriculum and assessments with precision.
            </p>
          </div>

          <div className="mt-auto relative z-10 pt-12">
            <div className="flex gap-2 mb-2">
              {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/30" />)}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-academy-200">
              Trusted by Leading Institutions
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Staff Sign In</h2>
            <p className="text-gray-500 mb-10 text-sm">Access your workspace using school credentials.</p>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r flex items-start gap-3 animate-in fade-in duration-300">
                <div className="mt-0.5"><AlertCircle className="w-4 h-4 text-red-500" /></div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-academy-500/10 focus:border-academy-500 focus:bg-white outline-none transition-all"
                    placeholder="name@school.edu"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Secure Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-academy-600 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-academy-500/10 focus:border-academy-500 focus:bg-white outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-academy-700 hover:bg-academy-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-academy-700/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <span>Sign Into Portal</span>
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
  );
};

export default Login;
