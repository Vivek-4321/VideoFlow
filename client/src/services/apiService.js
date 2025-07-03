import useAppStore from '../store/useAppStore';

const API_URL = 'http://localhost:3000/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_URL;
  }

  async getAuthHeaders() {
    const authToken = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      'X-Auth-Mode': 'token', // Use token mode for auth.aethercure.site
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}${endpoint}`;
      
      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        // If unauthorized and we have a refresh token, try to refresh
        if (response.status === 401 && localStorage.getItem('refreshToken')) {
          const refreshed = await this.refreshAuthToken();
          if (refreshed) {
            // Retry the request with new token
            const newHeaders = await this.getAuthHeaders();
            const retryResponse = await fetch(url, {
              headers: newHeaders,
              ...options,
            });
            
            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
        }
        
        const error = new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Jobs API
  async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async getJobs() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('User not authenticated');
    }
    return this.request(`/jobs`);
  }

  async getJob(jobId) {
    return this.request(`/jobs/${jobId}`);
  }

  async deleteJob(jobId) {
    return this.request(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  async retryJob(jobId) {
    return this.request(`/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }

  // Stats API
  async getStats() {
    return this.request('/stats');
  }

  // User API
  async getUserProfile() {
    return this.request('/user/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // API Keys
  async getApiKeys() {
    return this.request('/api-keys');
  }

  async createApiKey(data) {
    return this.request('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteApiKey(keyId) {
    return this.request(`/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  async regenerateApiKey(keyId) {
    return this.request(`/api-keys/${keyId}/regenerate`, {
      method: 'POST',
    });
  }

  // Usage Statistics
  async getUsageStats(days = 30) {
    return this.request(`/usage/stats?days=${days}`);
  }

  // Auth helpers for auth.aethercure.site
  async loginWithGoogle() {
    // Open Google OAuth in popup with token mode
    const authUrl = 'https://auth.aethercure.site/api/auth/google/popup?mode=token';
    
    return new Promise((resolve, reject) => {
      const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
      
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('Authentication cancelled'));
        }
      }, 1000);

      // Listen for auth result from popup
      const messageHandler = (event) => {
        if (event.origin !== 'https://auth.aethercure.site') return;
        
        if (event.data.type === 'AUTH_SUCCESS_TOKEN') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageHandler);
          
          // Store tokens
          localStorage.setItem('authToken', event.data.accessToken);
          localStorage.setItem('refreshToken', event.data.refreshToken);
          
          resolve(event.data);
        } else if (event.data.type === 'AUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  async logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  async refreshAuthToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch('https://auth.aethercure.site/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'token'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      }
      
      // Refresh failed, clear tokens
      this.logout();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('https://auth.aethercure.site/api/auth/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-Auth-Mode': 'token',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return { authenticated: false };
    } catch (error) {
      console.error('Auth status check failed:', error);
      return { authenticated: false };
    }
  }
}

// Create and export apiService instance
const apiService = new ApiService();

// Add debugging to catch initialization issues
if (typeof window !== 'undefined') {
  window.apiService = apiService; // For debugging
}

export { apiService };
export default apiService;