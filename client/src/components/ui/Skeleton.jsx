import React from 'react';

export default function Skeleton({ className = '', style }) {
  return (
    <div 
      className={`animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-md border-2 border-neutral-300 dark:border-neutral-700 ${className}`}
      style={style}
    />
  );
}
