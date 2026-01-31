import { Metadata } from 'next';
import SalaryStructureManagement from '@/components/management/salary-structure-management';

export const metadata: Metadata = {
    title: 'Salary Structure | Vishnu Finance',
    description: 'Manage your salary structure and history',
};

export default function SalaryPage() {
    return (
        <div className="h-full p-6 space-y-6 overflow-y-auto">
            <SalaryStructureManagement />
        </div>
    );
}
