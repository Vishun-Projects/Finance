import { prisma } from '@/lib/db';
import type { DeadlinesResponse, Goal, WishlistResponse } from '@/features/plans/types';
const EMPTY_DEADLINES: DeadlinesResponse = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const EMPTY_WISHLIST: WishlistResponse = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

/** Serialize Prisma rows to plain JSON (dates → ISO strings) for RSC/client boundaries. */
function toJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadGoals(userId: string): Promise<Goal[]> {
  if (!userId) {
    return [];
  }

  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { contributions: { orderBy: { date: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return toJson(goals) as Goal[];
  } catch (error) {
    console.error('[goals] bootstrap fetch failed', { userId, error });
    throw error;
  }
}

export async function loadDeadlines(userId: string): Promise<DeadlinesResponse> {
  if (!userId) {
    return EMPTY_DEADLINES;
  }

  const page = 1;
  const pageSize = 100;

  try {
    const [totalCount, deadlines] = await Promise.all([
      prisma.deadline.count({ where: { userId } }),
      prisma.deadline.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
        take: pageSize,
      }),
    ]);

    return {
      data: toJson(deadlines) as DeadlinesResponse['data'],
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: pageSize < totalCount,
        hasPreviousPage: false,
      },
    };
  } catch (error) {
    console.error('[deadlines] bootstrap fetch failed', { userId, error });
    throw error;
  }
}

export async function loadWishlist(userId: string): Promise<WishlistResponse> {
  if (!userId) {
    return EMPTY_WISHLIST;
  }

  const page = 1;
  const pageSize = 100;

  try {
    const [totalCount, wishlistItems] = await Promise.all([
      prisma.wishlistItem.count({ where: { userId } }),
      prisma.wishlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
      }),
    ]);

    const data = wishlistItems.map((item: (typeof wishlistItems)[number]) => ({
      ...item,
      tags: item.tags ? (JSON.parse(item.tags) as string[]) : [],
    }));

    return {
      data: toJson(data) as WishlistResponse['data'],
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: pageSize < totalCount,
        hasPreviousPage: false,
      },
    };
  } catch (error) {
    console.error('[wishlist] bootstrap fetch failed', { userId, error });
    throw error;
  }
}
