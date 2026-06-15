import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface DashboardStats {
  total_questions: number;
  total_subjects: number;
  total_topics: number;
  total_users: number | null;
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

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const res = await apiClient.get('/stats/');
      return res.data as DashboardStats;
    },
    staleTime: 60 * 1000, // 1 minute
  });
};
