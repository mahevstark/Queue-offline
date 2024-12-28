'use client';
import { useRouter } from 'next/navigation';
import BranchForm from '@/components/admin/branches/BranchForm';

export default function NewBranchPage() {
    const router = useRouter();

    return (
        <div className="flex-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
               
                <BranchForm mode="create" />
            </div>
        </div>
    );
}