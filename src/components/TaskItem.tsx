import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Trash2,
  Edit3,
  Calendar,
  AlertCircle,
  Clock,
  GripVertical,
  X,
  Save,
  Tag,
  Flag,
} from 'lucide-react';
import type { Todo, TodoInput, Priority } from '../types';

interface TaskItemProps {
  todo: Todo;
  index: number;
  onToggle: (id: string) => Promise<boolean>;
  onDeleteRequest: (todo: Todo) => void;
  onUpdate: (id: string, updates: Partial<TodoInput>) => Promise<boolean>;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}

const CATEGORY_OPTIONS = ['Work', 'Personal', 'Study', 'Health', 'Finance', 'General'];

export const TaskItem: React.FC<TaskItemProps> = ({
  todo,
  index,
  onToggle,
  onDeleteRequest,
  onUpdate,
  isDraggable = true,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editCategory, setEditCategory] = useState(todo.category);
  const [editDueDate, setEditDueDate] = useState(todo.due_date || '');
  const [isSaving, setIsSaving] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) return;

    setIsSaving(true);
    const success = await onUpdate(todo.id, {
      title: cleanTitle,
      description: editDescription.trim() || undefined,
      priority: editPriority,
      category: editCategory,
      due_date: editDueDate || undefined,
    });
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority);
    setEditCategory(todo.category);
    setEditDueDate(todo.due_date || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Date analysis: Overdue, Due Today, Upcoming
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = Boolean(todo.due_date && todo.due_date < todayStr && !todo.completed);
  const isDueToday = Boolean(todo.due_date && todo.due_date === todayStr);

  const formatDueDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return dateStr;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Priority indicator colors
  const priorityIndicator = {
    high: {
      text: 'High',
      dot: 'bg-rose-500',
      labelColor: 'text-rose-600 dark:text-rose-400',
    },
    medium: {
      text: 'Medium',
      dot: 'bg-amber-500',
      labelColor: 'text-amber-600 dark:text-amber-400',
    },
    low: {
      text: 'Low',
      dot: 'bg-slate-400',
      labelColor: 'text-slate-500 dark:text-slate-400',
    },
  }[todo.priority];

  return (
    <div
      draggable={isDraggable && !isEditing}
      onDragStart={(e) => onDragStart?.(e, index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDragEnd={onDragEnd}
      className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 ${
        isDragOver
          ? 'border-slate-900 dark:border-slate-100 scale-[1.01] shadow-md'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
      } ${todo.completed ? 'opacity-70 bg-slate-50/60 dark:bg-slate-950/40' : ''}`}
    >
      {isEditing ? (
        /* Edit Mode Form */
        <form onSubmit={handleSaveEdit} onKeyDown={handleKeyDown} className="space-y-3">
          <div>
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>

          <div>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description or notes (optional)..."
              rows={2}
              className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* Priority */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Flag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel (Esc)
            </button>
            <button
              type="submit"
              disabled={isSaving || !editTitle.trim()}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        /* View Mode */
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          {isDraggable && (
            <div
              className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 dark:text-slate-700 dark:hover:text-slate-400 touch-none shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={todo.completed}
            onClick={() => onToggle(todo.id)}
            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
              todo.completed
                ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 shadow-2xs'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
          >
            {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Task Info Body */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-baseline gap-2">
              <span
                onClick={() => onToggle(todo.id)}
                className={`text-sm font-medium leading-snug cursor-pointer transition-colors ${
                  todo.completed
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {todo.title}
              </span>
            </div>

            {/* Optional Description */}
            {todo.description && (
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  todo.completed
                    ? 'text-slate-400/80 dark:text-slate-600 line-through'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {todo.description}
              </p>
            )}

            {/* Zero-Pill Unboxed Metadata Row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {/* Category */}
              <span>{todo.category}</span>

              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>

              {/* Priority Indicator */}
              <span className={`inline-flex items-center gap-1.5 ${priorityIndicator.labelColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityIndicator.dot}`} />
                {priorityIndicator.text} Priority
              </span>

              {/* Due Date Indicator */}
              {todo.due_date && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  {isOverdue ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-3 h-3" />
                      Overdue ({formatDueDate(todo.due_date)})
                    </span>
                  ) : isDueToday ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold">
                      <Clock className="w-3 h-3" />
                      Due Today
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Due {formatDueDate(todo.due_date)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons (Edit / Delete) */}
          <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Edit task (keyboard: Esc to cancel)"
              aria-label="Edit task"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteRequest(todo)}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              title="Delete task"
              aria-label="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
