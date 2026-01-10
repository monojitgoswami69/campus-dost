import React from 'react';
import { RefreshCw } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 w-full">
      <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
      <p className="text-neutral-500 font-semibold text-[13px] tracking-tight">{text}</p>
    </div>
  );
}
