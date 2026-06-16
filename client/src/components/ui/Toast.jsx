import React, { useEffect } from 'react';
import useAppStore from '../../stores/useAppStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const toastConfig = {
  success: {
    icon: CheckCircle2,
    lightBg: 'bg-white',
    darkBg: 'dark:bg-neutral-900',
    accent: 'border-l-4 border-l-success-500',
    iconColor: 'text-success-600 dark:text-success-400',
    titleColor: 'text-neutral-900 dark:text-white',
    msgColor: 'text-neutral-600 dark:text-neutral-400',
    closeColor: 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
  },
  error: {
    icon: AlertCircle,
    lightBg: 'bg-white',
    darkBg: 'dark:bg-neutral-900',
    accent: 'border-l-4 border-l-danger-500',
    iconColor: 'text-danger-600 dark:text-danger-400',
    titleColor: 'text-neutral-900 dark:text-white',
    msgColor: 'text-neutral-600 dark:text-neutral-400',
    closeColor: 'text-neutral-400 dark:text-neutral-500 hover:text-danger-600 dark:hover:text-danger-400',
  },
  info: {
    icon: Info,
    lightBg: 'bg-white',
    darkBg: 'dark:bg-neutral-900',
    accent: 'border-l-4 border-l-primary-500',
    iconColor: 'text-primary-600 dark:text-primary-400',
    titleColor: 'text-neutral-900 dark:text-white',
    msgColor: 'text-neutral-600 dark:text-neutral-400',
    closeColor: 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
  },
  warning: {
    icon: AlertCircle,
    lightBg: 'bg-white',
    darkBg: 'dark:bg-neutral-900',
    accent: 'border-l-4 border-l-warning-500',
    iconColor: 'text-warning-600 dark:text-warning-400',
    titleColor: 'text-neutral-900 dark:text-white',
    msgColor: 'text-neutral-600 dark:text-neutral-400',
    closeColor: 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
  },
};

function Toast({ id, type = 'info', title, message, duration = 4000 }) {
  const removeToast = useAppStore((state) => state.removeToast);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, removeToast]);

  const config = toastConfig[type] || toastConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`
        flex w-80 pointer-events-auto
        ${config.lightBg} ${config.darkBg}
        ${config.accent}
        border-2 border-neutral-900 dark:border-neutral-700
        rounded-md shadow-brutal dark:shadow-brutal-dark
        animate-in slide-in-from-right-5 fade-in duration-200
        overflow-hidden
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 flex items-start pt-4 pl-4">
        <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="ml-3 flex-1 py-4 pr-3 min-w-0">
        {title && (
          <p className={`text-sm font-black uppercase tracking-wide ${config.titleColor}`}>
            {title}
          </p>
        )}
        {message && (
          <p className={`mt-0.5 text-sm font-bold ${config.msgColor}`}>
            {message}
          </p>
        )}
      </div>

      {/* Close */}
      <div className="flex-shrink-0 flex items-start pt-3 pr-3">
        <button
          type="button"
          className={`
            p-1 rounded-md border-2 border-transparent
            hover:border-neutral-900 dark:hover:border-neutral-600
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            active:translate-x-[1px] active:translate-y-[1px]
            transition-all duration-100 ${config.closeColor}
          `}
          onClick={() => removeToast(id)}
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-3 p-4 sm:p-6 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
}
