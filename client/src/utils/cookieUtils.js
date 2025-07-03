export const cookieUtils = {
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