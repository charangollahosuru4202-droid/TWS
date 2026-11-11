import React from 'react';
import {
  CheckSquare,
  Sun,
  Moon,
  LogOut,
  Database,
  User as UserIcon,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  isDemoMode: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => void;
  onOpenSupabaseConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isDemoMode,
  theme,
  onToggleTheme,
  onSignOut,
  onOpenSupabaseConfig,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center shadow-xs">
            <CheckSquare className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              TaskFlow
            </span>
            <span className="hidden sm:inline-block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              v1.0
            </span>
          </div>
        </div>

        {/* Zone 2: Supabase Connection Badge & Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSupabaseConfig}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              !isDemoMode
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50/80 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
            title="Manage Supabase connection"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {!isDemoMode ? 'Supabase Connected' : 'Local Workspace'}
            </span>
            <span className="md:hidden">
              {!isDemoMode ? 'Cloud' : 'Local'}
            </span>
          </button>
        </div>

        {/* Zone 3: Theme Toggle + User Menu / Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {user && (
            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="max-w-[140px] truncate font-medium">
                  {user.email}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
