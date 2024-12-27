'use client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import DeskFormDialog from '../../DeskFormDialog';
import deskService from '@/services/deskService';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function EditDeskPage() {
    const router = useRouter();
    const params = useParams();
    const { branchId, deskId } = params;
    const [desk, setDesk] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDesk();
    }, []);

    const loadDesk = async () => {
        try {
            setLoading(true);
            const response = await deskService.getDesk(
                parseInt(branchId), 
                parseInt(deskId)
            );
            

            if (!response || !response.id) {
                throw new Error('Invalid desk data received');
            }

            // Transform the data to match the form structure
            const deskData = {
                ...response,
                serviceIds: response.deskServices?.map(ds => ds.service.id) || [],
                subServiceIds: response.deskSubServices?.map(dss => dss.subService.id) || []
            };

            setDesk(deskData);

        } catch (error) {
            console.error('Error loading desk:', error);
            toast.error(error.message || 'Failed to load desk details');
            router.push(`/admin/branches/${branchId}/desks`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (formData) => {
        try {
            setLoading(true);

            const response = await deskService.updateDesk(branchId, deskId, {
                name: formData.name,
                displayName: formData.displayName,
                description: formData.description,
                status: formData.status,
                managerId: formData.managerId ? formData.managerId : null,
                serviceIds: formData.serviceIds || [],
                subServiceIds: formData.subServiceIds || []
            });


            if (response.success || response.data?.id) {
                toast.success('Desk updated successfully');
                router.push(`/admin/branches/${branchId}/desks`);
            } else {
                throw new Error(response.error || 'Failed to update desk');
            }
        } catch (error) {
            console.error('Error updating desk:', {
                message: error.message,
                error: error
            });
            toast.error(error.message || 'Failed to update desk');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!desk) return null;

    return (
        <div className="flex-1 space-y-6">
            <DeskFormDialog
                open={true}
                onClose={() => router.push(`/admin/branches/${branchId}/desks`)}
                onSubmit={handleSubmit}
                initialData={desk}
                branchId={branchId}
            />
        </div>
    );
}