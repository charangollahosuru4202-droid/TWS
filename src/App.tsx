import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ListTodo,
  Layers,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTodos } from './hooks/useTodos';
import type { Todo, StatusFilter, SortOption, Priority, ToastMessage } from './types';
import { Header } from './components/Header';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { FilterBar } from './components/FilterBar';
import { ProgressBar } from './components/ProgressBar';
import { AuthForm } from './components/AuthForm';
import { ConfirmModal } from './components/ConfirmModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { Toast } from './components/Toast';

export default function App() {
  // Theme state (system / user saved preference)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taskflow_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply dark mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('taskflow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auth Hook
  const auth = useAuth();

  // Todos Hook
  const {
    todos,
    loading: todosLoading,
    addTodo,
    updateTodo,
    toggleComplete,
    deleteTodo,
    clearCompleted,
    reorderTodos,
    localTasksCount,
    isImporting,
    importLocalTasks,
    dismissLocalImport,
  } = useTodos(auth.user?.id, showToast);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Modals state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [isClearCompletedOpen, setIsClearCompletedOpen] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Available unique categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>(['Work', 'Personal', 'Study', 'Health', 'Finance']);
    todos.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [todos]);

  // Priority mapping for sorting
  const priorityWeight: Record<Priority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Filtered & Sorted Todos
  const filteredTodos = useMemo(() => {
    return todos
      .filter((todo) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = todo.title.toLowerCase().includes(q);
          const matchDesc = todo.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        // Status
        if (statusFilter === 'active' && todo.completed) return false;
        if (statusFilter === 'completed' && !todo.completed) return false;

        // Priority
        if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;

        // Category
        if (categoryFilter !== 'all' && todo.category !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'manual') {
          return a.sort_order - b.sort_order;
        }
        if (sortOption === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortOption === 'dueDate') {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }
        if (sortOption === 'priority') {
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return 0;
      });
  }, [todos, searchQuery, statusFilter, priorityFilter, categoryFilter, sortOption]);

  // Overall Task Completion stats
  const totalTasks = todos.length;
  const completedTasks = todos.filter((t) => t.completed).length;

  // Handle task completion toggle with celebratory confetti
  const handleToggle = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    const wasCompleted = target?.completed;
    const success = await toggleComplete(id);

    if (success && !wasCompleted) {
      // If completing this task makes all tasks completed
      if (completedTasks + 1 === totalTasks && totalTasks > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#F59E0B'],
        });
      }
    }
    return success;
  };

  // Drag and Drop handlers
  const handleDragStart = (_e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      // Reorder filtered todos locally and update parent todos
      const updatedList = [...filteredTodos];
      const [movedItem] = updatedList.splice(draggedIndex, 1);
      updatedList.splice(dragOverIndex, 0, movedItem);

      // Set sort option to manual so user sees custom order preserved
      setSortOption('manual');
      await reorderTodos(updatedList);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // If Auth is loading, show clean skeleton
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 animate-pulse">
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl mx-auto" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl mt-6" />
        </div>
      </div>
    );
  }

  // Protected Page: If not logged in, render AuthForm
  if (!auth.user) {
    return (
      <>
        <AuthForm
          auth={auth}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSupabaseConfig={() => setIsConfigOpen(true)}
        />
        <SupabaseConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          showToast={showToast}
        />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-slate-900 selection:text-white dark:selection:bg-slate-100 dark:selection:text-slate-900 flex flex-col transition-colors">
      {/* Top Header */}
      <Header
        user={auth.user}
        isDemoMode={auth.isDemoMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={() => auth.signOut()}
        onOpenSupabaseConfig={() => setIsConfigOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Supabase Notice Banner if in Local Preview Mode */}
        {auth.isDemoMode && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Local Workspace Mode</strong>: Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> to enable cloud PostgreSQL sync and Row Level Security.
              </span>
            </div>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-3 py-1.5 font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Connect Cloud Project
            </button>
          </div>
        )}

        {/* One-time local tasks import banner (Requirement 4) */}
        {localTasksCount > 0 && (
          <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Import existing tasks:</strong> You have {localTasksCount} task{localTasksCount > 1 ? 's' : ''} stored locally in this browser.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                onClick={dismissLocalImport}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer text-xs font-medium"
              >
                Dismiss
              </button>
              <button
                onClick={importLocalTasks}
                disabled={isImporting}
                className="px-3.5 py-1.5 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isImporting ? 'Importing...' : 'Import my existing tasks'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Add Task Input at Top */}
        <section aria-label="Add task">
          <TaskForm onAdd={addTodo} />
        </section>

        {/* Overall Completion Progress Bar */}
        {totalTasks > 0 && (
          <section aria-label="Progress">
            <ProgressBar
              total={totalTasks}
              completed={completedTasks}
              onClearCompleted={() => setIsClearCompletedOpen(true)}
            />
          </section>
        )}

        {/* Filter and Search Bar */}
        <section aria-label="Filter tasks">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            availableCategories={availableCategories}
            sortOption={sortOption}
            onSortChange={setSortOption}
            totalFilteredCount={filteredTodos.length}
          />
        </section>

        {/* Task List */}
        <section aria-label="Task list" className="space-y-2.5 pt-1">
          {todosLoading ? (
            /* Loading Skeletons */
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-slate-200/60 dark:bg-slate-800/50 animate-pulse border border-slate-200/50 dark:border-slate-800"
                />
              ))}
            </div>
          ) : filteredTodos.length > 0 ? (
            /* Populated Task Items */
            <div className="space-y-2.5">
              {filteredTodos.map((todo, idx) => (
                <TaskItem
                  key={todo.id}
                  todo={todo}
                  index={idx}
                  onToggle={handleToggle}
                  onDeleteRequest={(item) => setTodoToDelete(item)}
                  onUpdate={updateTodo}
                  isDraggable={sortOption === 'manual'}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === idx}
                />
              ))}
            </div>
          ) : (
            /* Friendly Empty State with SVG Illustration */
            <div className="text-center py-12 sm:py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' ? (
                  <Layers className="w-8 h-8 stroke-[1.5]" />
                ) : (
                  <ListTodo className="w-8 h-8 stroke-[1.5]" />
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No matching tasks found'
                  : 'No tasks yet. Add your first one!'}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search query, status filters, or category criteria.'
                  : 'Organize your workday, prioritize milestones, and track deadlines with real-time cloud sync.'}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(todoToDelete)}
        title="Delete task?"
        description={`Are you sure you want to delete "${todoToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        isDestructive={true}
        onConfirm={async () => {
          if (todoToDelete) {
            await deleteTodo(todoToDelete.id);
            setTodoToDelete(null);
          }
        }}
        onCancel={() => setTodoToDelete(null)}
      />

      {/* Clear Completed Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearCompletedOpen}
        title="Clear completed tasks?"
        description={`Remove all ${completedTasks} completed task${completedTasks > 1 ? 's' : ''} from your workspace?`}
        confirmLabel="Clear Completed"
        isDestructive={true}
        onConfirm={async () => {
          await clearCompleted();
          setIsClearCompletedOpen(false);
        }}
        onCancel={() => setIsClearCompletedOpen(false)}
      />

      {/* Supabase Cloud Setup & SQL Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        showToast={showToast}
      />

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
