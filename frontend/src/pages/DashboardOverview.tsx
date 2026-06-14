import React from 'react';
import { useDashboardStats } from '../hooks/useStats';
import { useMe } from '../hooks/useAuth';
import { 
  BookOpen, 
  AlertCircle, 
  Users, 
  Award, 
  TrendingUp, 
  Layers, 
  Shield 
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: me, isLoading: meLoading } = useMe();

  if (statsLoading || meLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-neon-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold animate-pulse">Assembling Dashboard Data...</p>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="p-4 rounded-full bg-neon-red-500/10 border border-neon-red-500/30 text-neon-red-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Failed to load overview analytics</h3>
        <p className="text-gray-400 text-sm max-w-md">
          There was an error communicating with the analytics API. Please try refreshing or check your connection.
        </p>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const difficultyColors: Record<string, { bar: string; text: string; bg: string }> = {
    easy: { bar: 'bg-neon-emerald-500', text: 'text-neon-emerald-400', bg: 'bg-neon-emerald-500/10' },
    medium: { bar: 'bg-neon-blue-500', text: 'text-neon-blue-400', bg: 'bg-neon-blue-500/10' },
    hard: { bar: 'bg-neon-red-500', text: 'text-neon-red-400', bg: 'bg-neon-red-500/10' }
  };

  const getRoles = () => {
    const roles: string[] = [];
    if (me?.is_admin) roles.push('System Admin');
    if (me?.hod_allowed_subject_ids?.length > 0) roles.push('Subject Head (HOD)');
    if (me?.grade_levels?.length > 0) roles.push('Grade Coordinator');
    if (me?.subjects?.length > 0) roles.push('Faculty Teacher');
    if (roles.length === 0) roles.push('Staff Member');
    return roles;
  };

  const distribution = stats.difficulty_distribution || {};
  const totalDifficulties = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex flex-col flex-1 space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative p-6 md:p-8 rounded-2xl overflow-hidden glass border border-white/5 bg-gradient-to-r from-neon-blue-500/10 via-neon-fuchsia-500/5 to-transparent">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-neon-blue-500/10 blur-3xl"></div>
        <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-neon-fuchsia-500/10 blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue-400 to-neon-fuchsia-400">{me?.full_name}</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Welcome back to your educational command center. Here is an overview of the curriculum coverage, contributions, and activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {getRoles().map((role, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1 rounded-md text-xs font-semibold bg-white/5 text-gray-300 flex items-center gap-1.5"
              >
                <Shield className="w-3 h-3 text-neon-blue-400" />
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Questions */}
        <div className="p-6 rounded-2xl glass border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 group hover:border-neon-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neon-blue-400">Total Questions</span>
            <div className="p-2.5 rounded-lg bg-neon-blue-500/10 text-neon-blue-400 group-hover:scale-110 transition-transform duration-300">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stats.total_questions}</div>
          <p className="text-xs text-gray-500 mt-2">Active bank items</p>
        </div>

        {/* Card 2: Subjects */}
        <div className="p-6 rounded-2xl glass border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 group hover:border-neon-fuchsia-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neon-fuchsia-400">Subjects</span>
            <div className="p-2.5 rounded-lg bg-neon-fuchsia-500/10 text-neon-fuchsia-400 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stats.total_subjects}</div>
          <p className="text-xs text-gray-500 mt-2">Curriculum offerings</p>
        </div>

        {/* Card 3: Topics */}
        <div className="p-6 rounded-2xl glass border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 group hover:border-neon-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neon-emerald-400">Topics</span>
            <div className="p-2.5 rounded-lg bg-neon-emerald-500/10 text-neon-emerald-400 group-hover:scale-110 transition-transform duration-300">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stats.total_topics}</div>
          <p className="text-xs text-gray-500 mt-2">Syllabus breakdown sub-units</p>
        </div>

        {/* Card 4: Staff Users (Or Fallback if Null) */}
        {stats.total_users !== null ? (
          <div className="p-6 rounded-2xl glass border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 group hover:border-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Staff Count</span>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{stats.total_users}</div>
            <p className="text-xs text-gray-500 mt-2">Coordinators, HODs, & Faculty</p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl glass border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 group hover:border-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Department</span>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="text-lg font-bold text-white truncate">{me?.department || 'Academic'}</div>
            <p className="text-xs text-gray-500 mt-3">Active staff department</p>
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side Column (2 Cols wide on large screen) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-neon-blue-400" />
                <h2 className="text-base font-bold text-white">Recent Activity</h2>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-neon-blue-500/10 text-neon-blue-400">
                Latest Published
              </span>
            </div>
            
            <div className="p-5">
              {!stats.recent_activity || stats.recent_activity.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No recent published questions found.
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {stats.recent_activity.map((item, itemIdx) => (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {itemIdx !== stats.recent_activity.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-white/5" aria-hidden="true"></span>
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-neon-blue-400">
                                {item.author.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-xs text-gray-400">
                                  <span className="font-semibold text-white">{item.author}</span> published a question in{' '}
                                  <span className="text-neon-fuchsia-400 font-medium">{item.topic}</span>
                                </p>
                                <p className="mt-1 text-xs text-gray-500 italic line-clamp-1">
                                  "{item.text.replace(/<[^>]*>/g, '')}"
                                </p>
                              </div>
                              <div className="text-right text-[10px] whitespace-nowrap text-gray-500">
                                {new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Coverage Gaps */}
          <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-neon-fuchsia-400" />
                <h2 className="text-base font-bold text-white">Curriculum Coverage Gaps</h2>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-neon-fuchsia-500/10 text-neon-fuchsia-400">
                Action Required
              </span>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-400 mb-2">
                The following topics have zero published questions in the repository. Navigate to the Explorer to create content for them.
              </p>
              {!stats.coverage_gaps || stats.coverage_gaps.length === 0 ? (
                <div className="text-center py-6 text-neon-emerald-400 bg-neon-emerald-500/5 border border-neon-emerald-500/10 rounded-xl text-xs font-semibold">
                  ✓ Excellent! All topics have at least one published question.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.coverage_gaps.map((gap) => (
                    <div 
                      key={gap.topic_id} 
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{gap.topic_name}</div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">{gap.subject_name}</div>
                      </div>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-red-500/10 text-neon-red-400 whitespace-nowrap">
                        0 Questions
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Column (1 Col wide on large screen) */}
        <div className="space-y-6">
          {/* Difficulty Distribution */}
          <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-neon-blue-400" />
                <h2 className="text-base font-bold text-white">Difficulty Split</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {['easy', 'medium', 'hard'].map((difficulty) => {
                const count = distribution[difficulty] || 0;
                const percentage = Math.round((count / totalDifficulties) * 100);
                const colorConfig = difficultyColors[difficulty] || difficultyColors.medium;
                
                return (
                  <div key={difficulty} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="capitalize text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${colorConfig.bar}`}></span>
                        {difficulty}
                      </span>
                      <span className="text-gray-400">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${colorConfig.bar}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="rounded-2xl glass border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-neon-fuchsia-400" />
                <h2 className="text-base font-bold text-white">Top Contributors</h2>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              {!stats.leaderboard || stats.leaderboard.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No active contributors yet.
                </div>
              ) : (
                stats.leaderboard.slice(0, 5).map((user, idx) => {
                  const placeColors = [
                    'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                    'text-gray-300 bg-gray-500/10 border-gray-500/20',
                    'text-amber-600 bg-amber-600/10 border-amber-600/20',
                  ];
                  const fallbackColor = 'text-gray-400 bg-white/5 border-white/10';
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black border ${idx < 3 ? placeColors[idx] : fallbackColor}`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{user.name}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neon-blue-500/10 text-neon-blue-400">
                        {user.count} items
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardOverview;
