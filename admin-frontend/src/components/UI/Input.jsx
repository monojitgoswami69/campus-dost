import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/helpers';

export const Input = forwardRef(({ 
  label,
  error,
  helperText,
  fullWidth = true,
  className,
  id: providedId,
  ...props 
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-neutral-700 tracking-tight">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={cn(
          'px-3 py-2 border rounded-lg bg-white w-full',
          'text-neutral-900 placeholder-neutral-400 text-[14px]',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent',
          'disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500',
          'transition-colors',
          error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-neutral-200 focus:ring-primary-500',
          className
        )}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert" className="text-[13px] text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </span>
      )}
      {helperText && !error && (
        <span id={helperId} className="text-[13px] text-neutral-500">{helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
