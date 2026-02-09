import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

async function requireSuperuser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  if (!token) {
    redirect('/auth?tab=login');
  }
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive || user.role !== 'SUPERUSER') {
    redirect('/dashboard');
  }
  return user;
}

export default async function AdminOverviewPage() {
  await requireSuperuser();

  const [documentStats, mappingStats] = await Promise.all([
    prisma.document.aggregate({
      _count: { id: true },
    }),
    prisma.bankFieldMapping.aggregate({
      _count: { id: true },
    }),
  ]);

  const portalDocs = await prisma.document.count({
    where: { visibility: { not: 'PRIVATE' } },
  });

  const recentDocs = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      originalName: true,
      createdAt: true,
      visibility: true,
      sourceType: true,
    },
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card rounded-lg p-6 shadow-xl">
          <p className="text-sm text-muted-foreground">Total Documents</p>
          <p className="text-3xl font-semibold text-foreground mt-2">
            {documentStats._count.id}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Includes statements, portal resources, and uploads.
          </p>
        </div>
        <div className="glass-card rounded-lg p-6 shadow-xl">
          <p className="text-sm text-muted-foreground">Portal Resources</p>
          <p className="text-3xl font-semibold text-foreground mt-2">{portalDocs}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Documents visible across all users.
          </p>
        </div>

        <div className="glass-card rounded-lg p-6 shadow-xl">
          <p className="text-sm text-muted-foreground">Bank Field Mappings</p>
          <p className="text-3xl font-semibold text-foreground mt-2">
            {mappingStats._count.id}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Active parser configurations for supported banks.
          </p>
        </div>
      </section>

      <section className="glass-card rounded-lg shadow-xl">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Documents</h2>
          <p className="text-xs text-muted-foreground">
            Last five documents added to the platform.
          </p>
        </div>
        <div className="divide-y">
          {recentDocs.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              No documents have been uploaded yet.
            </div>
          ) : (
            recentDocs.map(doc => (
              <div key={doc.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleString()} • {doc.sourceType.replace('_', ' ')}
                  </p>
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {doc.visibility.toLowerCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

