export type Priority = 'low' | 'medium' | 'high';

export type TaskCategory = 'Personal' | 'Work' | 'Study' | 'Health' | 'Finance' | 'General' | string;

export type StatusFilter = 'all' | 'active' | 'completed';

export type SortOption = 'newest' | 'dueDate' | 'priority' | 'manual';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  category: string;
  due_date?: string | null;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface TodoInput {
  title: string;
  description?: string;
  priority: Priority;
  category: string;
  due_date?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
