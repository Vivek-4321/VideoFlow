export const AUTH_CONFIG = {
  MODE: 'token',
  TOKEN_STORAGE: {
    TYPE: 'cookie',
    ACCESS_TOKEN_KEY: import.meta.env.VITE_ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY: import.meta.env.VITE_REFRESH_TOKEN_KEY,
    EXPIRATION_MINUTES: parseInt(import.meta.env.VITE_TOKEN_EXPIRATION_MINUTES) || 15
  }
};