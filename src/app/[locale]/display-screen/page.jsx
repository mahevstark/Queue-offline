// src/app/display-screens/page.jsx
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import branchService from '@/services/branchService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function DisplayScreensPage() {
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('displayScreen');
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchBranches();
        }
    }, [user]);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const response = await branchService.getAllBranches();
            
            if (response.success) {
                let branchesData = response.data;
                
                // Filter branches based on user role
                if (user?.role === 'MANAGER') {
                    const managerId = parseInt(user.id);
                    branchesData = branchesData.filter(branch => branch.managerId === managerId);
                } else if (user?.role === 'EMPLOYEE') {
                    // For employees, only show their assigned branch
                    branchesData = branchesData.filter(branch => branch.id === user.branchId);
                }

                setBranches(branchesData);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error(t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    };

    // If employee, redirect directly to their branch display screen
    useEffect(() => {
        if (user?.role === 'EMPLOYEE' && user?.branchId) {
            router.push(`/display-screen/${user.branchId}`);
        }
    }, [user]);

    if (loading) return <LoadingSpinner />;

    // If employee, don't show the branch selection page
    if (user?.role === 'EMPLOYEE') {
        return null; // The useEffect above will handle the redirect
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="mt-2 text-gray-600">{t('subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map((branch) => (
                    <div
                        key={branch.id}
                        onClick={() => router.push(`/display-screen/${branch.id}`)}
                        className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <ComputerDesktopIcon className="h-6 w-6 text-primaryGreen" />
                            <h2 className="text-xl font-semibold">{branch.name}</h2>
                        </div>
                        <p className="text-gray-600">{branch.city}</p>
                        <span className={`mt-2 inline-block px-3 py-1 rounded-full text-sm ${
                            branch.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {t(`branchCard.status.${branch.status}`)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}