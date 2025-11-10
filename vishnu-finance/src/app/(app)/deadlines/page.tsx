import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RedirectDeadlinesPage() {
  redirect('/plans?tab=deadlines');
}
