import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Todo, TodoInput } from '../types';

interface UseTodosReturn {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (input: TodoInput) => Promise<boolean>;
  updateTodo: (id: string, updates: Partial<TodoInput>) => Promise<boolean>;
  toggleComplete: (id: string) => Promise<boolean>;
  toggleTodo: (id: string) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
  reorderTodos: (reorderedList: Todo[]) => Promise<boolean>;
  clearCompleted: () => Promise<boolean>;
  // Local storage import functionality
  localTasksCount: number;
  isImporting: boolean;
  importLocalTasks: () => Promise<boolean>;
  dismissLocalImport: () => void;
}

const getStorageKey = (userId: string) => `taskflow_todos_${userId}`;

interface StoredBatch {
  key: string;
  tasks: Array<{
    title?: string;
    description?: string;
    priority?: string;
    category?: string;
    due_date?: string;
    completed?: boolean;
    sort_order?: number;
  }>;
}

// Inspect localStorage for tasks created prior to login
function getDiscoveredLocalBatches(currentUserId: string): StoredBatch[] {
  if (typeof window === 'undefined') return [];
  const batches: StoredBatch[] = [];
  const candidateKeys = ['todos', 'tasks', 'taskflow_local_tasks', 'taskflow_todos_local'];

  // Check common generic keys
  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          batches.push({ key: k, tasks: parsed });
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check legacy user or demo keys (excluding the current logged-in user's key)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('taskflow_todos_') && k !== `taskflow_todos_${currentUserId}`) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            batches.push({ key: k, tasks: parsed });
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return batches;
}

export function useTodos(
  userId: string | undefined,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Local storage import state
  const [localBatches, setLocalBatches] = useState<StoredBatch[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [hasDismissedImport, setHasDismissedImport] = useState<boolean>(false);

  // Keep a reference to current todos for safe rollback in optimistic updates
  const todosRef = useRef<Todo[]>([]);
  todosRef.current = todos;

  // 1. Fetch Todos from Supabase or local storage
  const fetchTodos = useCallback(async () => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (isSupabaseConfigured) {
      try {
        const { data, error: fetchErr } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (fetchErr) {
          throw fetchErr;
        }

        setTodos((data as Todo[]) || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load tasks from Supabase.';
        setError(message);
        showToast('error', `Database error: ${message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Local storage fallback for local mode
      try {
        const key = getStorageKey(userId);
        const stored = localStorage.getItem(key);
        if (stored) {
          setTodos(JSON.parse(stored));
        } else {
          setTodos([]);
        }
      } catch {
        setError('Failed to access local storage.');
      } finally {
        setLoading(false);
      }
    }
  }, [userId, showToast]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Check for existing localStorage tasks whenever user logs in
  useEffect(() => {
    if (userId) {
      const batches = getDiscoveredLocalBatches(userId);
      setLocalBatches(batches);
    } else {
      setLocalBatches([]);
    }
  }, [userId]);

  const totalLocalTasksCount = hasDismissedImport
    ? 0
    : localBatches.reduce((sum, b) => sum + b.tasks.length, 0);

  // Synchronize local storage in offline/local mode
  const saveToLocal = (newTodos: Todo[]) => {
    if (!isSupabaseConfigured && userId) {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(newTodos));
    }
  };

  // 2. ADD TODO (Optimistic Update)
  const addTodo = useCallback(async (input: TodoInput): Promise<boolean> => {
    if (!userId) return false;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const minSort = todosRef.current.reduce((min, t) => Math.min(min, t.sort_order), 0);
    const newSortOrder = minSort - 1;

    const optimisticTodo: Todo = {
      id: tempId,
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority,
      category: input.category,
      due_date: input.due_date || null,
      completed: false,
      sort_order: newSortOrder,
      created_at: new Date().toISOString(),
    };

    const previousTodos = [...todosRef.current];
    const nextTodos = [optimisticTodo, ...previousTodos];
    setTodos(nextTodos);
    saveToLocal(nextTodos);

    if (isSupabaseConfigured) {
      try {
        const { data, error: insertError } = await supabase
          .from('todos')
          .insert([
            {
              user_id: userId,
              title: optimisticTodo.title,
              description: optimisticTodo.description,
              priority: optimisticTodo.priority,
              category: optimisticTodo.category,
              due_date: optimisticTodo.due_date,
              completed: false,
              sort_order: newSortOrder,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        // Replace temporary optimistic row with permanent Supabase row
        setTodos((prev) =>
          prev.map((t) => (t.id === tempId ? (data as Todo) : t))
        );
        showToast('success', 'Task added');
        return true;
      } catch (err: unknown) {
        // Rollback
        setTodos(previousTodos);
        const msg = err instanceof Error ? err.message : 'Failed to create task';
        showToast('error', `Rollback: ${msg}`);
        return false;
      }
    } else {
      showToast('success', 'Task created in local workspace');
      return true;
    }
  }, [userId, showToast]);

  // 3. TOGGLE COMPLETE (Optimistic Update)
  const toggleComplete = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    const previousTodos = [...todosRef.current];
    const target = previousTodos.find((t) => t.id === id);
    if (!target) return false;

    const newCompleted = !target.completed;
    const nextTodos = previousTodos.map((t) =>
      t.id === id ? { ...t, completed: newCompleted } : t
    );

    setTodos(nextTodos);
    saveToLocal(nextTodos);

    if (isSupabaseConfigured) {
      try {
        const { error: updateError } = await supabase
          .from('todos')
          .update({ completed: newCompleted })
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
        return true;
      } catch (err: unknown) {
        // Rollback
        setTodos(previousTodos);
        const msg = err instanceof Error ? err.message : 'Failed to update task';
        showToast('error', `Rollback: ${msg}`);
        return false;
      }
    }
    return true;
  }, [userId, showToast]);

  // 4. UPDATE TODO (Optimistic Update)
  const updateTodo = useCallback(async (id: string, updates: Partial<TodoInput>): Promise<boolean> => {
    if (!userId) return false;
    const previousTodos = [...todosRef.current];
    const target = previousTodos.find((t) => t.id === id);
    if (!target) return false;

    const updatedItem: Todo = {
      ...target,
      title: updates.title !== undefined ? updates.title.trim() : target.title,
      description: updates.description !== undefined ? (updates.description.trim() || null) : target.description,
      priority: updates.priority || target.priority,
      category: updates.category || target.category,
      due_date: updates.due_date !== undefined ? (updates.due_date || null) : target.due_date,
    };

    const nextTodos = previousTodos.map((t) => (t.id === id ? updatedItem : t));
    setTodos(nextTodos);
    saveToLocal(nextTodos);

    if (isSupabaseConfigured) {
      try {
        const { error: updateError } = await supabase
          .from('todos')
          .update({
            title: updatedItem.title,
            description: updatedItem.description,
            priority: updatedItem.priority,
            category: updatedItem.category,
            due_date: updatedItem.due_date,
          })
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
        showToast('success', 'Task updated');
        return true;
      } catch (err: unknown) {
        // Rollback
        setTodos(previousTodos);
        const msg = err instanceof Error ? err.message : 'Failed to update task';
        showToast('error', `Rollback: ${msg}`);
        return false;
      }
    } else {
      showToast('success', 'Task updated');
      return true;
    }
  }, [userId, showToast]);

  // 5. DELETE TODO (Optimistic Update)
  const deleteTodo = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    const previousTodos = [...todosRef.current];
    const nextTodos = previousTodos.filter((t) => t.id !== id);

    setTodos(nextTodos);
    saveToLocal(nextTodos);

    if (isSupabaseConfigured) {
      try {
        const { error: deleteError } = await supabase
          .from('todos')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        showToast('info', 'Task deleted');
        return true;
      } catch (err: unknown) {
        // Rollback
        setTodos(previousTodos);
        const msg = err instanceof Error ? err.message : 'Failed to delete task';
        showToast('error', `Rollback: ${msg}`);
        return false;
      }
    } else {
      showToast('info', 'Task deleted');
      return true;
    }
  }, [userId, showToast]);

  // 6. REORDER TODOS (Optimistic Update)
  const reorderTodos = useCallback(async (reorderedList: Todo[]): Promise<boolean> => {
    if (!userId) return false;
    const previousTodos = [...todosRef.current];

    const updatedWithOrder = reorderedList.map((t, idx) => ({
      ...t,
      sort_order: idx,
    }));

    setTodos(updatedWithOrder);
    saveToLocal(updatedWithOrder);

    if (isSupabaseConfigured) {
      try {
        // Upsert new sort orders
        const updates = updatedWithOrder.map((t) => ({
          id: t.id,
          user_id: userId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
          due_date: t.due_date,
          completed: t.completed,
          sort_order: t.sort_order,
        }));

        const { error: upsertError } = await supabase
          .from('todos')
          .upsert(updates, { onConflict: 'id' });

        if (upsertError) throw upsertError;
        return true;
      } catch (err: unknown) {
        // Rollback
        setTodos(previousTodos);
        const msg = err instanceof Error ? err.message : 'Failed to persist task reordering';
        showToast('error', `Rollback reorder: ${msg}`);
        return false;
      }
    }
    return true;
  }, [userId, showToast]);

  // 7. CLEAR COMPLETED (Optimistic Update)
  const clearCompleted = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const previousTodos = [...todosRef.current];
    const completedCount = previousTodos.filter((t) => t.completed).length;
    if (completedCount === 0) return true;

    const nextTodos = previousTodos.filter((t) => !t.completed);
    setTodos(nextTodos);
    saveToLocal(nextTodos);

    if (isSupabaseConfigured) {
      try {
        const { error: clearError } = await supabase
          .from('todos')
          .delete()
          .eq('user_id', userId)
          .eq('completed', true);

        if (clearError) throw clearError;
        showToast('info', `Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}`);
        return true;
      } catch (err: unknown) {
        // Rollback
        setTodos(previousTodos);
        const msg = err instanceof Error ? err.message : 'Failed to clear completed';
        showToast('error', `Rollback: ${msg}`);
        return false;
      }
    } else {
      showToast('info', `Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}`);
      return true;
    }
  }, [userId, showToast]);

  // 8. IMPORT EXISTING LOCAL TASKS TO SUPABASE (Requirement 4)
  const importLocalTasks = useCallback(async (): Promise<boolean> => {
    if (!userId || localBatches.length === 0) return false;
    setIsImporting(true);

    const flatTasksToImport: Array<{
      user_id: string;
      title: string;
      description: string | null;
      priority: string;
      category: string;
      due_date: string | null;
      completed: boolean;
      sort_order: number;
    }> = [];

    localBatches.forEach((batch) => {
      batch.tasks.forEach((item, idx) => {
        if (item.title && typeof item.title === 'string') {
          flatTasksToImport.push({
            user_id: userId,
            title: item.title,
            description: item.description || null,
            priority: ['low', 'medium', 'high'].includes(item.priority || '') ? item.priority! : 'medium',
            category: item.category || 'General',
            due_date: item.due_date || null,
            completed: Boolean(item.completed),
            sort_order: typeof item.sort_order === 'number' ? item.sort_order : idx,
          });
        }
      });
    });

    if (flatTasksToImport.length === 0) {
      setLocalBatches([]);
      setIsImporting(false);
      return true;
    }

    if (isSupabaseConfigured) {
      try {
        const { error: insertError } = await supabase
          .from('todos')
          .insert(flatTasksToImport);

        if (insertError) throw insertError;

        // Clear local storage copies
        localBatches.forEach((batch) => {
          localStorage.removeItem(batch.key);
        });

        setLocalBatches([]);
        setIsImporting(false);
        showToast('success', `Successfully imported ${flatTasksToImport.length} task${flatTasksToImport.length > 1 ? 's' : ''} to Supabase!`);
        await fetchTodos();
        return true;
      } catch (err: unknown) {
        setIsImporting(false);
        const msg = err instanceof Error ? err.message : 'Failed to import local tasks';
        showToast('error', `Import failed: ${msg}`);
        return false;
      }
    } else {
      // Local mode
      setLocalBatches([]);
      setIsImporting(false);
      showToast('info', 'Imported tasks into active workspace');
      return true;
    }
  }, [userId, localBatches, fetchTodos, showToast]);

  const dismissLocalImport = useCallback(() => {
    setHasDismissedImport(true);
  }, []);

  return {
    todos,
    loading,
    error,
    fetchTodos,
    addTodo,
    updateTodo,
    toggleComplete,
    toggleTodo: toggleComplete,
    deleteTodo,
    reorderTodos,
    clearCompleted,
    localTasksCount: totalLocalTasksCount,
    isImporting,
    importLocalTasks,
    dismissLocalImport,
  };
}
