import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || Math.random().toString(36).substring(7);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-black text-neutral-900 dark:text-white mb-2 tracking-wide uppercase">
          {label} {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            block w-full rounded-md border-2 py-2 text-neutral-900 dark:text-white shadow-brutal-sm dark:shadow-brutal-dark focus:outline-none transition-transform focus:-translate-y-[1px] focus:-translate-x-[1px]
            ${error ? 'border-danger-500 focus:shadow-brutal-hover' : 'border-neutral-900 dark:border-neutral-500 focus:border-primary-500 focus:shadow-brutal-hover dark:focus:shadow-brutal-dark-hover'}
            placeholder:text-neutral-400 sm:text-sm sm:leading-6 font-bold
            ${Icon ? 'pl-10' : 'pl-3'}
            ${props.disabled ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed border-dashed' : 'bg-white dark:bg-neutral-900'}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm font-bold text-danger-600 dark:text-danger-400 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
