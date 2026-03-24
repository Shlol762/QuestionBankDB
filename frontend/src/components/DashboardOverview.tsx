import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import client from '../api/client';

interface DashboardStats {
  total_questions: number;
  total_subjects: number;
  total_topics: number;
  total_users?: number | null;
  difficulty_distribution: Record<string, number>;
  recent_activity: Array<{
    id: number;
    text: string;
    author: string;
    topic: string;
    created_at: string;
  }>;
  coverage_gaps: Array<{
    topic_id: number;
    topic_name: string;
    subject_name: string;
  }>;
  leaderboard: Array<{
    name: string;
    count: number;
  }>;
}

interface DashboardOverviewProps {
  isAdmin: boolean;
  isCoordinator: boolean;
  isHOD: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  isAdmin,
  isCoordinator,
  isHOD,
}) => {
  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await client.get('/stats/');
      return response.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="h-96 w-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-academy-600" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-900 dark:text-red-200">Failed to Load Dashboard</h3>
          <p className="text-sm text-red-700 dark:text-red-300">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  const getRoleLabel = () => {
    if (isAdmin) return 'System Administrator';
    if (isCoordinator) return 'Grade Coordinator';
    if (isHOD) return 'Department Head';
    return 'Teacher';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Header */}
      <div className="text-gray-900 dark:text-white">
        <h2 className="text-3xl font-black tracking-tight">Dashboard Overview</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Welcome, {getRoleLabel()}. Here's your at-a-glance summary.
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Questions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-blue-500" />
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {stats.total_questions}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Total Questions
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Published + Draft</p>
        </div>

        {/* Subjects Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-8 h-8 text-green-500" />
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {stats.total_subjects}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Subjects
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {isAdmin ? 'School-wide' : 'Accessible'}
          </p>
        </div>

        {/* Topics Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {stats.total_topics}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Topics
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Learning units</p>
        </div>

        {/* Users Card (Admin only) */}
        {stats.total_users && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-orange-500" />
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {stats.total_users}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Staff Members
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Active users</p>
          </div>
        )}
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="font-black text-gray-900 dark:text-white mb-4 uppercase text-[10px] tracking-widest">
            Question Complexity
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.difficulty_distribution).map(([difficulty, count]) => (
              <div key={difficulty} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {difficulty === 'Easy' && (
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  )}
                  {difficulty === 'Medium' && (
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                  )}
                  {difficulty === 'Hard' && (
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                  )}
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {difficulty}
                  </span>
                </div>
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(stats.difficulty_distribution).length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">No questions yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="font-black text-gray-900 dark:text-white mb-4 uppercase text-[10px] tracking-widest">
            Latest Activity
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <p className="text-xs text-gray-900 dark:text-gray-300 line-clamp-2 font-medium">
                    {activity.text}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase">
                      {activity.author} • {activity.topic}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Coverage Gaps (if any exist) */}
      {stats.coverage_gaps.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-black text-amber-900 dark:text-amber-200 mb-3 uppercase text-[10px] tracking-widest">
                Coverage Gaps Detected
              </h3>
              <div className="space-y-2">
                {stats.coverage_gaps.map((gap) => (
                  <div key={gap.topic_id} className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-bold">{gap.topic_name}</span>
                    <span className="text-amber-700 dark:text-amber-400"> in {gap.subject_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-black text-gray-900 dark:text-white mb-4 uppercase text-[10px] tracking-widest">
          Top Contributors
        </h3>
        <div className="space-y-2">
          {stats.leaderboard.length > 0 ? (
            stats.leaderboard.map((contributor, index) => (
              <div
                key={contributor.name}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-academy-400 to-academy-600 text-white rounded-full flex items-center justify-center font-black text-xs">
                    {index + 1}
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {contributor.name}
                  </span>
                </div>
                <span className="text-sm font-black text-academy-600 dark:text-academy-400">
                  {contributor.count}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">No contributors yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
