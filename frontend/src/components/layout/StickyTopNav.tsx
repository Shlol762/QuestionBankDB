import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <RouterNavLink 
    to={to}
    className={({ isActive }) => 
      `px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive 
          ? 'bg-neon-blue-500/20 text-neon-blue-400 font-semibold' 
          : 'text-gray-300 hover:text-white hover:bg-white/5'
      }`
    }
  >
    {children}
  </RouterNavLink>
);

export const StickyTopNav: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full glass-heavy border-b border-white/10">
      <div className="flex items-center h-16 px-6 mx-auto">
        
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue-500 to-neon-fuchsia-500 flex items-center justify-center neon-glow-blue">
            <span className="font-bold text-white text-sm">QB</span>
          </div>
          <span className="font-bold text-lg tracking-wide text-white">
            {import.meta.env.VITE_APP_NAME || 'QB Portal'}
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex items-center gap-2 flex-1">
          <NavLink to="/dashboard/overview">Overview</NavLink>
          <NavLink to="/dashboard/explorer">Explorer</NavLink>
          <NavLink to="/dashboard/platform">Platform</NavLink>
          <NavLink to="/dashboard/staff">Staff</NavLink>
        </nav>

        {/* Right Actions / Account */}
        <div className="flex items-center gap-4">
          <NavLink to="/dashboard/account">Account</NavLink>
          <button className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10">
            <span className="text-sm font-semibold text-white">A</span>
          </button>
        </div>
      </div>
    </header>
  );
};
