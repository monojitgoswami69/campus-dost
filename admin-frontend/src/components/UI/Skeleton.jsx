import React from 'react';
import { cn } from '../../utils/helpers';

export function Skeleton({ className, variant = 'default' }) {
  const variants = {
    default: 'h-4 w-full',
    circle: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full rounded-lg',
    text: 'h-4 w-3/4'
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200 rounded',
        variants[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div 
      className="bg-surface p-6 rounded-lg shadow-card space-y-4"
      role="status"
      aria-label="Loading card"
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="h-10 w-10" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-10 w-20" />
      <Skeleton variant="text" />
      <span className="sr-only">Loading card content...</span>
    </div>
  );
}
