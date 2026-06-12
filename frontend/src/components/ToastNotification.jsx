import React, { createContext, useContext, useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * Custom hook to trigger platform notifications.
 * @returns {{ showToast: (type: 'success'|'warning'|'danger'|'info', title: string, message: string) => void }}
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be consumed within a ToastProvider bounds');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Inject animation keyframes dynamically to ensure clean transition performance
  useEffect(() => {
    const styleId = 'toast-slide-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const showToast = (type, title, message) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Fixed Toast Portal Area */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const { type, title, message } = toast;

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Map types to exact locked color specs
  let borderClass = 'border-accent/15';
  let bgClass = 'bg-surface';
  let iconColor = 'text-accent';
  let IconComponent = Info;

  switch (type) {
    case 'success':
      bgClass = 'bg-success-bg';
      borderClass = 'border-success/35';
      iconColor = 'text-success';
      IconComponent = CheckCircle;
      break;
    case 'warning':
      bgClass = 'bg-warning-bg';
      borderClass = 'border-warning/35';
      iconColor = 'text-warning';
      IconComponent = AlertTriangle;
      break;
    case 'danger':
      bgClass = 'bg-danger-bg';
      borderClass = 'border-danger/35';
      iconColor = 'text-danger';
      IconComponent = ShieldAlert;
      break;
    case 'info':
      bgClass = 'bg-info-bg';
      borderClass = 'border-info/35';
      iconColor = 'text-info';
      IconComponent = Info;
      break;
    default:
      break;
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3.5 p-4 border rounded-xl shadow-lg animate-slide-in-right ${bgClass} ${borderClass} transition-all duration-300 w-full`}
    >
      <IconComponent className={`w-5 h-5 shrink-0 ${iconColor}`} />
      
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary">{title}</h4>
        <p className="text-[11px] text-muted leading-relaxed font-semibold">{message}</p>
      </div>

      <button 
        onClick={onClose} 
        className="text-muted hover:text-text-primary transition-colors shrink-0 p-0.5 rounded-lg hover:bg-black/5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
