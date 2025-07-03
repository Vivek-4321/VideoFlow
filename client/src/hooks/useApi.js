import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/apiService';
import { useToast } from '../store/useToastStore';

// Query keys
export const QUERY_KEYS = {
  JOBS: 'jobs',
  JOB: 'job',
  STATS: 'stats',
  USER_PROFILE: 'userProfile',
};

// Jobs hooks
export const useJobs = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.JOBS],
    queryFn: async () => {
      const response = await apiService.getJobs();
      return response.data.jobs || [];
    },
    refetchInterval: 30000, // Reduced polling since we have WebSocket updates
  });
};

export const useJob = (jobId) => {
  return useQuery({
    queryKey: [QUERY_KEYS.JOB, jobId],
    queryFn: async () => {
      const response = await apiService.getJob(jobId);
      return response.data || null;
    },
    enabled: !!jobId,
    refetchInterval: 10000, // Reduced polling since we have WebSocket updates
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: apiService.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.JOBS]);
      toast.success('Transcoding job created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create transcoding job');
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: apiService.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.JOBS]);
      toast.success('Job deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete job');
    },
  });
};

export const useRetryJob = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: apiService.retryJob,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.JOBS]);
      toast.success('Job retry initiated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to retry job');
    },
  });
};

// Stats hooks
export const useStats = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.STATS],
    queryFn: apiService.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// User hooks
export const useUserProfile = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_PROFILE],
    queryFn: apiService.getUserProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: apiService.updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.USER_PROFILE]);
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
};