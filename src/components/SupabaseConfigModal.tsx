import React, { useState } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  supabaseUrl,
  SUPABASE_SETUP_SQL,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
} from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [url, setUrl] = useState(supabaseUrl || '');
  const [anonKey, setAnonKey] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    showToast('success', 'SQL Schema copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !anonKey) {
      showToast('error', 'Please provide both Supabase URL and Anon Key');
      return;
    }
    saveCustomSupabaseConfig(url, anonKey);
  };

  const handleReset = () => {
    clearCustomSupabaseConfig();
    showToast('info', 'Reset configuration to environment defaults');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Supabase Database & Auth Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect to your live Supabase cloud project with PostgreSQL & Row Level Security
            </p>
          </div>
        </div>

        {/* Current Status Banner */}
        <div className={`p-3.5 rounded-xl border mb-5 text-xs flex items-center justify-between ${
          isSupabaseConfigured
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300'
            : 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300'
        }`}>
          <div className="flex items-center gap-2">
            {isSupabaseConfigured ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>
              {isSupabaseConfigured
                ? `Connected to Supabase project (${supabaseUrl})`
                : 'Running in Local Workspace Preview Mode'}
            </span>
          </div>
          {isSupabaseConfigured && (
            <button
              onClick={handleReset}
              className="text-[11px] underline hover:opacity-80 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Quick Connection Form */}
        <form onSubmit={handleSave} className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Configure Live Credentials
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supabase Anon Key (public)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Connect Supabase
            </button>
          </div>
        </form>

        {/* Database SQL Schema Box */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Required Database Schema & RLS
            </div>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy SQL'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Paste this SQL script in your{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="underline text-slate-700 dark:text-slate-300 inline-flex items-center gap-0.5"
            >
              Supabase SQL Editor <ExternalLink className="w-2.5 h-2.5" />
            </a>{' '}
            to create the <code>todos</code> table with Row Level Security.
          </p>
          <pre className="text-[11px] font-mono p-3 rounded-xl bg-slate-950 text-slate-200 max-h-40 overflow-y-auto leading-relaxed border border-slate-800 select-all">
            {SUPABASE_SETUP_SQL}
          </pre>
        </div>
      </div>
    </div>
  );
};
