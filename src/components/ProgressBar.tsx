import React from 'react';
import { Trash2, CheckCircle } from 'lucide-react';

interface ProgressBarProps {
  total: number;
  completed: number;
  onClearCompleted: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  total,
  completed,
  onClearCompleted,
}) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div className="flex items-center gap-2">
          {percentage === 100 && total > 0 ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100" />
          )}
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {completed} of {total} tasks completed
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            ({percentage}%)
          </span>
        </div>

        {completed > 0 && (
          <button
            onClick={onClearCompleted}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear completed</span>
          </button>
        )}
      </div>

      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            percentage === 100
              ? 'bg-emerald-500'
              : 'bg-slate-900 dark:bg-slate-100'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
