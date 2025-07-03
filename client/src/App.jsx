import { useEffect } from 'react';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import ToastContainer from './components/Toast';
import useAppStore from './store/useAppStore';
import { useToast } from './store/useToastStore';
import useTheme from './hooks/useTheme';
import queryClient from './lib/queryClient';
import { QUERY_KEYS } from './hooks/useApi';
import './App.css';
import websocketService from './services/websocketService';
import { storage } from './config/firebase';
import { API_URL, WEBSOCKET_URL } from './config/api';
import { tokenStorage } from './utils/tokenStorage';
import { apiService } from './services/apiService';

const AppMain = () => {
  const {
    user,
    authLoading,
    showLanding,
    setUser,
    setAuthLoading,
    setShowLanding,
    logout: logoutStore
  } = useAppStore();
  
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // WebSocket connection management - connect when user is authenticated
  useEffect(() => {
    if (user && user.uid && !authLoading) {
      console.log('🔌 Setting up WebSocket connection for user:', user.uid);
      websocketService.connect(WEBSOCKET_URL, user.uid);
    } else if (!user && !authLoading) {
      console.log('🔌 Disconnecting WebSocket - no user');
      websocketService.disconnect();
    }
    
    // Cleanup only when component unmounts or user changes
    return () => {
      if (!user) {
        websocketService.disconnect();
      }
    };
  }, [user, authLoading]);

  // Set up WebSocket event listeners for job updates
  useEffect(() => {
    const handleJobCreated = (data) => {
      console.log('🔄 Invalidating jobs cache after job created:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATS] });
      toast.success('New transcoding job created!');
    };

    const handleJobStarted = (data) => {
      console.log('🔄 Invalidating jobs cache after job started:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOB, data.jobId] });
    };

    const handleJobProgress = (data) => {
      console.log('🔄 Updating job progress:', data);
      // Update specific job in cache without refetching all jobs
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOB, data.jobId] });
    };

    const handleJobCompleted = (data) => {
      console.log('🔄 Invalidating jobs cache after job completed:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOB, data.jobId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATS] });
      toast.success('Transcoding job completed!');
    };

    const handleJobFailed = (data) => {
      console.log('🔄 Invalidating jobs cache after job failed:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOB, data.jobId] });
      toast.error('Transcoding job failed');
    };

    const handleJobCancelled = (data) => {
      console.log('🔄 Invalidating jobs cache after job cancelled:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOB, data.jobId] });
      toast.info('Transcoding job cancelled');
    };

    // Set up event listeners
    websocketService.on('jobCreated', handleJobCreated);
    websocketService.on('jobStarted', handleJobStarted);
    websocketService.on('jobProgress', handleJobProgress);
    websocketService.on('jobCompleted', handleJobCompleted);
    websocketService.on('jobFailed', handleJobFailed);
    websocketService.on('jobCancelled', handleJobCancelled);

    // Cleanup function
    return () => {
      websocketService.off('jobCreated', handleJobCreated);
      websocketService.off('jobStarted', handleJobStarted);
      websocketService.off('jobProgress', handleJobProgress);
      websocketService.off('jobCompleted', handleJobCompleted);
      websocketService.off('jobFailed', handleJobFailed);
      websocketService.off('jobCancelled', handleJobCancelled);
    };
  }, [queryClient, toast]);


  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status in token mode');
      
      // Check for OAuth callback parameters (token mode)
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        setAuthLoading(false);
        return;
      }
      
      if (accessToken && refreshToken) {
        // OAuth callback successful in token mode
        console.log('✅ OAuth callback with tokens received');
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        window.history.replaceState({}, document.title, window.location.pathname);
        await loadUserData();
        setShowLanding(false);
        return;
      }
      
      // Check if we have stored tokens
      const storedAccessToken = localStorage.getItem('authToken');
      if (storedAccessToken) {
        console.log('🔑 Found stored access token');
        
        try {
          const authStatus = await apiService.checkAuthStatus();
          
          if (authStatus.authenticated && authStatus.user) {
            console.log('✅ User authenticated with stored token');
            setUser(createUserObject(authStatus.user));
            setShowLanding(false);
          } else {
            console.log('❌ Stored token invalid');
            
            if (authStatus.requiresRefresh) {
              try {
                console.log('🔄 Attempting automatic token refresh...');
                await apiService.refreshAuthToken();
                const retryAuthStatus = await apiService.checkAuthStatus();
                if (retryAuthStatus.authenticated) {
                  setUser(createUserObject(retryAuthStatus.user));
                  setShowLanding(false);
                  return;
                }
              } catch (refreshError) {
                console.log('❌ Token refresh failed:', refreshError);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
              }
            }
            
            setShowLanding(true);
          }
        } catch (error) {
          console.error('Auth status check failed:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          setShowLanding(true);
        }
      } else {
        console.log('❌ No stored tokens found');
        setShowLanding(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setShowLanding(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const authStatus = await apiService.checkAuthStatus();
      if (authStatus.authenticated && authStatus.user) {
        setUser(createUserObject(authStatus.user));
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setShowLanding(true);
      }
    }
  };

  const createUserObject = (userData) => {
    return {
      uid: userData.id,
      email: userData.email,
      displayName: `${userData.firstName} ${userData.lastName}`.trim(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      verified: userData.verified,
      roles: userData.roles,
      getIdToken: async () => {
        const accessToken = localStorage.getItem('authToken');
        if (!accessToken) {
          throw new Error('No access token available');
        }
        return accessToken;
      }
    };
  };

  const handleLogin = (userData, tokens) => {
    console.log('🔑 Handling login with userData:', userData, 'tokens:', tokens);
    
    // Check if tokens is provided and has the required properties
    if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
      console.error('❌ Invalid tokens provided to handleLogin:', tokens);
      // If tokens are missing, try to get them from localStorage (OAuth flow)
      const storedAccessToken = localStorage.getItem('authToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (storedAccessToken && storedRefreshToken) {
        console.log('✅ Using tokens from localStorage');
        tokens = { accessToken: storedAccessToken, refreshToken: storedRefreshToken };
      } else {
        console.error('❌ No valid tokens available');
        toast.error('Authentication failed. Please try again.');
        return;
      }
    }
    
    // Store tokens in localStorage
    localStorage.setItem('authToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
    // Set user state
    const userObj = createUserObject(userData);
    setUser(userObj);
    setShowLanding(false);
    toast.success(`Welcome back, ${userObj.displayName || userObj.email}!`);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    } finally {
      // Clear state - WebSocket will disconnect automatically via useEffect
      logoutStore();
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <main className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Initializing transcoder...</p>
      </main>
    );
  }

  // Show landing page if not authenticated
  if (!user && showLanding) {
    return (
      <LandingPage 
        onGetStarted={() => setShowLanding(false)}
        onSignIn={() => setShowLanding(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
    );
  }

  // Show auth if not authenticated and not on landing
  if (!user) {
    return (
      <Auth 
        onBack={() => setShowLanding(true)}
        onLogin={handleLogin}
        theme={theme}
        onThemeChange={setTheme}
      />
    );
  }

  // Main app
  return (
    <Dashboard 
      user={user}
      onLogout={handleLogout}
      API_URL={API_URL}
      storage={storage}
      websocketService={websocketService}
      theme={theme}
      onThemeChange={setTheme}
    />
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppMain />
      <ToastContainer />
    </QueryClientProvider>
  );
};

export default App;