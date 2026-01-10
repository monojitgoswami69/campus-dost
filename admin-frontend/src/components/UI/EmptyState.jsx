import React from 'react';

export function EmptyState({ icon, title, description, action }) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="w-12 h-12 mb-4 text-neutral-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-bold text-neutral-900 mb-2 tracking-tight">{title}</h3>
      {description && (
        <p className="text-neutral-500 mb-6 max-w-sm text-[13px]">{description}</p>
      )}
      {action && <div className="flex gap-3">{action}</div>}
    </div>
  );
}
