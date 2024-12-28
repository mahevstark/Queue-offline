'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import branchService from '@/services/branchService';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BranchForm from '@/components/admin/branches/BranchForm';

export default function EditBranchPage() {
    const router = useRouter();
    const params = useParams();
    const [branch, setBranch] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBranch = async () => {
            if (!params.branchId) {
                toast.error('Invalid branch ID');
                router.push('/admin/branches');
                return;
            }

            try {
                setLoading(true);
                const data = await branchService.getBranch(params.branchId);
                if (!data) {
                    throw new Error('Branch not found');
                }
                setBranch(data);
            } catch (error) {
                console.error('Error loading branch:', error);
                toast.error(error.message || 'Failed to load branch');
                router.push('/admin/branches');
            } finally {
                setLoading(false);
            }
        };

        loadBranch();
    }, [params.branchId, router]);

    if (loading) return <LoadingSpinner />;
    if (!branch) return null;

    return (
        <div className="flex-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                
                <BranchForm 
                    branch={branch} 
                    mode="edit" 
                />
            </div>
        </div>
    );
}