
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';

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
  userId: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}
