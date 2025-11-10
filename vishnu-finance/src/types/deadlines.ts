
export type DeadlineStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'SKIPPED';
export type DeadlineFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;

export interface Deadline {
  id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  dueDate: string;
  isRecurring: boolean;
  frequency: DeadlineFrequency;
  category?: string | null;
  paymentMethod?: string | null;
  accountDetails?: string | null;
  notes?: string | null;
  status?: DeadlineStatus;
  isCompleted: boolean;
  completedDate?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlinePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DeadlinesResponse {
  data: Deadline[];
  pagination?: DeadlinePagination;
}
