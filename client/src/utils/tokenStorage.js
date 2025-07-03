import { cookieUtils } from './cookieUtils';
import { AUTH_CONFIG } from '../config/auth';

export const tokenStorage = {
  setTokens: (accessToken, refreshToken) => {
    try {
      const expirationMinutes = AUTH_CONFIG.TOKEN_STORAGE.EXPIRATION_MINUTES;
      
      const accessSuccess = cookieUtils.setCookie(
        AUTH_CONFIG.TOKEN_STORAGE.ACCESS_TOKEN_KEY, 
        accessToken, 
        expirationMinutes
      );
      
      const refreshSuccess = cookieUtils.setCookie(
        AUTH_CONFIG.TOKEN_STORAGE.REFRESH_TOKEN_KEY, 
        refreshToken, 
        expirationMinutes
      );
      
      if (accessSuccess && refreshSuccess) {
        console.log(`🔑 Tokens stored in cookies with ${expirationMinutes} minute expiration`);
        return true;
      } else {
        console.error('Failed to store one or both tokens in cookies');
        return false;
      }
    } catch (error) {
      console.error('Error storing tokens in cookies:', error);
      return false;
    }
  },
  
  getAccessToken: () => {
    try {
      const token = cookieUtils.getCookie(AUTH_CONFIG.TOKEN_STORAGE.ACCESS_TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting access token from cookies:', error);
      return null;
    }
  },
  
  getRefreshToken: () => {
    try {
      const token = cookieUtils.getCookie(AUTH_CONFIG.TOKEN_STORAGE.REFRESH_TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting refresh token from cookies:', error);
      return null;
    }
  },
  
  clearTokens: () => {
    try {
      const accessDeleted = cookieUtils.deleteCookie(AUTH_CONFIG.TOKEN_STORAGE.ACCESS_TOKEN_KEY);
      const refreshDeleted = cookieUtils.deleteCookie(AUTH_CONFIG.TOKEN_STORAGE.REFRESH_TOKEN_KEY);
      
      if (accessDeleted && refreshDeleted) {
        console.log('🗑️ Tokens cleared from cookies');
        return true;
      } else {
        console.error('Failed to clear one or both tokens from cookies');
        return false;
      }
    } catch (error) {
      console.error('Error clearing tokens from cookies:', error);
      return false;
    }
  },

  hasValidTokens: () => {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();
    return !!(accessToken && refreshToken);
  },

  getTokens: () => {
    return {
      accessToken: tokenStorage.getAccessToken(),
      refreshToken: tokenStorage.getRefreshToken()
    };
  }
};