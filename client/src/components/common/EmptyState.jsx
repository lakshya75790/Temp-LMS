import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no records available to display at this time.',
  action = null
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs my-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

