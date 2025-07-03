import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
        // Note: Individual mutations will handle their own error messages
      },
    },
  },
});

export default queryClient;