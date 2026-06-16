import React from 'react';
import Skeleton from './Skeleton';

export function Table({ columns, data, keyExtractor, onRowClick, isLoading, emptyMessage = 'No data available' }) {
  return (
    <div className="overflow-x-auto rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark bg-white dark:bg-neutral-800">
      <table className="min-w-full divide-y-2 divide-neutral-900 dark:divide-neutral-700">
        <thead className="bg-neutral-100 dark:bg-neutral-900">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4">
                    <Skeleton className="h-6 w-full max-w-[200px]" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-sm font-bold text-neutral-500 dark:text-neutral-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr 
                key={keyExtractor ? keyExtractor(row) : rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700' : ''}`}
              >
                {columns.map((col, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900 dark:text-neutral-100 ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
