import React, { memo } from 'react';
import { cn } from '../../utils/helpers';

export const Badge = memo(function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
    primary: 'bg-primary-50 text-primary-700'
  };

  return (
    <span 
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
});

export const StatusBadge = memo(function StatusBadge({ status }) {
  const configs = {
    embedded: { color: 'success', label: 'Embedded', dot: 'bg-green-500' },
    pending: { color: 'warning', label: 'Pending', dot: 'bg-yellow-500' },
    error: { color: 'danger', label: 'Error', dot: 'bg-red-500' }
  };

  const config = configs[status] || configs.embedded;

  return (
    <Badge variant={config.color} className="gap-1.5">
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} aria-hidden="true" />
      {config.label}
    </Badge>
  );
});
