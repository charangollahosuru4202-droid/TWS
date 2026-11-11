import React, { useState, useRef } from 'react';
import { Plus, Calendar, Flag, Tag, AlignLeft, ChevronDown, ChevronUp } from 'lucide-react';
import type { TodoInput, Priority } from '../types';

interface TaskFormProps {
  onAdd: (input: TodoInput) => Promise<boolean>;
}

const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Study', 'Health', 'Finance', 'General'];

export const TaskForm: React.FC<TaskFormProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('Personal');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationError('Please enter a task title');
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    const chosenCategory = isCustomCategory && customCategory.trim()
      ? customCategory.trim()
      : category;

    const success = await onAdd({
      title: cleanTitle,
      description: description.trim() || undefined,
      priority,
      category: chosenCategory,
      due_date: dueDate || undefined,
    });

    setIsSubmitting(false);

    if (success) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setIsExpanded(false);
      setIsCustomCategory(false);
      setCustomCategory('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setValidationError(null);
    }
  };

  const priorityColors: Record<Priority, string> = {
    low: 'text-slate-500 dark:text-slate-400',
    medium: 'text-amber-600 dark:text-amber-400',
    high: 'text-rose-600 dark:text-rose-400',
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs transition-all overflow-hidden focus-within:border-slate-400 dark:focus-within:border-slate-700"
    >
      {/* Primary Input Row */}
      <div className="p-3 sm:p-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label="Add task"
          className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 hover:bg-slate-800 dark:hover:bg-white transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationError) setValidationError(null);
            }}
            onFocus={() => setIsExpanded(true)}
            placeholder="Add a new task... (press Enter to save)"
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse options' : 'More task options'}
        >
          <span className="hidden sm:inline text-xs font-medium">Details</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {validationError && (
        <div className="px-4 pb-2 text-xs font-medium text-rose-500 dark:text-rose-400">
          {validationError}
        </div>
      )}

      {/* Expandable Options Drawer */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 space-y-3.5 animate-in fade-in duration-150">
          {/* Description input */}
          <div className="flex items-start gap-2.5">
            <AlignLeft className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes, links or acceptance criteria (optional)..."
              rows={2}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 resize-none"
            />
          </div>

          {/* Metadata selectors row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Priority Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityColors[priority]}`} />
              <label htmlFor="priority-select" className="text-slate-500 dark:text-slate-400 shrink-0">
                Priority:
              </label>
              <select
                id="priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="category-select" className="text-slate-500 dark:text-slate-400 shrink-0">
                Category:
              </label>
              {!isCustomCategory ? (
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom...</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Custom name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onBlur={() => {
                    if (!customCategory.trim()) setIsCustomCategory(false);
                  }}
                  autoFocus
                  className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden"
                />
              )}
            </div>

            {/* Due Date Picker */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="due-date-input" className="text-slate-500 dark:text-slate-400 shrink-0">
                Due:
              </label>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer text-xs"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">Esc</kbd> to collapse
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-all disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
