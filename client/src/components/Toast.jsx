import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import useToastStore from '../store/useToastStore';
import '../styles/Toast.css';

const Toast = ({ toast }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const removeToast = useToastStore(state => state.removeToast);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="toast-icon" />;
      case 'error':
        return <XCircle className="toast-icon" />;
      case 'warning':
        return <AlertTriangle className="toast-icon" />;
      default:
        return <Info className="toast-icon" />;
    }
  };

  return (
    <div 
      className={`toast toast-${toast.type} ${isVisible ? 'toast-visible' : ''} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-content">
        {getIcon()}
        <div className="toast-message">
          {toast.title && <div className="toast-title">{toast.title}</div>}
          <div className="toast-description">{toast.message}</div>
        </div>
        <button 
          onClick={handleClose}
          className="toast-close"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
      {toast.duration > 0 && (
        <div 
          className="toast-progress"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
};

const ToastContainer = () => {
  const toasts = useToastStore(state => state.toasts);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;