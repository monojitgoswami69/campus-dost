import React, { useState, useRef, useId, memo } from 'react';
import { cn } from '../../utils/helpers';
import { useClickOutside } from '../../hooks/useHooks';

export const Tooltip = memo(function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-white bg-neutral-900 rounded whitespace-nowrap pointer-events-none',
            'shadow-lg',
            positions[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
});

export function Select({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...',
  className,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();
  const labelId = useId();
  const listboxId = useId();

  useClickOutside(ref, () => setIsOpen(false));

  const selectedOption = options.find(opt => opt.value === value);

  const handleKeyDown = (e) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      {label && (
        <label 
          id={labelId}
          className="block text-sm font-semibold text-neutral-700 mb-2"
        >
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? labelId : undefined}
        className={cn(
          'w-full px-4 py-3 border border-neutral-200 rounded-xl',
          'bg-white text-neutral-900',
          'text-left flex items-center justify-between',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all',
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-primary-300'
        )}
      >
        <span className={cn(!selectedOption && 'text-neutral-500')}>
          {selectedOption?.label || placeholder}
        </span>
        <svg 
          className={cn('w-5 h-5 transition-transform text-neutral-500', isOpen && 'rotate-180')} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
          className="absolute z-10 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
            >
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-neutral-100 transition-colors text-neutral-900',
                  option.value === value && 'bg-primary-50 text-primary-600'
                )}
              >
                <div className="font-semibold">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-neutral-500 mt-1">{option.description}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const Toggle = memo(function Toggle({ label, checked, onChange, disabled = false }) {
  const toggleId = useId();
  
  return (
    <div className="flex items-center gap-3">
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          checked ? 'bg-gradient-to-r from-primary-500 to-accent-500' : 'bg-neutral-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span 
          className={cn(
            'absolute w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 top-0.5',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
          aria-hidden="true"
        />
      </button>
      {label && (
        <label 
          htmlFor={toggleId}
          className={cn(
            'text-sm font-semibold text-neutral-900',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
});

export const Slider = memo(function Slider({ label, value, onChange, min = 0, max = 100, step = 1, markers = [] }) {
  const percentage = ((value - min) / (max - min)) * 100;
  const sliderId = useId();
  
  return (
    <div className="space-y-3">
      {label && (
        <div className="flex justify-between items-center">
          <label 
            htmlFor={sliderId}
            className="text-sm font-semibold text-neutral-700"
          >
            {label}
          </label>
          <span 
            className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-lg"
            aria-live="polite"
          >
            {value}
          </span>
        </div>
      )}
      <div className="relative">
        <div className="absolute inset-0 h-2 bg-neutral-200 rounded-full" aria-hidden="true">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer slider z-10"
        />
      </div>
      {markers.length > 0 && (
        <div className="flex justify-between text-xs font-medium text-neutral-500 px-1" aria-hidden="true">
          {markers.map((marker, i) => (
            <span key={i}>{marker}</span>
          ))}
        </div>
      )}
    </div>
  );
});
