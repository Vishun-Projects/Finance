'use client';

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}

