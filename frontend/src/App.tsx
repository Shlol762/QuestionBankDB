import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, WifiOff } from 'lucide-react';
import { useAuthStore } from './store/authStore';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import client from './api/client';

/**
 * Main Application Component
 * 
 * Implements the Phase 2 Navigation Guard:
 * 1. Checks if the system requires initial setup (0 users in DB).
 * 2. Manages global Dark Mode state and persistence.
 * 3. Handles system-level loading and connectivity error states.
 */
function App() {
  const { fetchMe, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  
  // --- STATE: THEME ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // --- QUERY: SYSTEM STATUS ---
  /**
   * Fetches the setup status from the backend.
   * If setup_required is true, the user is forced to the /setup route.
   */
  const { 
    data: setupStatus, 
    isLoading: isStatusLoading, 
    isError: isStatusError,
    refetch: retryStatus
  } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const res = await client.get('/auth/setup-status');
      return res.data;
    },
    // Industry Practice: Don't cache setup status during initialization
    staleTime: 0, 
    retry: 2
  });

  // --- EFFECT: AUTH ---
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // --- EFFECT: DARK MODE SYNC ---
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- RENDER: SYSTEM LOADING ---
  if (isStatusLoading || isAuthLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors">
        <Loader2 className="w-12 h-12 animate-spin text-academy-600 mb-4" />
        <div className="text-center space-y-1">
          <p className="text-gray-900 dark:text-white font-black uppercase tracking-[0.2em] text-[10px]">Portal Core</p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold">Verifying System Configuration...</p>
        </div>
      </div>
    );
  }

  // --- RENDER: CRITICAL ERROR (Phase 4 Logic included for robustness) ---
  if (isStatusError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-600 mb-6 border border-red-100 dark:border-red-900/30">
          <WifiOff className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Connectivity Failure</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed font-medium mb-8">
          Unable to establish a secure handshake with the authentication server.
        </p>
        <button 
          onClick={() => retryStatus()}
          className="bg-academy-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-academy-700/20 active:scale-95 transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  const setupRequired = setupStatus?.setup_required;

  return (
    <Router>
      <Routes>
        {/* --- GUARD: SETUP FLOW --- */}
        {setupRequired ? (
          <>
            <Route path="/setup" element={<Setup onComplete={() => retryStatus()} />} />
            {/* Catch-all redirect to setup while system is unconfigured */}
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          /* --- FLOW: OPERATIONAL --- */
          <>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={isAuthenticated ? <Dashboard isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} /> : <Navigate to="/login" replace />} 
            />
            
            {/* Standard Navigation Redirects */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
            
            {/* Industry Practice: Prevent access to /setup if already configured */}
            <Route path="/setup" element={<Navigate to="/login" replace />} />
            
            {/* 404 handling - Redirect unknown routes back to login/dashboard */}
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
