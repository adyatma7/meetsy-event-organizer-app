import React from 'react';

const variantClasses = {
  primary: 'bg-primary-500 text-white dark:bg-primary-600',
  success: 'bg-success-500 text-white dark:bg-emerald-600',
  warning: 'bg-warning-500 text-neutral-900 dark:bg-amber-500',
  danger: 'bg-danger-500 text-white dark:bg-rose-600',
  neutral: 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white',
};

export function Badge({ children, variant = 'neutral', className = '' }) {
  const vClass = variantClasses[variant] || variantClasses.neutral;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-black border-2 border-neutral-900 dark:border-neutral-900 rounded-md shadow-brutal-sm ${vClass} ${className}`}>
      {children}
    </span>
  );
}
