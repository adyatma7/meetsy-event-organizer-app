import React from 'react';
import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary: [
    'bg-primary-500 dark:bg-primary-600 text-white border-2 border-neutral-900 dark:border-white',
    'shadow-brutal dark:shadow-brutal-dark',
    'hover:bg-primary-600 dark:hover:bg-primary-500 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-brutal hover:dark:shadow-brutal-dark',
    'active:translate-y-[4px] active:translate-x-[4px] active:shadow-none dark:active:shadow-none',
  ].join(' '),

  secondary: [
    'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-white',
    'shadow-brutal dark:shadow-brutal-dark',
    'hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-brutal hover:dark:shadow-brutal-dark',
    'active:translate-y-[4px] active:translate-x-[4px] active:shadow-none dark:active:shadow-none',
  ].join(' '),

  danger: [
    'bg-danger-500 text-white border-2 border-neutral-900 dark:border-white',
    'shadow-brutal dark:shadow-brutal-dark',
    'hover:bg-danger-600 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-brutal hover:dark:shadow-brutal-dark',
    'active:translate-y-[4px] active:translate-x-[4px] active:shadow-none dark:active:shadow-none',
  ].join(' '),

  ghost: [
    'bg-transparent text-neutral-900 dark:text-white border-2 border-transparent',
    'hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-900 dark:hover:border-white hover:shadow-brutal dark:hover:shadow-brutal-dark',
    'active:translate-y-[4px] active:translate-x-[4px] active:shadow-none dark:active:shadow-none active:bg-neutral-200 dark:active:bg-neutral-700',
  ].join(' '),
};

const sizeClasses = {
  sm:   'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md:   'px-4 py-2 text-sm rounded-md gap-2',
  lg:   'px-6 py-3 text-base rounded-lg gap-2',
  icon: 'p-2 rounded-md',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  icon: Icon,
  ...props
}) {
  const baseClasses = [
    'inline-flex items-center justify-center font-semibold cursor-pointer select-none',
    'transition-all duration-150 ease-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-sm disabled:pointer-events-none',
  ].join(' ');

  const vClass = variantClasses[variant] || variantClasses.primary;
  const sClass = sizeClasses[size] || sizeClasses.md;

  return (
    <button
      className={`${baseClasses} ${vClass} ${sClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isLoading && Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
