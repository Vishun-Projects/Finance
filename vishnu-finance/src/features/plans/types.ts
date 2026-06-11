export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  source: string;
  note?: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  category?: string | null;
  priority: GoalPriority;
  status?: GoalStatus;
  imageUrl?: string | null;
  userId: string;
  isActive?: boolean;
  contributions?: GoalContribution[];
  createdAt: string;
  updatedAt: string;
}

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

export type WishlistPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WishlistItem {
  id: string;
  title: string;
  description?: string | null;
  estimatedCost: number;
  priority: WishlistPriority;
  category?: string | null;
  targetDate?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  tags?: string[];
  isCompleted: boolean;
  completedDate?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface WishlistResponse {
  data: WishlistItem[];
  pagination?: WishlistPagination;
}
