import { Metadata } from 'next';
import SalaryStructureManagement from '@/components/management/salary-structure-management';

export const metadata: Metadata = {
    title: 'Salary Structure | Vishnu Finance',
    description: 'Manage your salary structure and history',
};

export default function SalaryPage() {
    return (
        <div className="h-full pt-20 lg:pt-0">
            <div className="p-4 md:p-8">
                <SalaryStructureManagement />
            </div>
        </div>
    );
}
