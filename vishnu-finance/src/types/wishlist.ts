
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
