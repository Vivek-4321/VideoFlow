import { useState, useEffect } from 'react';
import { Film, ArrowLeft, Mail, Lock, User, Eye, EyeOff, Github } from 'lucide-react';
import { AUTH_CONFIG } from '../config/auth.js';
import '../styles/Auth.css';

// Cookie utilities
const cookieUtils = {
  setCookie: (name, value, minutes = 15) => {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (minutes * 60 * 1000));
      
      const cookieString = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
      document.cookie = cookieString;
      
      console.log(`🍪 Cookie '${name}' set with ${minutes} minute expiration`);
      return true;
    } catch (error) {
      console.error(`Failed to set cookie '${name}':`, error);
      return false;
    }
  },
  
  getCookie: (name) => {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          const value = c.substring(nameEQ.length, c.length);
          return decodeURIComponent(value);
        }
      }
      return null;
    } catch (error) {
      console.error(`Failed to get cookie '${name}':`, error);
      return null;
    }
  },
  
  deleteCookie: (name) => {
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      console.log(`🗑️ Cookie '${name}' deleted`);
      return true;
    } catch (error) {
      console.error(`Failed to delete cookie '${name}':`, error);
      return false;
    }
  }
};

// Token storage using cookies
const tokenStorage = {
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

// Auth service
const authService = {
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

  login: async (email, password) => {
    try {
      console.log('🔑 Logging in using cookie-based token mode');
      
      const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/login`, 
        authService.getFetchOptions({
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      console.log('✅ Login successful in cookie-based token mode');
      
      if (data.accessToken && data.refreshToken) {
        const success = tokenStorage.setTokens(data.accessToken, data.refreshToken);
        if (!success) {
          throw new Error('Failed to store tokens in cookies');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (email, password, firstName, lastName) => {
    try {
      console.log('🔑 Registering using cookie-based token mode');
      
      const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/register`, 
        authService.getFetchOptions({
          method: 'POST',
          body: JSON.stringify({ email, password, firstName, lastName })
        })
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const data = await response.json();
      console.log('✅ Registration successful in cookie-based token mode');
      
      if (data.accessToken && data.refreshToken) {
        const success = tokenStorage.setTokens(data.accessToken, data.refreshToken);
        if (!success) {
          throw new Error('Failed to store tokens in cookies');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  initiateGitHubLogin: () => {
    console.log('🔗 Starting GitHub OAuth with direct callback (cookie mode)');
    const returnUrl = `${window.location.origin}/`;
    
    window.location.href = `${authService.AUTH_BASE_URL}/api/auth/github?returnUrl=${encodeURIComponent(returnUrl)}&mode=token`;
  },

  initiateGoogleLogin: () => {
    console.log('🔗 Starting Google OAuth with direct callback (cookie mode)');
    const returnUrl = `${window.location.origin}/`;
    
    window.location.href = `${authService.AUTH_BASE_URL}/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}&mode=token`;
  },

  requestPasswordReset: async (email) => {
    try {
      const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/request-password-reset`, 
        authService.getFetchOptions({
          method: 'POST',
          body: JSON.stringify({ email })
        })
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }
      
      return response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  getUserProfile: async () => {
    const response = await fetch(`${authService.AUTH_BASE_URL}/api/auth/profile`, 
      authService.getFetchOptions()
    );
    
    if (!response.ok) throw new Error('Failed to get user profile');
    return response.json();
  }
};

const Auth = ({ onBack, onLogin, theme, onThemeChange }) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [authError, setAuthError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    console.log('🔍 Checking for OAuth callback parameters');
    
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const error = urlParams.get('error');

    if (error) {
      console.error('Auth error:', error);
      setAuthError(`Authentication failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (accessToken && refreshToken) {
      console.log('✅ OAuth callback with tokens received');
      
      // Store tokens in cookies
      const success = tokenStorage.setTokens(accessToken, refreshToken);
      if (success) {
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Get user profile and call onLogin
        getUserProfileAfterOAuth();
      } else {
        setAuthError('Failed to store authentication tokens');
      }
    }
  }, []);

  const getUserProfileAfterOAuth = async () => {
    try {
      const userProfile = await authService.getUserProfile();
      const tokens = tokenStorage.getTokens();
      
      // Call onLogin with user data and tokens
      onLogin(userProfile.user, tokens);
    } catch (error) {
      console.error('Error getting user profile after OAuth:', error);
      setAuthError('Authentication successful but failed to get user profile');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    
    try {
      const data = await authService.login(loginForm.email, loginForm.password);
      
      // Handle successful login
      onLogin(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    
    if (registerForm.password.length < 8) {
      setAuthError('Password must be at least 8 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const data = await authService.register(
        registerForm.email,
        registerForm.password,
        registerForm.firstName,
        registerForm.lastName
      );
      
      // Handle successful registration
      onLogin(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = () => {
    authService.initiateGitHubLogin();
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setAuthError('');
    authService.initiateGoogleLogin();
  };

  const handleForgotPassword = async () => {
    const email = prompt('Enter your email address:');
    
    if (!email) return;
    
    try {
      setIsLoading(true);
      await authService.requestPasswordReset(email);
      alert('If the email exists, a password reset link has been sent');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">

      <section className="auth-container" aria-label="Authentication">
        {/* Header with back button, VideoFlow logo, and theme toggle */}
        <header className="auth-header-nav">
          <button className="back-button" onClick={onBack} aria-label="Back to Home">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
          
          {/* VideoFlow logo moved to header */}
          <div className="auth-logo-header">
            <div className="logo-icon">
              <Film size={28} />
            </div>
            <span className="logo-text">VideoFlow</span>
          </div>
        </header>

        <article className="auth-card">
          {/* Title */}
          <header className="auth-header">
            <h1 className="auth-title">
              {showRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="auth-subtitle">
              {showRegister 
                ? 'Start processing videos in seconds' 
                : 'Sign in to continue to VideoFlow'
              }
            </p>
          </header>
          
          {/* Error Message */}
          {authError && (
            <div className="auth-error animate-in" role="alert" aria-live="assertive">
              <span className="error-icon">⚠️</span>
              {authError}
            </div>
          )}

          {/* OAuth Buttons */}
          <section className="oauth-buttons" aria-label="Sign in with social accounts">
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="btn btn-secondary oauth-btn"
              aria-label="Sign in with Google"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google
            </button>

            {/* GitHub Sign In Button */}
            <button
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="btn btn-secondary oauth-btn"
              aria-label="Sign in with GitHub"
            >
              <Github size={18} />
              GitHub
            </button>
          </section>

          <div className="divider">
            <span>or</span>
          </div>
          
          {/* Forms */}
          {showRegister ? (
            <form onSubmit={handleRegister} className="auth-form" aria-label="Registration Form">
              {/* First and Last name on same line */}
              <div className="name-row">
                <div className="form-group">
                  <div className="input-container">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      required
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
                      placeholder="First name"
                      className="form-input"
                      aria-label="First Name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="input-container">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
                      placeholder="Last name"
                      className="form-input"
                      aria-label="Last Name"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <div className="input-container">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="Enter your email"
                    className="form-input"
                    aria-label="Email Address"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="input-container">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    placeholder="Create a password"
                    className="form-input"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <div className="input-container">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                    placeholder="Confirm your password"
                    className="form-input"
                    aria-label="Confirm Password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="auth-button primary"
                aria-label={isLoading ? 'Creating account' : 'Create Account'}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <User size={18} />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="auth-form" aria-label="Login Form">
              <div className="form-group">
                {/* <label className="form-label">Email address</label> */}
                <div className="input-container">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    placeholder="Enter your email"
                    className="form-input"
                    aria-label="Email Address"
                  />
                </div>
              </div>
              
              <div className="form-group">
                {/* <label className="form-label">Password</label> */}
                <div className="input-container">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="Enter your password"
                    className="form-input"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="form-options">
                <button 
                  type="button" 
                  className="forgot-password"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  aria-label="Forgot password?"
                >
                  Forgot password?
                </button>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="auth-button primary"
                aria-label={isLoading ? 'Signing in' : 'Sign In'}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeft size={18} className="arrow-icon-rotated" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}
          
          {/* Toggle */}
          <div className="auth-toggle">
            <span className="toggle-text">
              {showRegister ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              onClick={() => {
                setShowRegister(!showRegister);
                setAuthError('');
              }}
              className="toggle-button"
              disabled={isLoading}
              aria-label={showRegister ? 'Switch to Sign In' : 'Switch to Sign Up'}
            >
              {showRegister ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </article>
      </section>
    </main>
  );
};

export default Auth;