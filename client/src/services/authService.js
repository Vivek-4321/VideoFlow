import { tokenStorage } from '../utils/tokenStorage';

export const authService = {
  AUTH_BASE_URL: import.meta.env.VITE_AUTH_URL,
  
  getAuthHeaders: () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Auth-Mode': 'token'
    };
    
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return headers;
  },
  
  getFetchOptions: (options = {}) => {
    return {
      headers: authService.getAuthHeaders(),
      ...options,
    };
  },

  checkAuthStatus: async () => {
    try {
      console.log('🔍 Checking auth status in cookie-based token mode');
      
      if (!tokenStorage.hasValidTokens()) {
        console.log('❌ No valid tokens found in cookies');
        return { authenticated: false, requiresRefresh: false };
      }
      
      const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/status`, 
        authService.getFetchOptions()
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔄 Tokens appear to be expired, refresh may be needed');
          return { authenticated: false, requiresRefresh: true };
        }
        throw new Error('Auth check failed');
      }
      
      const data = await response.json();
      console.log('✅ Auth status response:', data);
      
      return data;
    } catch (error) {
      console.error('Auth status check error:', error);
      tokenStorage.clearTokens();
      throw error;
    }
  },

  getUserProfile: async () => {
    const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/profile`, 
      authService.getFetchOptions()
    );
    
    if (!response.ok) throw new Error('Failed to get user profile');
    return response.json();
  },

  refreshTokens: async () => {
    try {
      console.log('🔄 Refreshing tokens in cookie-based token mode');
      
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available in cookies');
      }
      
      const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/refresh-token`, 
        authService.getFetchOptions({
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        })
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token refresh failed');
      }
      
      const data = await response.json();
      console.log('✅ Token refresh successful');
      
      if (data.accessToken && data.refreshToken) {
        const success = tokenStorage.setTokens(data.accessToken, data.refreshToken);
        if (!success) {
          throw new Error('Failed to store refreshed tokens in cookies');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      tokenStorage.clearTokens();
      throw error;
    }
  },

  logout: async () => {
    try {
      console.log('🚪 Logging out in cookie-based token mode');
      
      await fetch(`${authService.AUTH_BASE_URL}/api/auth/logout`, 
        authService.getFetchOptions({
          method: 'POST'
        })
      );
      
      const success = tokenStorage.clearTokens();
      if (success) {
        console.log('✅ Logout successful - cookies cleared');
      } else {
        console.warn('⚠️ Logout completed but had issues clearing cookies');
      }
    } catch (error) {
      console.error('Logout error:', error);
      tokenStorage.clearTokens();
    }
  }
};