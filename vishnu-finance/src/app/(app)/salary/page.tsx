import { Metadata } from 'next';
import SalaryManagement from '@/features/salary/components/salary-management';

export const metadata: Metadata = {
  title: 'Salary Structure | Vishnu Finance',
  description: 'Manage your salary structure and history',
};

export default function SalaryPage() {
  return <SalaryManagement />;
}
