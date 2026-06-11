import { LegalPageShellClient } from '@/components/legal/legal-page-shell-client';

type LegalPageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function LegalPageShell({ title, description, children }: LegalPageShellProps) {
  return (
    <LegalPageShellClient title={title} description={description}>
      {children}
    </LegalPageShellClient>
  );
}
