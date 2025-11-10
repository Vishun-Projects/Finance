import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function IncomePage() {
  redirect('/transactions?type=INCOME');
}
