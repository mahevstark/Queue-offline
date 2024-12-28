'use client';
import { useRouter, useParams } from 'next/navigation';
import DeskFormDialog from '../DeskFormDialog';
import deskService from '@/services/deskService';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function NewDeskPage() {
    const router = useRouter();
    const params = useParams();
    const branchId = params.branchId;
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data) => {
        setLoading(true);
        try {
            await deskService.createDesk(branchId, data);
            toast.success('Desk created successfully');
            router.push(`/admin/branches/${branchId}/desks`);
        } catch (error) {
            toast.error('Failed to create desk');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-6">
            <div>
                <DeskFormDialog
                    open={true}
                    onClose={() => router.push(`/admin/branches/${branchId}/desks`)}
                    onSubmit={handleSubmit}
                    branchId={branchId}
                    loading={loading}
                />
            </div>
        </div>
    );
}