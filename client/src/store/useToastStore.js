import { create } from 'zustand';

const useToastStore = create((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 4000,
      ...toast
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
  
  clearAll: () => {
    set({ toasts: [] });
  }
}));

export const useToast = () => {
  const addToast = useToastStore(state => state.addToast);
  
  return {
    toast: {
      success: (message, options = {}) => addToast({ message, type: 'success', ...options }),
      error: (message, options = {}) => addToast({ message, type: 'error', duration: 6000, ...options }),
      warning: (message, options = {}) => addToast({ message, type: 'warning', ...options }),
      info: (message, options = {}) => addToast({ message, type: 'info', ...options })
    }
  };
};

export { useToastStore };
export default useToastStore;